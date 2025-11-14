// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { toBase58 } from '@mysten/bcs';
import { Transaction } from '../../../src/transactions/Transaction.js';
import { transactionDataToGrpcTransaction } from '../../../src/client/transaction-resolver.js';
import { Input_InputKind } from '../../../src/grpc/proto/sui/rpc/v2/input.js';
import { Argument_ArgumentKind } from '../../../src/grpc/proto/sui/rpc/v2/argument.js';
import type { Transaction as GrpcTransaction } from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';

// Helper to get programmable transaction from gRPC transaction
function getProgrammableTx(grpcTx: GrpcTransaction) {
	const data = grpcTx.kind?.data;
	if (data && data.oneofKind === 'programmableTransaction') {
		return data.programmableTransaction;
	}
	throw new Error('Expected programmableTransaction');
}

describe('Transaction Resolver - TypeScript to gRPC Conversion', () => {
	describe('Input Conversion', () => {
		it('should convert Pure inputs correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [tx.pure.u64(12345)],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			expect(input?.kind).toBe(Input_InputKind.PURE);
			expect(input?.pure).toBeDefined();
		});

		it('should convert UnresolvedObject (ID only) inputs correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [tx.object('0x123')],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			// When we only have an ID, we don't set kind - let the server infer it
			expect(input?.kind).toBeUndefined();
			expect(input?.objectId).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
			expect(input?.version).toBeUndefined();
			expect(input?.digest).toBeUndefined();
		});

		it('should convert ImmOrOwnedObject inputs correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [
					tx.objectRef({
						objectId: '0x123',
						version: '456',
						digest: toBase58(new Uint8Array(32).fill(0x1)),
					}),
				],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			expect(input?.kind).toBe(Input_InputKind.IMMUTABLE_OR_OWNED);
			expect(input?.objectId).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
			expect(input?.version).toBe(BigInt(456));
			expect(input?.digest).toBe(toBase58(new Uint8Array(32).fill(0x1)));
		});

		it('should convert SharedObject inputs correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [
					tx.sharedObjectRef({
						objectId: '0x123',
						mutable: true,
						initialSharedVersion: '789',
					}),
				],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			expect(input?.kind).toBe(Input_InputKind.SHARED);
			expect(input?.objectId).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
			expect(input?.version).toBe(BigInt(789));
			expect(input?.mutable).toBe(true);
		});

		it('should convert Receiving inputs correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [
					tx.receivingRef({
						objectId: '0x123',
						version: '456',
						digest: toBase58(new Uint8Array(32).fill(0x1)),
					}),
				],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			expect(input?.kind).toBe(Input_InputKind.RECEIVING);
			expect(input?.objectId).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
			expect(input?.version).toBe(BigInt(456));
			expect(input?.digest).toBe(toBase58(new Uint8Array(32).fill(0x1)));
		});

		it('should convert UnresolvedObject with shared object properties (fully specified)', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [
					tx.sharedObjectRef({
						objectId: '0x123',
						mutable: false,
						initialSharedVersion: '1',
					}),
				],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			expect(input?.kind).toBe(Input_InputKind.SHARED);
			expect(input?.mutable).toBe(false);
			expect(input?.version).toBe(BigInt(1));
		});

		it('should convert UnresolvedObject with only mutable flag (partially resolved shared object)', () => {
			const tx = new Transaction();
			// Use sharedObjectRef with only mutable flag, no initialSharedVersion
			// This simulates a partially resolved shared object that needs server resolution
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [
					tx.sharedObjectRef({
						objectId: '0x456',
						mutable: true,
						initialSharedVersion: '0', // Will need resolution from server
					}),
				],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const input = ptx.inputs?.[0];

			// Should be marked as SHARED (not UNKNOWN) since we know it's shared
			expect(input?.kind).toBe(Input_InputKind.SHARED);
			expect(input?.mutable).toBe(true);
			// Version should be set even if it's 0 (will be resolved by server)
			expect(input?.version).toBe(BigInt(0));
		});
	});

	describe('Argument Conversion', () => {
		it('should convert GasCoin arguments correctly', () => {
			const tx = new Transaction();
			tx.splitCoins(tx.gas, [1000]);

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('splitCoins');
			if (command?.command?.oneofKind === 'splitCoins') {
				expect(command.command.splitCoins.coin?.kind).toBe(Argument_ArgumentKind.GAS);
			}
		});

		it('should convert Input arguments correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				arguments: [tx.pure.u64(123)],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('moveCall');
			if (command?.command?.oneofKind === 'moveCall') {
				const arg = command.command.moveCall.arguments[0];
				expect(arg.kind).toBe(Argument_ArgumentKind.INPUT);
				expect(arg.input).toBe(0);
			}
		});

		it('should convert Result arguments correctly', () => {
			const tx = new Transaction();
			const result = tx.splitCoins(tx.gas, [1000]);
			tx.transferObjects([result], '0x123');

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[1];

			expect(command?.command?.oneofKind).toBe('transferObjects');
			if (command?.command?.oneofKind === 'transferObjects') {
				const arg = command.command.transferObjects.objects[0];
				expect(arg.kind).toBe(Argument_ArgumentKind.RESULT);
				expect(arg.result).toBe(0);
			}
		});

		it('should convert NestedResult arguments correctly', () => {
			const tx = new Transaction();
			const result = tx.moveCall({
				target: '0x2::foo::bar',
			});
			tx.transferObjects([result[1]], '0x123');

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[1];

			expect(command?.command?.oneofKind).toBe('transferObjects');
			if (command?.command?.oneofKind === 'transferObjects') {
				const arg = command.command.transferObjects.objects[0];
				expect(arg.kind).toBe(Argument_ArgumentKind.RESULT);
				expect(arg.result).toBe(0);
				expect(arg.subresult).toBe(1);
			}
		});
	});

	describe('Command Conversion', () => {
		it('should convert MoveCall commands correctly', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
				typeArguments: ['0x1::string::String'],
				arguments: [tx.pure.u64(123)],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('moveCall');
			if (command?.command?.oneofKind === 'moveCall') {
				expect(command.command.moveCall.package).toBe(
					'0x0000000000000000000000000000000000000000000000000000000000000002',
				);
				expect(command.command.moveCall.module).toBe('foo');
				expect(command.command.moveCall.function).toBe('bar');
				expect(command.command.moveCall.typeArguments).toEqual(['0x1::string::String']);
			}
		});

		it('should convert TransferObjects commands correctly', () => {
			const tx = new Transaction();
			tx.transferObjects([tx.object('0x123')], '0x456');

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('transferObjects');
			if (command?.command?.oneofKind === 'transferObjects') {
				expect(command.command.transferObjects.objects.length).toBe(1);
				expect(command.command.transferObjects.address).toBeDefined();
			}
		});

		it('should convert SplitCoins commands correctly', () => {
			const tx = new Transaction();
			tx.splitCoins(tx.gas, [1000, 2000]);

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('splitCoins');
			if (command?.command?.oneofKind === 'splitCoins') {
				expect(command.command.splitCoins.coin?.kind).toBe(Argument_ArgumentKind.GAS);
				expect(command.command.splitCoins.amounts.length).toBe(2);
			}
		});

		it('should convert MergeCoins commands correctly', () => {
			const tx = new Transaction();
			tx.mergeCoins(tx.object('0x123'), [tx.object('0x456'), tx.object('0x789')]);

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('mergeCoins');
			if (command?.command?.oneofKind === 'mergeCoins') {
				expect(command.command.mergeCoins.coin).toBeDefined();
				expect(command.command.mergeCoins.coinsToMerge.length).toBe(2);
			}
		});

		it('should convert Publish commands correctly', () => {
			const tx = new Transaction();
			tx.publish({
				modules: [[1, 2, 3]],
				dependencies: ['0x1', '0x2'],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('publish');
			if (command?.command?.oneofKind === 'publish') {
				expect(command.command.publish.modules.length).toBe(1);
				expect(command.command.publish.dependencies.length).toBe(2);
			}
		});

		it('should convert MakeMoveVector commands correctly', () => {
			const tx = new Transaction();
			tx.makeMoveVec({
				type: '0x2::coin::Coin<0x2::sui::SUI>',
				elements: [tx.object('0x123'), tx.object('0x456')],
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			const ptx = getProgrammableTx(grpcTx);
			const command = ptx.commands?.[0];

			expect(command?.command?.oneofKind).toBe('makeMoveVector');
			if (command?.command?.oneofKind === 'makeMoveVector') {
				expect(command.command.makeMoveVector.elementType).toBe('0x2::coin::Coin<0x2::sui::SUI>');
				expect(command.command.makeMoveVector.elements.length).toBe(2);
			}
		});
	});

	describe('Gas Data Conversion', () => {
		it('should convert empty gas data', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.gasPayment).toBeDefined();
			expect(grpcTx.gasPayment?.objects).toEqual([]);
			expect(grpcTx.gasPayment?.budget).toBeUndefined();
			expect(grpcTx.gasPayment?.price).toBeUndefined();
		});

		it('should convert gas data with budget only', () => {
			const tx = new Transaction();
			tx.setGasBudget(10000000);
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.gasPayment?.budget).toBe(BigInt(10000000));
			expect(grpcTx.gasPayment?.price).toBeUndefined();
		});

		it('should convert gas data with price only', () => {
			const tx = new Transaction();
			tx.setGasPrice(1000);
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.gasPayment?.price).toBe(BigInt(1000));
		});

		it('should convert gas data with payment', () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasPayment([
				{
					objectId: '0x456',
					version: '789',
					digest: toBase58(new Uint8Array(32).fill(0x1)),
				},
			]);
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.gasPayment?.objects?.length).toBe(1);
			expect(grpcTx.gasPayment?.objects?.[0].objectId).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000456',
			);
			expect(grpcTx.gasPayment?.objects?.[0].version).toBe(BigInt(789));
			expect(grpcTx.gasPayment?.owner).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
		});

		it('should use sender as gas owner fallback', () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasBudget(10000000);
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.gasPayment?.owner).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
		});
	});

	describe('Transaction Metadata', () => {
		it('should convert sender', () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.sender).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000123',
			);
		});

		it('should handle missing sender', () => {
			const tx = new Transaction();
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.sender).toBeUndefined();
		});

		it('should convert expiration with Epoch', () => {
			const tx = new Transaction();
			tx.setExpiration({ Epoch: 100 });
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.expiration?.kind).toBe(2); // EPOCH = 2
			expect(grpcTx.expiration?.epoch).toBe(BigInt(100));
		});

		it('should convert expiration with None', () => {
			const tx = new Transaction();
			tx.setExpiration({ None: true });
			tx.moveCall({
				target: '0x2::foo::bar',
			});

			const grpcTx = transactionDataToGrpcTransaction(tx.getData());
			expect(grpcTx.expiration?.kind).toBe(1); // NONE = 1
		});
	});
});
