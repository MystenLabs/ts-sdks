// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/bcs';

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
import { FundsWithdrawal_Source, Input_InputKind } from '../grpc/proto/sui/rpc/v2/input.js';
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

		case 'FundsWithdrawal': {
			const withdrawal = arg.FundsWithdrawal;
			return {
				kind: Input_InputKind.FUNDS_WITHDRAWAL,
				fundsWithdrawal: {
					amount:
						withdrawal.reservation.$kind === 'MaxAmountU64'
							? BigInt(withdrawal.reservation.MaxAmountU64)
							: undefined,
					coinType: withdrawal.typeArg.$kind === 'Balance' ? withdrawal.typeArg.Balance : undefined,
					source:
						withdrawal.withdrawFrom.$kind === 'Sponsor'
							? FundsWithdrawal_Source.SPONSOR
							: FundsWithdrawal_Source.SENDER,
				},
			};
		}

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
		} else if (data.expiration.$kind === 'Epoch') {
			transaction.expiration = {
				kind: TransactionExpiration_TransactionExpirationKind.EPOCH,
				epoch: BigInt(data.expiration.Epoch),
			};
		} else if (data.expiration.$kind === 'ValidDuring') {
			const validDuring = data.expiration.ValidDuring;
			transaction.expiration = {
				kind: TransactionExpiration_TransactionExpirationKind.VALID_DURING,
				minEpoch: validDuring.minEpoch != null ? BigInt(validDuring.minEpoch) : undefined,
				epoch: validDuring.maxEpoch != null ? BigInt(validDuring.maxEpoch) : undefined,
				chain: validDuring.chain,
				nonce: validDuring.nonce,
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
	const resolved = grpcTransactionToTransactionData(resolvedTransaction);

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

function grpcInputToCallArg(input: Input): CallArg {
	switch (input.kind) {
		case Input_InputKind.PURE:
			return {
				$kind: 'Pure',
				Pure: { bytes: toBase64(input.pure!) },
			};

		case Input_InputKind.IMMUTABLE_OR_OWNED:
			return {
				$kind: 'Object',
				Object: {
					$kind: 'ImmOrOwnedObject',
					ImmOrOwnedObject: {
						objectId: input.objectId!,
						version: input.version!.toString(),
						digest: input.digest!,
					},
				},
			};

		case Input_InputKind.SHARED:
			return {
				$kind: 'Object',
				Object: {
					$kind: 'SharedObject',
					SharedObject: {
						objectId: input.objectId!,
						initialSharedVersion: input.version!.toString(),
						mutable: input.mutable ?? false,
					},
				},
			};

		case Input_InputKind.RECEIVING:
			return {
				$kind: 'Object',
				Object: {
					$kind: 'Receiving',
					Receiving: {
						objectId: input.objectId!,
						version: input.version!.toString(),
						digest: input.digest!,
					},
				},
			};

		case Input_InputKind.FUNDS_WITHDRAWAL:
			return {
				$kind: 'FundsWithdrawal',
				FundsWithdrawal: {
					reservation: {
						$kind: 'MaxAmountU64' as const,
						MaxAmountU64: input.fundsWithdrawal?.amount?.toString() ?? '0',
					},
					typeArg: {
						$kind: 'Balance' as const,
						Balance: input.fundsWithdrawal?.coinType ?? '0x2::sui::SUI',
					},
					withdrawFrom:
						input.fundsWithdrawal?.source === FundsWithdrawal_Source.SPONSOR
							? { $kind: 'Sponsor' as const, Sponsor: true as const }
							: { $kind: 'Sender' as const, Sender: true as const },
				},
			};

		default:
			throw new Error(`Unknown Input kind: ${JSON.stringify(input)}`);
	}
}

function grpcArgumentToTsArgument(
	arg: Argument,
):
	| { $kind: 'GasCoin'; GasCoin: true }
	| { $kind: 'Input'; Input: number }
	| { $kind: 'Result'; Result: number }
	| { $kind: 'NestedResult'; NestedResult: [number, number] } {
	switch (arg.kind) {
		case Argument_ArgumentKind.GAS:
			return { $kind: 'GasCoin', GasCoin: true };
		case Argument_ArgumentKind.INPUT:
			return { $kind: 'Input', Input: arg.input! };
		case Argument_ArgumentKind.RESULT:
			if (arg.subresult != null) {
				return { $kind: 'NestedResult', NestedResult: [arg.result!, arg.subresult] };
			}
			return { $kind: 'Result', Result: arg.result! };
		default:
			throw new Error(`Unknown Argument kind: ${JSON.stringify(arg)}`);
	}
}

function grpcCommandToTsCommand(cmd: Command): BcsCommand {
	const command = cmd.command;
	if (!command) {
		throw new Error('Command is missing');
	}

	switch (command.oneofKind) {
		case 'moveCall':
			return {
				$kind: 'MoveCall',
				MoveCall: {
					package: command.moveCall.package!,
					module: command.moveCall.module!,
					function: command.moveCall.function!,
					typeArguments: command.moveCall.typeArguments ?? [],
					arguments: command.moveCall.arguments.map(grpcArgumentToTsArgument),
				},
			};

		case 'transferObjects':
			return {
				$kind: 'TransferObjects',
				TransferObjects: {
					objects: command.transferObjects.objects.map(grpcArgumentToTsArgument),
					address: grpcArgumentToTsArgument(command.transferObjects.address!),
				},
			};

		case 'splitCoins':
			return {
				$kind: 'SplitCoins',
				SplitCoins: {
					coin: grpcArgumentToTsArgument(command.splitCoins.coin!),
					amounts: command.splitCoins.amounts.map(grpcArgumentToTsArgument),
				},
			};

		case 'mergeCoins':
			return {
				$kind: 'MergeCoins',
				MergeCoins: {
					destination: grpcArgumentToTsArgument(command.mergeCoins.coin!),
					sources: command.mergeCoins.coinsToMerge.map(grpcArgumentToTsArgument),
				},
			};

		case 'publish':
			return {
				$kind: 'Publish',
				Publish: {
					modules: command.publish.modules.map((m) => toBase64(m)),
					dependencies: command.publish.dependencies ?? [],
				},
			};

		case 'makeMoveVector':
			return {
				$kind: 'MakeMoveVec',
				MakeMoveVec: {
					type: command.makeMoveVector.elementType ?? null,
					elements: command.makeMoveVector.elements.map(grpcArgumentToTsArgument),
				},
			};

		case 'upgrade':
			return {
				$kind: 'Upgrade',
				Upgrade: {
					modules: command.upgrade.modules.map((m) => toBase64(m)),
					dependencies: command.upgrade.dependencies ?? [],
					package: command.upgrade.package!,
					ticket: grpcArgumentToTsArgument(command.upgrade.ticket!),
				},
			};

		default:
			throw new Error(`Unknown Command kind: ${JSON.stringify(command)}`);
	}
}

export function grpcTransactionToTransactionData(grpcTx: GrpcTransaction): TransactionData {
	const programmableTx = grpcTx.kind?.data;
	if (programmableTx?.oneofKind !== 'programmableTransaction') {
		throw new Error('Only programmable transactions are supported');
	}

	const inputs = programmableTx.programmableTransaction.inputs.map(grpcInputToCallArg);
	const commands = programmableTx.programmableTransaction.commands.map(grpcCommandToTsCommand);

	let expiration: TransactionData['expiration'] = null;
	if (grpcTx.expiration) {
		switch (grpcTx.expiration.kind) {
			case TransactionExpiration_TransactionExpirationKind.NONE:
				expiration = { $kind: 'None', None: true };
				break;
			case TransactionExpiration_TransactionExpirationKind.EPOCH:
				expiration = { $kind: 'Epoch', Epoch: grpcTx.expiration.epoch!.toString() };
				break;
			case TransactionExpiration_TransactionExpirationKind.VALID_DURING:
				expiration = {
					$kind: 'ValidDuring',
					ValidDuring: {
						minEpoch: grpcTx.expiration.minEpoch?.toString() ?? null,
						maxEpoch: grpcTx.expiration.epoch?.toString() ?? null,
						minTimestamp: null,
						maxTimestamp: null,
						chain: grpcTx.expiration.chain ?? '',
						nonce: grpcTx.expiration.nonce ?? 0,
					},
				};
				break;
		}
	}

	return {
		version: 2 as const,
		sender: grpcTx.sender ?? null,
		expiration,
		gasData: {
			budget: grpcTx.gasPayment?.budget?.toString() ?? null,
			owner: grpcTx.gasPayment?.owner ?? null,
			payment:
				grpcTx.gasPayment?.objects?.map((obj) => ({
					objectId: obj.objectId!,
					version: obj.version!.toString(),
					digest: obj.digest!,
				})) ?? null,
			price: grpcTx.gasPayment?.price?.toString() ?? null,
		},
		inputs,
		commands,
	};
}
