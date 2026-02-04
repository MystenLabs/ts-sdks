// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parse } from 'valibot';

import { normalizeSuiAddress, normalizeSuiObjectId, SUI_TYPE_ARG } from '../utils/index.js';
import type { ClientWithCoreApi } from './core.js';
import { ObjectRefSchema } from '../transactions/data/internal.js';
import type { CallArg, Command } from '../transactions/data/internal.js';
import type { SuiClientTypes } from './types.js';
import { SimulationError } from './errors.js';
import { Inputs } from '../transactions/Inputs.js';
import { getPureBcsSchema, isTxContext } from '../transactions/serializer.js';
import type { TransactionDataBuilder } from '../transactions/TransactionData.js';
import { chunk } from '@mysten/utils';
import type { BuildTransactionOptions } from '../transactions/index.js';

// The maximum objects that can be fetched at once using multiGetObjects.
const MAX_OBJECTS_PER_FETCH = 50;

// An amount of gas (in gas units) that is added to transactions as an overhead to ensure transactions do not fail.
const GAS_SAFE_OVERHEAD = 1000n;
const MAX_GAS = 50_000_000_000;

function getClient(options: BuildTransactionOptions): ClientWithCoreApi {
	if (!options.client) {
		throw new Error(
			`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`,
		);
	}
	return options.client;
}

export async function coreClientResolveTransactionPlugin(
	transactionData: TransactionDataBuilder,
	options: BuildTransactionOptions,
	next: () => Promise<void>,
) {
	const client = getClient(options);

	await normalizeInputs(transactionData, client);
	await resolveObjectReferences(transactionData, client);

	if (!options.onlyTransactionKind) {
		await setGasData(transactionData, client);
	}

	return await next();
}

interface SystemStateData {
	epoch: string;
	referenceGasPrice: string;
}

async function setGasData(transactionData: TransactionDataBuilder, client: ClientWithCoreApi) {
	let systemState: SystemStateData | null = null;

	if (!transactionData.gasData.price) {
		const response = await client.core.getCurrentSystemState();
		systemState = response.systemState;
		transactionData.gasData.price = systemState.referenceGasPrice;
	}

	await setGasBudget(transactionData, client);
	await setGasPayment(transactionData, client);

	if (!transactionData.expiration) {
		await setExpiration(transactionData, client, systemState);
	}
}

async function setGasBudget(transactionData: TransactionDataBuilder, client: ClientWithCoreApi) {
	if (transactionData.gasData.budget) {
		return;
	}

	const simulateResult = await client.core.simulateTransaction({
		transaction: transactionData.build({
			overrides: {
				gasData: {
					budget: String(MAX_GAS),
					payment: [],
				},
			},
		}),
		include: { effects: true },
	});

	if (simulateResult.$kind === 'FailedTransaction') {
		const executionError = simulateResult.FailedTransaction.status.error ?? undefined;
		const errorMessage = executionError?.message ?? 'Unknown error';
		throw new SimulationError(`Transaction resolution failed: ${errorMessage}`, {
			cause: simulateResult,
			executionError,
		});
	}

	const gasUsed = simulateResult.Transaction.effects!.gasUsed;
	const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(transactionData.gasData.price || 1n);

	const baseComputationCostWithOverhead = BigInt(gasUsed.computationCost) + safeOverhead;

	const gasBudget =
		baseComputationCostWithOverhead + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);

	transactionData.gasData.budget = String(
		gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead,
	);
}

// The current default is just picking _all_ coins we can which may not be ideal.
async function setGasPayment(transactionData: TransactionDataBuilder, client: ClientWithCoreApi) {
	if (!transactionData.gasData.payment) {
		const gasPayer = transactionData.gasData.owner ?? transactionData.sender!;
		let usesGasCoin = false;
		let withdrawals = 0n;

		transactionData.mapArguments((arg) => {
			if (arg.$kind === 'GasCoin') {
				usesGasCoin = true;
			} else if (arg.$kind === 'Input') {
				const input = transactionData.inputs[arg.Input];

				if (input.$kind === 'FundsWithdrawal') {
					const withdrawalOwner = input.FundsWithdrawal.withdrawFrom.Sender
						? transactionData.sender
						: gasPayer;

					if (withdrawalOwner === gasPayer) {
						if (input.FundsWithdrawal.reservation.$kind === 'MaxAmountU64') {
							withdrawals += BigInt(input.FundsWithdrawal.reservation.MaxAmountU64);
						}
					}
				}
			}

			return arg;
		});

		const [suiBalance, coins] = await Promise.all([
			usesGasCoin || !transactionData.gasData.owner
				? null
				: client.core.getBalance({
						owner: transactionData.gasData.owner,
					}),
			client.core.listCoins({
				owner: transactionData.gasData.owner || transactionData.sender!,
				coinType: SUI_TYPE_ARG,
			}),
		]);

		if (
			suiBalance?.balance.addressBalance &&
			BigInt(suiBalance.balance.addressBalance) >=
				BigInt(transactionData.gasData.budget || '0') + withdrawals
		) {
			transactionData.gasData.payment = [];
			return;
		}

		const paymentCoins = coins.objects
			// Filter out coins that are also used as input:
			.filter((coin) => {
				const matchingInput = transactionData.inputs.find((input) => {
					if (input.Object?.ImmOrOwnedObject) {
						return coin.objectId === input.Object.ImmOrOwnedObject.objectId;
					}

					return false;
				});

				return !matchingInput;
			})
			.map((coin) =>
				parse(ObjectRefSchema, {
					objectId: coin.objectId,
					digest: coin.digest,
					version: coin.version,
				}),
			);

		if (!paymentCoins.length) {
			throw new Error('No valid gas coins found for the transaction.');
		}

		transactionData.gasData.payment = paymentCoins;
	}
}

async function setExpiration(
	transactionData: TransactionDataBuilder,
	client: ClientWithCoreApi,
	existingSystemState: SystemStateData | null,
) {
	const [systemState, { chainIdentifier }] = await Promise.all([
		existingSystemState ?? client.core.getCurrentSystemState().then((r) => r.systemState),
		client.core.getChainIdentifier(),
	]);
	const currentEpoch = BigInt(systemState.epoch);

	transactionData.expiration = {
		$kind: 'ValidDuring',
		ValidDuring: {
			minEpoch: String(currentEpoch),
			maxEpoch: String(currentEpoch + 1n),
			minTimestamp: null,
			maxTimestamp: null,
			chain: chainIdentifier,
			nonce: (Math.random() * 0x100000000) >>> 0,
		},
	};
}

async function resolveObjectReferences(
	transactionData: TransactionDataBuilder,
	client: ClientWithCoreApi,
) {
	// Keep track of the object references that will need to be resolved at the end of the transaction.
	// We keep the input by-reference to avoid needing to re-resolve it:
	const objectsToResolve = transactionData.inputs.filter((input) => {
		return (
			input.UnresolvedObject &&
			!(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion)
		);
	}) as Extract<CallArg, { UnresolvedObject: unknown }>[];

	const dedupedIds = [
		...new Set(
			objectsToResolve.map((input) => normalizeSuiObjectId(input.UnresolvedObject.objectId)),
		),
	];

	const objectChunks = dedupedIds.length ? chunk(dedupedIds, MAX_OBJECTS_PER_FETCH) : [];
	const resolved = (
		await Promise.all(
			objectChunks.map((chunkIds) =>
				client.core.getObjects({
					objectIds: chunkIds,
				}),
			),
		)
	).flatMap((result) => result.objects);

	const responsesById = new Map(
		dedupedIds.map((id, index) => {
			return [id, resolved[index]];
		}),
	);

	const invalidObjects = Array.from(responsesById)
		.filter(([_, obj]) => obj instanceof Error)
		.map(([_, obj]) => (obj as Error).message);

	if (invalidObjects.length) {
		throw new Error(`The following input objects are invalid: ${invalidObjects.join(', ')}`);
	}

	const objects = resolved.map((object) => {
		if (object instanceof Error) {
			throw new Error(`Failed to fetch object: ${object.message}`);
		}
		const owner = object.owner;
		const initialSharedVersion =
			owner && typeof owner === 'object'
				? owner.$kind === 'Shared'
					? owner.Shared.initialSharedVersion
					: owner.$kind === 'ConsensusAddressOwner'
						? owner.ConsensusAddressOwner.startVersion
						: null
				: null;

		return {
			objectId: object.objectId,
			digest: object.digest,
			version: object.version,
			initialSharedVersion,
		};
	});

	const objectsById = new Map(
		dedupedIds.map((id, index) => {
			return [id, objects[index]];
		}),
	);

	for (const [index, input] of transactionData.inputs.entries()) {
		if (!input.UnresolvedObject) {
			continue;
		}

		let updated: CallArg | undefined;
		const id = normalizeSuiAddress(input.UnresolvedObject.objectId);
		const object = objectsById.get(id);

		if (input.UnresolvedObject.initialSharedVersion ?? object?.initialSharedVersion) {
			updated = Inputs.SharedObjectRef({
				objectId: id,
				initialSharedVersion:
					input.UnresolvedObject.initialSharedVersion || object?.initialSharedVersion!,
				mutable: input.UnresolvedObject.mutable || isUsedAsMutable(transactionData, index),
			});
		} else if (isUsedAsReceiving(transactionData, index)) {
			updated = Inputs.ReceivingRef(
				{
					objectId: id,
					digest: input.UnresolvedObject.digest ?? object?.digest!,
					version: input.UnresolvedObject.version ?? object?.version!,
				}!,
			);
		}

		transactionData.inputs[transactionData.inputs.indexOf(input)] =
			updated ??
			Inputs.ObjectRef({
				objectId: id,
				digest: input.UnresolvedObject.digest ?? object?.digest!,
				version: input.UnresolvedObject.version ?? object?.version!,
			});
	}
}

async function normalizeInputs(transactionData: TransactionDataBuilder, client: ClientWithCoreApi) {
	const { inputs, commands } = transactionData;
	const moveCallsToResolve: Extract<Command, { MoveCall: unknown }>['MoveCall'][] = [];
	const moveFunctionsToResolve = new Set<string>();

	commands.forEach((command) => {
		// Special case move call:
		if (command.MoveCall) {
			// Determine if any of the arguments require encoding.
			// - If they don't, then this is good to go.
			// - If they do, then we need to fetch the normalized move module.

			// If we already know the argument types, we don't need to resolve them again
			if (command.MoveCall._argumentTypes) {
				return;
			}

			const inputs = command.MoveCall.arguments.map((arg) => {
				if (arg.$kind === 'Input') {
					return transactionData.inputs[arg.Input];
				}
				return null;
			});
			const needsResolution = inputs.some(
				(input) =>
					input?.UnresolvedPure ||
					(input?.UnresolvedObject && typeof input?.UnresolvedObject.mutable !== 'boolean'),
			);

			if (needsResolution) {
				const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
				moveFunctionsToResolve.add(functionName);
				moveCallsToResolve.push(command.MoveCall);
			}
		}
	});

	const moveFunctionParameters = new Map<string, SuiClientTypes.OpenSignature[]>();
	if (moveFunctionsToResolve.size > 0) {
		await Promise.all(
			[...moveFunctionsToResolve].map(async (functionName) => {
				const [packageId, moduleName, name] = functionName.split('::');
				const { function: def } = await client.core.getMoveFunction({
					packageId,
					moduleName,
					name,
				});

				moveFunctionParameters.set(functionName, def.parameters);
			}),
		);
	}

	if (moveCallsToResolve.length) {
		await Promise.all(
			moveCallsToResolve.map(async (moveCall) => {
				const parameters = moveFunctionParameters.get(
					`${moveCall.package}::${moveCall.module}::${moveCall.function}`,
				);

				if (!parameters) {
					return;
				}

				// Entry functions can have a mutable reference to an instance of the TxContext
				// struct defined in the TxContext module as the last parameter. The caller of
				// the function does not need to pass it in as an argument.
				const hasTxContext = parameters.length > 0 && isTxContext(parameters.at(-1)!);
				const params = hasTxContext ? parameters.slice(0, parameters.length - 1) : parameters;

				moveCall._argumentTypes = params;
			}),
		);
	}

	commands.forEach((command) => {
		if (!command.MoveCall) {
			return;
		}

		const moveCall = command.MoveCall;
		const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
		const params = moveCall._argumentTypes;

		if (!params) {
			return;
		}

		if (params.length !== command.MoveCall.arguments.length) {
			throw new Error(`Incorrect number of arguments for ${fnName}`);
		}

		params.forEach((param, i) => {
			const arg = moveCall.arguments[i];
			if (arg.$kind !== 'Input') return;
			const input = inputs[arg.Input];

			// Skip if the input is already resolved
			if (!input.UnresolvedPure && !input.UnresolvedObject) {
				return;
			}

			const inputValue = input.UnresolvedPure?.value ?? input.UnresolvedObject?.objectId!;

			const schema = getPureBcsSchema(param.body);
			if (schema) {
				arg.type = 'pure';
				inputs[inputs.indexOf(input)] = Inputs.Pure(schema.serialize(inputValue));
				return;
			}

			if (typeof inputValue !== 'string') {
				throw new Error(
					`Expect the argument to be an object id string, got ${JSON.stringify(
						inputValue,
						null,
						2,
					)}`,
				);
			}

			arg.type = 'object';
			const unresolvedObject: typeof input = input.UnresolvedPure
				? {
						$kind: 'UnresolvedObject',
						UnresolvedObject: {
							objectId: inputValue,
						},
					}
				: input;

			inputs[arg.Input] = unresolvedObject;
		});
	});
}

function isUsedAsMutable(transactionData: TransactionDataBuilder, index: number) {
	let usedAsMutable = false;

	transactionData.getInputUses(index, (arg, tx) => {
		if (tx.MoveCall && tx.MoveCall._argumentTypes) {
			const argIndex = tx.MoveCall.arguments.indexOf(arg);
			usedAsMutable =
				tx.MoveCall._argumentTypes[argIndex].reference !== 'immutable' || usedAsMutable;
		}

		if (
			tx.$kind === 'MakeMoveVec' ||
			tx.$kind === 'MergeCoins' ||
			tx.$kind === 'SplitCoins' ||
			tx.$kind === 'TransferObjects'
		) {
			usedAsMutable = true;
		}
	});

	return usedAsMutable;
}

function isUsedAsReceiving(transactionData: TransactionDataBuilder, index: number) {
	let usedAsReceiving = false;

	transactionData.getInputUses(index, (arg, tx) => {
		if (tx.MoveCall && tx.MoveCall._argumentTypes) {
			const argIndex = tx.MoveCall.arguments.indexOf(arg);
			usedAsReceiving = isReceivingType(tx.MoveCall._argumentTypes[argIndex]) || usedAsReceiving;
		}
	});

	return usedAsReceiving;
}

const RECEIVING_TYPE =
	'0x0000000000000000000000000000000000000000000000000000000000000002::transfer::Receiving';

function isReceivingType(type: SuiClientTypes.OpenSignature): boolean {
	if (type.body.$kind !== 'datatype') {
		return false;
	}

	return type.body.datatype.typeName === RECEIVING_TYPE;
}
