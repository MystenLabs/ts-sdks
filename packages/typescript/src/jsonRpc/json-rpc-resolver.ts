// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parse } from 'valibot';

import { normalizeSuiAddress, normalizeSuiObjectId, SUI_TYPE_ARG } from '../utils/index.js';
import { ObjectRefSchema } from '../transactions/data/internal.js';
import type { CallArg, Command, OpenMoveTypeSignature } from '../transactions/data/internal.js';
import { Inputs } from '../transactions/Inputs.js';
import {
	getPureBcsSchema,
	isTxContext,
	normalizedTypeToMoveTypeSignature,
} from '../transactions/serializer.js';
import type { TransactionDataBuilder } from '../transactions/TransactionData.js';
import { chunk } from '@mysten/utils';
import type { BuildTransactionOptions } from '../transactions/index.js';
import type { SuiJsonRpcClient } from './client.js';

// The maximum objects that can be fetched at once using multiGetObjects.
const MAX_OBJECTS_PER_FETCH = 50;

// An amount of gas (in gas units) that is added to transactions as an overhead to ensure transactions do not fail.
const GAS_SAFE_OVERHEAD = 1000n;
const MAX_GAS = 50_000_000_000;

export function jsonRpcClientResolveTransactionPlugin(client: SuiJsonRpcClient) {
	return async function resolveTransactionData(
		transactionData: TransactionDataBuilder,
		options: BuildTransactionOptions,
		next: () => Promise<void>,
	) {
		await normalizeInputs(transactionData, client);
		await resolveObjectReferences(transactionData, client);

		if (!options.onlyTransactionKind) {
			await setGasPrice(transactionData, client);
			await setGasBudget(transactionData, client);
			await setGasPayment(transactionData, client);
		}

		return await next();
	};
}

async function setGasPrice(transactionData: TransactionDataBuilder, client: SuiJsonRpcClient) {
	if (!transactionData.gasConfig.price) {
		transactionData.gasConfig.price = String(await client.getReferenceGasPrice());
	}
}

async function setGasBudget(transactionData: TransactionDataBuilder, client: SuiJsonRpcClient) {
	if (transactionData.gasConfig.budget) {
		return;
	}

	const dryRunResult = await client.dryRunTransactionBlock({
		transactionBlock: transactionData.build({
			overrides: {
				gasData: {
					budget: String(MAX_GAS),
					payment: [],
				},
			},
		}),
	});

	if (dryRunResult.effects.status.status !== 'success') {
		throw new Error(
			`Dry run failed, could not automatically determine a budget: ${dryRunResult.effects.status.error}`,
			{ cause: dryRunResult },
		);
	}

	const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(transactionData.gasConfig.price || 1n);

	const baseComputationCostWithOverhead =
		BigInt(dryRunResult.effects.gasUsed.computationCost) + safeOverhead;

	const gasBudget =
		baseComputationCostWithOverhead +
		BigInt(dryRunResult.effects.gasUsed.storageCost) -
		BigInt(dryRunResult.effects.gasUsed.storageRebate);

	transactionData.gasConfig.budget = String(
		gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead,
	);
}

// The current default is just picking _all_ coins we can which may not be ideal.
async function setGasPayment(transactionData: TransactionDataBuilder, client: SuiJsonRpcClient) {
	if (!transactionData.gasConfig.payment) {
		const coins = await client.getCoins({
			owner: transactionData.gasConfig.owner || transactionData.sender!,
			coinType: SUI_TYPE_ARG,
		});

		const paymentCoins = coins.data
			// Filter out coins that are also used as input:
			.filter((coin) => {
				const matchingInput = transactionData.inputs.find((input) => {
					if (input.Object?.ImmOrOwnedObject) {
						return coin.coinObjectId === input.Object.ImmOrOwnedObject.objectId;
					}

					return false;
				});

				return !matchingInput;
			})
			.map((coin) => ({
				objectId: coin.coinObjectId,
				digest: coin.digest,
				version: coin.version,
			}));

		if (!paymentCoins.length) {
			throw new Error('No valid gas coins found for the transaction.');
		}

		transactionData.gasConfig.payment = paymentCoins.map((payment) =>
			parse(ObjectRefSchema, payment),
		);
	}
}

async function resolveObjectReferences(
	transactionData: TransactionDataBuilder,
	client: SuiJsonRpcClient,
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
			objectChunks.map((chunk) =>
				client.multiGetObjects({
					ids: chunk,
					options: { showOwner: true },
				}),
			),
		)
	).flat();

	const responsesById = new Map(
		dedupedIds.map((id, index) => {
			return [id, resolved[index]];
		}),
	);

	const invalidObjects = Array.from(responsesById)
		.filter(([_, obj]) => obj.error)
		.map(([_, obj]) => JSON.stringify(obj.error));

	if (invalidObjects.length) {
		throw new Error(`The following input objects are invalid: ${invalidObjects.join(', ')}`);
	}

	const objects = resolved.map((object) => {
		if (object.error || !object.data) {
			throw new Error(`Failed to fetch object: ${object.error}`);
		}
		const owner = object.data.owner;
		const initialSharedVersion =
			owner && typeof owner === 'object'
				? 'Shared' in owner
					? owner.Shared.initial_shared_version
					: 'ConsensusAddressOwner' in owner
						? owner.ConsensusAddressOwner.start_version
						: null
				: null;

		return {
			objectId: object.data.objectId,
			digest: object.data.digest,
			version: object.data.version,
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

async function normalizeInputs(transactionData: TransactionDataBuilder, client: SuiJsonRpcClient) {
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

	const moveFunctionParameters = new Map<string, OpenMoveTypeSignature[]>();
	if (moveFunctionsToResolve.size > 0) {
		await Promise.all(
			[...moveFunctionsToResolve].map(async (functionName) => {
				const [packageId, moduleId, functionId] = functionName.split('::');
				const def = await client.getNormalizedMoveFunction({
					package: packageId,
					module: moduleId,
					function: functionId,
				});

				moveFunctionParameters.set(
					functionName,
					def.parameters.map((param) => normalizedTypeToMoveTypeSignature(param)),
				);
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
			usedAsMutable = tx.MoveCall._argumentTypes[argIndex].ref !== '&' || usedAsMutable;
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

function isReceivingType(type: OpenMoveTypeSignature): boolean {
	if (typeof type.body !== 'object' || !('datatype' in type.body)) {
		return false;
	}

	return (
		type.body.datatype.package === '0x2' &&
		type.body.datatype.module === 'transfer' &&
		type.body.datatype.type === 'Receiving'
	);
}
