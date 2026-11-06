// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from 'vitest';

import { gunzipSync } from 'node:zlib';

import { fromBase64 } from '@mysten/bcs';

import { bcs } from '../../../src/bcs/index.js';
import { parseTransactionDataBcs } from '../../../src/client/transaction-data.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { Transaction } from '../../../src/transactions/index.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/sui-types.js';
import { GENESIS_TRANSACTION_GZIP_BASE64 } from '../bcs/fixtures/genesis-transaction.js';
import { address, bcsTransaction, cases } from './fixtures/transaction-kinds.js';

describe('ledger transaction data', () => {
	it.each(Object.entries(cases))(
		'decodes %s without requiring a programmable transaction',
		(name, { bcs: kind }) => {
			const bytes = bcsTransaction(kind);
			const result = parseTransactionDataBcs(bytes);
			expect(result.kind.$kind).toBe(name);
			expect(result.sender).toBe(address);
			expect(result.gasData.price).toBe('9007199254740994');
			expect(result.gasData.payment[0].version).toBe('9007199254740993');
			expect(result.expiration).toEqual({ $kind: 'None', None: true });
			expect(result.version).toBe(2);
			const { kind: _, inputs: topInputs, commands: topCommands, ...rest } = result;
			if (
				result.kind.$kind === 'ProgrammableTransaction' ||
				result.kind.$kind === 'ProgrammableSystemTransaction'
			) {
				const body =
					result.kind.ProgrammableTransaction ?? result.kind.ProgrammableSystemTransaction;
				const { inputs, commands, ...header } = Transaction.from(
					bcsTransaction(cases.ProgrammableTransaction.bcs),
				).getData();
				expect(body).toEqual({ inputs, commands });
				expect(rest).toEqual(header);
			} else if (result.kind.$kind !== 'EndOfEpochTransaction') {
				expect(result.kind).toEqual(bcs.TransactionData.parse(bytes).V1.kind);
			}
			const programmable =
				result.kind.ProgrammableTransaction ?? result.kind.ProgrammableSystemTransaction;
			if (programmable) {
				expect({ inputs: topInputs, commands: topCommands }).toEqual(programmable);
				expect(topCommands).toHaveLength(1);
			} else {
				expect(topInputs).toEqual([]);
				expect(topCommands).toEqual([]);
			}
		},
	);

	it('exposes resolved programmable input and command unions', () => {
		const { kind } = parseTransactionDataBcs(bcsTransaction(cases.ProgrammableTransaction.bcs));
		if (kind.$kind !== 'ProgrammableTransaction') throw new Error('Expected PTB');
		expectTypeOf(
			kind.ProgrammableTransaction,
		).toEqualTypeOf<SuiClientTypes.ProgrammableTransaction>();
		expect(kind.ProgrammableTransaction.inputs[0]).toEqual({
			$kind: 'Pure',
			Pure: { bytes: 'AQ==' },
		});
		const command = kind.ProgrammableTransaction.commands[0];
		if (command.$kind !== 'MoveCall') throw new Error('Expected MoveCall');
		expect(command.MoveCall.typeArguments).toEqual(['u64']);
		expect(command.MoveCall.arguments).toEqual([
			{ $kind: 'Input', Input: 0 },
			{ $kind: 'GasCoin', GasCoin: true },
		]);
	});

	it.each(['ProgrammableTransaction', 'ProgrammableSystemTransaction'] as const)(
		'preserves builder normalization for %s',
		(name) => {
			const body = {
				inputs: [
					{
						Object: {
							SharedObject: {
								objectId: '0x2',
								initialSharedVersion: '9007199254740993',
								mutable: true,
							},
						},
					},
					{ Pure: { bytes: 'AQ==' } },
				],
				commands: [
					{
						MoveCall: {
							package: '0x2',
							module: 'example',
							function: 'run',
							typeArguments: ['0x2::example::Value<u64>'],
							arguments: [{ Input: 0 }, { GasCoin: true }],
						},
					},
					{ MakeMoveVec: { type: null, elements: [{ NestedResult: [0, 1] }] } },
					{ Publish: { modules: ['AQID'], dependencies: ['0x2'] } },
				],
			} satisfies typeof bcs.ProgrammableTransaction.$inferInput;
			const expected = Transaction.from(
				bcsTransaction({ ProgrammableTransaction: body }),
			).getData();
			const result = parseTransactionDataBcs(
				bcsTransaction(
					name === 'ProgrammableTransaction'
						? { ProgrammableTransaction: body }
						: { ProgrammableSystemTransaction: body },
				),
			);
			const { kind, inputs: topInputs, commands: topCommands, ...rest } = result;
			const { inputs, commands, ...header } = expected;
			expect(rest).toEqual(header);
			expect(topInputs).toEqual(inputs);
			expect(topCommands).toEqual(commands);
			const parsed = kind.ProgrammableTransaction ?? kind.ProgrammableSystemTransaction;
			expect(parsed).toEqual({ inputs, commands });
			expect(parsed?.commands[1]).toMatchObject({ MakeMoveVec: { type: null } });
			expect(parsed?.commands[2]).toMatchObject({ Publish: { modules: ['AQID'] } });
		},
	);

	it('preserves all nested end-of-epoch variants', () => {
		const { kind } = parseTransactionDataBcs(bcsTransaction(cases.EndOfEpochTransaction.bcs));
		if (kind.$kind !== 'EndOfEpochTransaction') throw new Error('Expected end of epoch');
		expect(kind.EndOfEpochTransaction).toHaveLength(14);
		const parsed = bcs.TransactionData.parse(bcsTransaction(cases.EndOfEpochTransaction.bcs)).V1
			.kind;
		expect(
			kind.EndOfEpochTransaction.filter((entry) => entry.$kind !== 'BridgeStateCreate'),
		).toEqual(parsed.EndOfEpochTransaction!.filter((entry) => entry.$kind !== 'BridgeStateCreate'));
		// The chain identifier is reported as the RPC APIs do: the digest's first 4 bytes in hex.
		expect(kind.EndOfEpochTransaction[5]).toEqual({
			$kind: 'BridgeStateCreate',
			BridgeStateCreate: { chainId: '00000000' },
		});
		expect(kind.EndOfEpochTransaction.at(-2)).toEqual({
			$kind: 'WriteAccumulatorStorageCost',
			WriteAccumulatorStorageCost: { storageCost: '123' },
		});
	});

	it('decodes genesis objects', () => {
		const { kind } = parseTransactionDataBcs(
			gunzipSync(fromBase64(GENESIS_TRANSACTION_GZIP_BASE64)),
		);
		if (kind.$kind !== 'Genesis') throw new Error('Expected genesis');
		const { objects } = kind.Genesis;
		expect(
			objects.filter(({ type }) => type === 'package').map(({ objectId }) => objectId),
		).toEqual(['0x1', '0x2', '0x3', '0xb', '0xdee9'].map((id) => normalizeSuiAddress(id)));
		expect(objects).toContainEqual({
			objectId: normalizeSuiAddress('0x5'),
			version: '0',
			owner: { $kind: 'Shared', Shared: { initialSharedVersion: '0' } },
			type: normalizeStructTag('0x3::sui_system::SuiSystemState'),
		});
		const types = new Set(objects.map(({ type }) => type));
		expect(types).toContain(normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>'));
		expect(types).toContain(normalizeStructTag('0x3::staking_pool::StakedSui'));
	});
});

describe('ledger transaction data types', () => {
	it('describe resolved values with $kind discriminants', () => {
		expectTypeOf<SuiClientTypes.TransactionInput['$kind']>().toEqualTypeOf<
			'Object' | 'Pure' | 'FundsWithdrawal'
		>();
		expectTypeOf<SuiClientTypes.TransactionCommand['$kind']>().toEqualTypeOf<
			| 'MoveCall'
			| 'TransferObjects'
			| 'SplitCoins'
			| 'MergeCoins'
			| 'Publish'
			| 'MakeMoveVec'
			| 'Upgrade'
		>();
		expectTypeOf<SuiClientTypes.TransactionExpiration['$kind']>().toEqualTypeOf<
			'None' | 'Epoch' | 'ValidDuring' | 'Validity'
		>();
	});
});
