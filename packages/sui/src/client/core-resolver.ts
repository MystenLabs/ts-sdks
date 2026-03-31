// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	normalizeSuiAddress,
	normalizeSuiObjectId,
	normalizeStructTag,
	SUI_TYPE_ARG,
} from '../utils/index.js';
import { createCoinReservationRef } from '../utils/coin-reservation.js';
import type { ClientWithCoreApi } from './core.js';
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

/** Compute a gas budget from gasUsed effects data. */
export function computeGasBudget(
	gasUsed: { computationCost: string; storageCost: string; storageRebate: string },
	gasPrice: bigint | string = 1n,
): string {
	const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(gasPrice);
	const baseComputationCostWithOverhead = BigInt(gasUsed.computationCost) + safeOverhead;
	const gasBudget =
		baseComputationCostWithOverhead + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);
	return String(
		gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead,
	);
}

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

	const needsGasPrice = !options.onlyTransactionKind && !transactionData.gasData.price;
	const needsPayment = !options.onlyTransactionKind && !transactionData.gasData.payment;
	const gasPayer = transactionData.gasData.owner ?? transactionData.sender;

	let usesGasCoin = false;
	let withdrawals = 0n;

	transactionData.mapArguments((arg) => {
		if (arg.$kind === 'GasCoin') usesGasCoin = true;
		return arg;
	});

	const normalizedGasPayer = gasPayer ? normalizeSuiAddress(gasPayer) : null;
	for (const input of transactionData.inputs) {
		if (input.$kind !== 'FundsWithdrawal' || !normalizedGasPayer) continue;
		if (normalizeStructTag(input.FundsWithdrawal.typeArg.Balance) !== SUI_TYPE_ARG) continue;

		const withdrawalOwner = input.FundsWithdrawal.withdrawFrom.Sender
			? transactionData.sender
			: gasPayer;
		if (
			withdrawalOwner &&
			normalizeSuiAddress(withdrawalOwner) === normalizedGasPayer &&
			input.FundsWithdrawal.reservation.$kind === 'MaxAmountU64'
		) {
			withdrawals += BigInt(input.FundsWithdrawal.reservation.MaxAmountU64);
		}
	}

	const needsSystemState = needsGasPrice || (needsPayment && usesGasCoin);
	const [, systemStateResult, balanceResult, coinsResult, chainIdResult] = await Promise.all([
		normalizeInputs(transactionData, client),
		needsSystemState ? client.core.getCurrentSystemState() : null,
		needsPayment && gasPayer ? client.core.getBalance({ owner: gasPayer }) : null,
		needsPayment && gasPayer
			? client.core.listCoins({ owner: gasPayer, coinType: SUI_TYPE_ARG })
			: null,
		needsPayment && usesGasCoin ? client.core.getChainIdentifier() : null,
	]);

	await resolveObjectReferences(transactionData, client);

	if (!options.onlyTransactionKind) {
		const systemState = systemStateResult?.systemState ?? null;

		if (systemState && !transactionData.gasData.price) {
			transactionData.gasData.price = systemState.referenceGasPrice;
		}

		await setGasBudget(transactionData, client);

		if (needsPayment) {
			if (!balanceResult || !coinsResult) {
				throw new Error(
					'Could not resolve gas payment: a gas owner or sender must be set to fetch balance and coins.',
				);
			}
			setGasPayment({
				transactionData,
				balance: balanceResult,
				coins: coinsResult,
				usesGasCoin,
				withdrawals,
				gasPayer: gasPayer!,
				chainIdentifier: chainIdResult?.chainIdentifier ?? null,
				epoch: systemState?.epoch ?? null,
			});
		}

		if (!transactionData.expiration && transactionData.gasData.payment?.length === 0) {
			await setExpiration(
				transactionData,
				client,
				systemState,
				chainIdResult?.chainIdentifier ?? null,
			);
		}
	}

	return await next();
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

	transactionData.gasData.budget = computeGasBudget(
		simulateResult.Transaction.effects!.gasUsed,
		transactionData.gasData.price ? String(transactionData.gasData.price) : undefined,
	);
}

function setGasPayment({
	transactionData,
	balance,
	coins,
	usesGasCoin,
	withdrawals,
	gasPayer,
	chainIdentifier,
	epoch,
}: {
	transactionData: TransactionDataBuilder;
	balance: SuiClientTypes.GetBalanceResponse;
	coins: SuiClientTypes.ListCoinsResponse;
	usesGasCoin: boolean;
	withdrawals: bigint;
	gasPayer: string;
	chainIdentifier: string | null;
	epoch: string | null;
}) {
	const budget = BigInt(transactionData.gasData.budget!);
	const addressBalance = BigInt(balance.balance.addressBalance);

	if (budget === 0n || (!usesGasCoin && addressBalance >= budget + withdrawals)) {
		transactionData.gasData.payment = [];
		return;
	}

	const filteredCoins = coins.objects.filter((coin) => {
		const matchingInput = transactionData.inputs.find((input) => {
			if (input.Object?.ImmOrOwnedObject) {
				return coin.objectId === input.Object.ImmOrOwnedObject.objectId;
			}

			return false;
		});

		return !matchingInput;
	});

	const paymentCoins = filteredCoins.map((coin) => ({
		objectId: coin.objectId,
		digest: coin.digest,
		version: coin.version,
	}));

	const reservationAmount = addressBalance - withdrawals;

	if (usesGasCoin && reservationAmount > 0n && chainIdentifier && epoch) {
		transactionData.gasData.payment = [
			createCoinReservationRef(reservationAmount, gasPayer, chainIdentifier, epoch),
			...paymentCoins,
		];
	} else if (!filteredCoins.length) {
		throw new Error('No valid gas coins found for the transaction.');
	} else {
		transactionData.gasData.payment = paymentCoins;
	}
}

interface SystemStateData {
	epoch: string;
	referenceGasPrice: string;
}

async function setExpiration(
	transactionData: TransactionDataBuilder,
	client: ClientWithCoreApi,
	systemState: SystemStateData | null,
	existingChainIdentifier: string | null = null,
) {
	const [chainIdentifier, resolvedSystemState] = await Promise.all([
		existingChainIdentifier ?? client.core.getChainIdentifier().then((r) => r.chainIdentifier),
		systemState ?? client.core.getCurrentSystemState().then((r) => r.systemState),
	]);
	const currentEpoch = BigInt(resolvedSystemState.epoch);

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
