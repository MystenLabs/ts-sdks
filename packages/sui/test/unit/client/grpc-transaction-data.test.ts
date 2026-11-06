// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	grpcTransactionToLedgerTransactionData,
	parseTransactionDataBcs,
} from '../../../src/client/transaction-data.js';
import { grpcTransactionToTransactionData } from '../../../src/client/transaction-resolver.js';
import { Input_InputKind } from '../../../src/grpc/proto/sui/rpc/v2/input.js';
import { Owner_OwnerKind as OwnerKind } from '../../../src/grpc/proto/sui/rpc/v2/owner.js';
import {
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/sui-types.js';
import {
	address,
	bcsTransaction,
	cases,
	grpcTransaction,
	header,
	programmable,
	prologue,
} from './fixtures/transaction-kinds.js';

describe('ledger transaction data from gRPC', () => {
	it.each(Object.entries(cases))('maps %s like the BCS decoder', (name, { grpc, bcs: kind }) => {
		const mapped = grpcTransactionToLedgerTransactionData(grpcTransaction(grpc));
		expect(mapped.kind.$kind).toBe(name);
		expect(mapped).toEqual(parseTransactionDataBcs(bcsTransaction(kind)));
	});

	it('maps genesis objects', () => {
		const genesis = (owner: { kind: OwnerKind; address?: string; version?: bigint }) =>
			grpcTransaction({
				kind: Kind.GENESIS,
				data: {
					oneofKind: 'genesis',
					genesis: {
						objects: [
							{
								objectId: '0x2',
								version: 1n,
								owner: { kind: OwnerKind.IMMUTABLE },
								objectType: 'package',
							},
							{
								objectId: '0x5',
								version: 1n,
								owner,
								objectType: '0x3::sui_system::SuiSystemState',
							},
						],
					},
				},
			});

		const mapped = grpcTransactionToLedgerTransactionData(
			genesis({ kind: OwnerKind.SHARED, version: 1n }),
		);
		expect(mapped.kind).toEqual({
			$kind: 'Genesis',
			Genesis: {
				objects: [
					{
						objectId: normalizeSuiAddress('0x2'),
						version: '1',
						owner: { $kind: 'Immutable', Immutable: true },
						type: 'package',
					},
					{
						objectId: normalizeSuiAddress('0x5'),
						version: '1',
						owner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
						type: normalizeStructTag('0x3::sui_system::SuiSystemState'),
					},
				],
			},
		});
		for (const owner of [
			{ kind: 99 as OwnerKind },
			{ kind: OwnerKind.ADDRESS },
			{ kind: OwnerKind.SHARED },
			{ kind: OwnerKind.CONSENSUS_ADDRESS, address: '0x1' },
		]) {
			expect(grpcTransactionToLedgerTransactionData(genesis(owner)).kind).toEqual({
				$kind: 'Unknown',
				Unknown: true,
			});
		}
	});

	it.each([
		['an unknown input', { kind: 99 as Input_InputKind }, programmable.grpc.commands],
		['an unknown command', programmable.grpc.inputs[0], [{ command: { oneofKind: undefined } }]],
		[
			'a shared input without mutability',
			{ kind: Input_InputKind.SHARED, objectId: address, version: 1n, mutable: true },
			programmable.grpc.commands,
		],
		[
			'a funds withdrawal without a source',
			{ kind: Input_InputKind.FUNDS_WITHDRAWAL, fundsWithdrawal: { amount: 1n } },
			programmable.grpc.commands,
		],
	])('returns Unknown for a programmable transaction with %s', (_, input, commands) => {
		const tx = grpcTransaction({
			kind: Kind.PROGRAMMABLE_TRANSACTION,
			data: {
				oneofKind: 'programmableTransaction',
				programmableTransaction: { inputs: [input], commands } as never,
			},
		});
		const mapped = grpcTransactionToLedgerTransactionData(tx);
		expect(mapped.kind).toEqual({ $kind: 'Unknown', Unknown: true });
		expect(mapped.sender).toBe(address);
		// Building and resolving transactions stays strict.
		expect(() => grpcTransactionToTransactionData(tx)).toThrow();
	});

	it('returns Unknown for unknown consensus version assignments', () => {
		const mapped = grpcTransactionToLedgerTransactionData(
			grpcTransaction({
				kind: Kind.CONSENSUS_COMMIT_PROLOGUE_V4,
				data: {
					oneofKind: 'consensusCommitPrologue',
					consensusCommitPrologue: {
						...prologue,
						consensusDeterminedVersionAssignments: { version: 3, canceledTransactions: [] },
					},
				},
			}),
		);
		expect(mapped.kind).toEqual({ $kind: 'Unknown', Unknown: true });
	});

	it.each([
		['sender', { sender: undefined }],
		['gas budget', { gasPayment: { ...header.gasPayment, budget: undefined } }],
		['gas payment', { gasPayment: { ...header.gasPayment, objects: undefined } }],
	])('rejects transaction data without a %s', (name, override) => {
		const tx = GrpcTransaction.create({
			...header,
			kind: cases.ProgrammableTransaction.grpc,
		});
		Object.assign(tx, override);
		expect(() => grpcTransactionToLedgerTransactionData(tx)).toThrow(
			`Transaction data is missing ${name}`,
		);
	});

	it('rejects an unknown expiration when resolving', () => {
		const tx = GrpcTransaction.create({
			...header,
			expiration: { kind: 99 as ExpirationKind },
			kind: cases.ProgrammableTransaction.grpc,
		});
		expect(() => grpcTransactionToTransactionData(tx)).toThrow(
			'Unknown transaction expiration kind: 99',
		);
	});

	it('maps shared object mutability for resolved transactions', () => {
		const { inputs } = grpcTransactionToTransactionData(
			grpcTransaction(cases.ProgrammableTransaction.grpc),
		);
		expect(inputs.slice(1)).toEqual([
			{
				$kind: 'Object',
				Object: {
					$kind: 'SharedObject',
					SharedObject: {
						objectId: address,
						initialSharedVersion: '1',
						mutable: false,
						mutability: 'NonExclusiveWrite',
					},
				},
			},
			{
				$kind: 'Object',
				Object: {
					$kind: 'SharedObject',
					SharedObject: { objectId: address, initialSharedVersion: '1', mutable: true },
				},
			},
		]);
	});
});
