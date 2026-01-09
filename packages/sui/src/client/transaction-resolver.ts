// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import type { bcs } from '../bcs/index.js';
import { TransactionDataBuilder } from '../transactions/TransactionData.js';
import type {
	CallArg,
	Command as BcsCommand,
	TransactionData,
} from '../transactions/data/internal.js';
import type { Transaction as GrpcTransaction } from '../grpc/proto/sui/rpc/v2/transaction.js';
import {
	Transaction as GrpcTransactionType,
	TransactionExpiration_TransactionExpirationKind,
} from '../grpc/proto/sui/rpc/v2/transaction.js';
import type { ObjectReference } from '../grpc/proto/sui/rpc/v2/object_reference.js';
import type { Input } from '../grpc/proto/sui/rpc/v2/input.js';
import { Input_InputKind } from '../grpc/proto/sui/rpc/v2/input.js';
import type { Command } from '../grpc/proto/sui/rpc/v2/transaction.js';
import type { Argument } from '../grpc/proto/sui/rpc/v2/argument.js';
import { Argument_ArgumentKind } from '../grpc/proto/sui/rpc/v2/argument.js';
import { Transaction } from '../transactions/Transaction.js';

/**
 * Converts CallArg (TypeScript internal format) to gRPC Input format
 */
function callArgToGrpcInput(arg: CallArg): Input {
	switch (arg.$kind) {
		case 'Pure':
			// Pure.bytes is a base64-encoded string that needs to be decoded
			return {
				kind: Input_InputKind.PURE,
				pure: fromBase64(arg.Pure.bytes),
			};

		case 'Object':
			if (arg.Object.$kind === 'ImmOrOwnedObject') {
				return {
					kind: Input_InputKind.IMMUTABLE_OR_OWNED,
					objectId: arg.Object.ImmOrOwnedObject.objectId,
					version: BigInt(arg.Object.ImmOrOwnedObject.version),
					digest: arg.Object.ImmOrOwnedObject.digest,
				};
			} else if (arg.Object.$kind === 'SharedObject') {
				return {
					kind: Input_InputKind.SHARED,
					objectId: arg.Object.SharedObject.objectId,
					version: BigInt(arg.Object.SharedObject.initialSharedVersion),
					mutable: arg.Object.SharedObject.mutable,
				};
			} else if (arg.Object.$kind === 'Receiving') {
				return {
					kind: Input_InputKind.RECEIVING,
					objectId: arg.Object.Receiving.objectId,
					version: BigInt(arg.Object.Receiving.version),
					digest: arg.Object.Receiving.digest,
				};
			}
			throw new Error(`Unknown Object kind: ${JSON.stringify(arg.Object)}`);

		case 'UnresolvedObject':
			const unresolved = arg.UnresolvedObject;
			return {
				objectId: unresolved.objectId,
				version: unresolved.version
					? BigInt(unresolved.version)
					: unresolved.initialSharedVersion
						? BigInt(unresolved.initialSharedVersion)
						: undefined,
				digest: unresolved.digest ?? undefined,
				mutable: unresolved.mutable ?? undefined,
			};

		case 'UnresolvedPure':
			throw new Error('UnresolvedPure arguments must be resolved before converting to gRPC format');

		default:
			throw new Error(`Unknown CallArg kind: ${JSON.stringify(arg)}`);
	}
}

/**
 * Converts a TypeScript Argument to gRPC Argument
 */
function tsArgumentToGrpcArgument(arg: typeof bcs.Argument.$inferInput): Argument {
	if ('GasCoin' in arg) {
		return { kind: Argument_ArgumentKind.GAS };
	} else if ('Input' in arg) {
		return { kind: Argument_ArgumentKind.INPUT, input: arg.Input };
	} else if ('Result' in arg) {
		return { kind: Argument_ArgumentKind.RESULT, result: arg.Result };
	} else if ('NestedResult' in arg) {
		return {
			kind: Argument_ArgumentKind.RESULT,
			result: arg.NestedResult[0],
			subresult: arg.NestedResult[1],
		};
	}
	throw new Error(`Unknown Argument: ${JSON.stringify(arg)}`);
}

/**
 * Converts TypeScript Command to gRPC Command
 */
function tsCommandToGrpcCommand(cmd: BcsCommand): Command {
	switch (cmd.$kind) {
		case 'MoveCall':
			return {
				command: {
					oneofKind: 'moveCall',
					moveCall: {
						package: cmd.MoveCall.package,
						module: cmd.MoveCall.module,
						function: cmd.MoveCall.function,
						typeArguments: cmd.MoveCall.typeArguments,
						arguments: cmd.MoveCall.arguments.map(tsArgumentToGrpcArgument),
					},
				},
			};

		case 'TransferObjects':
			return {
				command: {
					oneofKind: 'transferObjects',
					transferObjects: {
						objects: cmd.TransferObjects.objects.map(tsArgumentToGrpcArgument),
						address: tsArgumentToGrpcArgument(cmd.TransferObjects.address),
					},
				},
			};

		case 'SplitCoins':
			return {
				command: {
					oneofKind: 'splitCoins',
					splitCoins: {
						coin: tsArgumentToGrpcArgument(cmd.SplitCoins.coin),
						amounts: cmd.SplitCoins.amounts.map(tsArgumentToGrpcArgument),
					},
				},
			};

		case 'MergeCoins':
			return {
				command: {
					oneofKind: 'mergeCoins',
					mergeCoins: {
						coin: tsArgumentToGrpcArgument(cmd.MergeCoins.destination),
						coinsToMerge: cmd.MergeCoins.sources.map(tsArgumentToGrpcArgument),
					},
				},
			};

		case 'Publish':
			return {
				command: {
					oneofKind: 'publish',
					publish: {
						// modules are base64-encoded strings in internal format
						modules: cmd.Publish.modules.map((m) => fromBase64(m)),
						dependencies: cmd.Publish.dependencies,
					},
				},
			};

		case 'MakeMoveVec':
			return {
				command: {
					oneofKind: 'makeMoveVector',
					makeMoveVector: {
						elementType: cmd.MakeMoveVec.type ?? undefined,
						elements: cmd.MakeMoveVec.elements.map(tsArgumentToGrpcArgument),
					},
				},
			};

		case 'Upgrade':
			return {
				command: {
					oneofKind: 'upgrade',
					upgrade: {
						// modules are base64-encoded strings in internal format
						modules: cmd.Upgrade.modules.map((m) => fromBase64(m)),
						dependencies: cmd.Upgrade.dependencies,
						package: cmd.Upgrade.package,
						ticket: tsArgumentToGrpcArgument(cmd.Upgrade.ticket),
					},
				},
			};

		default:
			throw new Error(`Unknown Command kind: ${JSON.stringify(cmd)}`);
	}
}

export function transactionDataToGrpcTransaction(data: TransactionData): GrpcTransaction {
	const grpcInputs = data.inputs.map(callArgToGrpcInput);

	const grpcCommands = data.commands.map(tsCommandToGrpcCommand);

	const transaction: GrpcTransaction = {
		version: 1,
		kind: {
			data: {
				oneofKind: 'programmableTransaction',
				programmableTransaction: {
					inputs: grpcInputs,
					commands: grpcCommands,
				},
			},
		},
	};

	if (data.sender) {
		transaction.sender = data.sender;
	}

	const gasOwner = data.gasData.owner ?? data.sender;

	transaction.gasPayment = {
		objects: data.gasData.payment
			? data.gasData.payment.map((ref) => ({
					objectId: ref.objectId,
					version: BigInt(ref.version),
					digest: ref.digest,
				}))
			: [],
		price: data.gasData.price ? BigInt(data.gasData.price) : undefined,
		budget: data.gasData.budget ? BigInt(data.gasData.budget) : undefined,
	};

	if (gasOwner) {
		transaction.gasPayment.owner = gasOwner;
	}

	if (data.expiration) {
		if ('None' in data.expiration) {
			transaction.expiration = {
				kind: TransactionExpiration_TransactionExpirationKind.NONE,
			};
		} else if ('Epoch' in data.expiration) {
			transaction.expiration = {
				kind: TransactionExpiration_TransactionExpirationKind.EPOCH,
				epoch: BigInt(data.expiration.Epoch),
			};
		}
	}

	return transaction;
}

export function applyGrpcResolvedTransaction(
	transactionData: TransactionDataBuilder,
	resolvedTransaction: GrpcTransaction,
	options?: { onlyTransactionKind?: boolean },
): void {
	if (!resolvedTransaction.bcs?.value) {
		throw new Error('Resolved transaction must contain BCS data');
	}

	const resolvedBuilder = TransactionDataBuilder.fromBytes(resolvedTransaction.bcs.value);
	const resolved = resolvedBuilder.snapshot();

	if (options?.onlyTransactionKind) {
		transactionData.applyResolvedData({
			...resolved,
			gasData: {
				budget: null,
				owner: null,
				payment: null,
				price: null,
			},
			expiration: null,
		});
	} else {
		transactionData.applyResolvedData(resolved);
	}
}

/**
 * Converts an array of ObjectReferences from gRPC format to TypeScript SuiObjectRef format
 */
export function grpcObjectReferencesToBcs(refs: ObjectReference[]): {
	objectId: string;
	version: string;
	digest: string;
}[] {
	return refs.map((ref) => ({
		objectId: ref.objectId!,
		version: ref.version?.toString()!,
		digest: ref.digest!,
	}));
}

export function transactionToGrpcTransaction(transaction: Transaction) {
	const snapshot = transaction.getData();

	if (!snapshot.sender) {
		snapshot.sender = '0x0000000000000000000000000000000000000000000000000000000000000000';
	}

	return transactionDataToGrpcTransaction(snapshot);
}

export function transactionToGrpcJson(transaction: Transaction): unknown {
	const grpcTransaction = transactionToGrpcTransaction(transaction);
	return GrpcTransactionType.toJson(grpcTransaction);
}
