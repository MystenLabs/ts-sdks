// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import { pureValues } from '../../src/transaction-analyzer/rules/pure-values.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';
import { DEFAULT_SENDER, TEST_COIN_1_ID, TEST_NFT_ID } from '../mocks/mockData.js';

describe('TransactionAnalyzer - PureValues Rule', () => {
	it('should parse pure values from MoveCall arguments', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// MoveCall with u64, address, and bool pure args
		// Uses 0x999::test::transfer which has params: (NFT &mut, u64, address, bool)
		const nft = tx.object(TEST_NFT_ID);
		tx.moveCall({
			target: '0x999::test::transfer',
			arguments: [nft, tx.pure.u64(42n), tx.pure.address('0xabc'), tx.pure.bool(true)],
		});

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(3);

		expect(results.pureValues.result?.[0].type).toBe('u64');
		expect(results.pureValues.result?.[0].value).toBe('42');

		expect(results.pureValues.result?.[1].type).toBe('address');
		expect(results.pureValues.result?.[1].value).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000abc',
		);

		expect(results.pureValues.result?.[2].type).toBe('bool');
		expect(results.pureValues.result?.[2].value).toBe(true);
	});

	it('should parse pure values from SplitCoins amounts', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		tx.splitCoins(tx.gas, [100, 200, 300]);

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(3);
		expect(results.pureValues.result?.[0].type).toBe('u64');
		expect(results.pureValues.result?.[0].value).toBe('100');
		expect(results.pureValues.result?.[1].type).toBe('u64');
		expect(results.pureValues.result?.[1].value).toBe('200');
		expect(results.pureValues.result?.[2].type).toBe('u64');
		expect(results.pureValues.result?.[2].value).toBe('300');
	});

	it('should parse pure values from TransferObjects address', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID);
		tx.transferObjects([coin], tx.pure.address('0x456'));

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(1);
		expect(results.pureValues.result?.[0].type).toBe('address');
		expect(results.pureValues.result?.[0].value).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000456',
		);
	});

	it('should parse vector<u8> pure values', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Uses 0x999::test::complex_transfer which has params:
		// (vector<Coin<T>> &mut, u64, address, bool, vector<u8>)
		const coin = tx.object(TEST_COIN_1_ID);
		const coinVec = tx.makeMoveVec({ elements: [coin] });
		tx.moveCall({
			target: '0x999::test::complex_transfer',
			arguments: [
				coinVec,
				tx.pure.u64(100n),
				tx.pure.address('0x1'),
				tx.pure.bool(false),
				tx.pure('vector<u8>', [1, 2, 3]),
			],
		});

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(4);

		const u64Val = results.pureValues.result?.find((v) => v.type === 'u64');
		expect(u64Val?.value).toBe('100');

		const addrVal = results.pureValues.result?.find((v) => v.type === 'address');
		expect(addrVal?.value).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000001',
		);

		const boolVal = results.pureValues.result?.find((v) => v.type === 'bool');
		expect(boolVal?.value).toBe(false);

		const vecVal = results.pureValues.result?.find((v) => v.type === 'vector<u8>');
		expect(vecVal?.value).toEqual([1, 2, 3]);
	});

	it('should handle mixed commands with multiple pure values', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// SplitCoins with pure u64
		const splitResult = tx.splitCoins(tx.gas, [500]);

		// TransferObjects with pure address
		tx.transferObjects([splitResult], tx.pure.address('0x789'));

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(2);

		const u64Val = results.pureValues.result?.find((v) => v.type === 'u64');
		expect(u64Val?.value).toBe('500');

		const addrVal = results.pureValues.result?.find((v) => v.type === 'address');
		expect(addrVal?.value).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000789',
		);
	});

	it('should return null type and value for unresolvable pure inputs', async () => {
		const client = new MockSuiClient();

		// Register a function with a datatype parameter that isn't a known pure type
		client.addMoveFunction({
			packageId: '0x999',
			moduleName: 'test',
			name: 'take_struct',
			visibility: 'public',
			isEntry: false,
			parameters: [
				{
					reference: null,
					body: {
						$kind: 'datatype',
						datatype: { typeName: '0x999::test::MyStruct', typeParameters: [] },
					},
				},
			],
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Pass a raw pure value to a function expecting a custom struct
		tx.moveCall({
			target: '0x999::test::take_struct',
			arguments: [tx.pure('u8', 42)],
		});

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(1);
		expect(results.pureValues.result?.[0].type).toBeNull();
		expect(results.pureValues.result?.[0].value).toBeNull();
	});

	it('should handle string pure values via 0x1::string::String', async () => {
		const client = new MockSuiClient();

		client.addMoveFunction({
			packageId: '0x999',
			moduleName: 'test',
			name: 'take_string',
			visibility: 'public',
			isEntry: false,
			parameters: [
				{
					reference: null,
					body: {
						$kind: 'datatype',
						datatype: { typeName: '0x1::string::String', typeParameters: [] },
					},
				},
			],
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		tx.moveCall({
			target: '0x999::test::take_string',
			arguments: [tx.pure.string('hello world')],
		});

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(1);
		expect(results.pureValues.result?.[0].type).toBe('string');
		expect(results.pureValues.result?.[0].value).toBe('hello world');
	});

	it('should handle 0x2::object::ID pure values', async () => {
		const client = new MockSuiClient();

		client.addMoveFunction({
			packageId: '0x999',
			moduleName: 'test',
			name: 'take_id',
			visibility: 'public',
			isEntry: false,
			parameters: [
				{
					reference: null,
					body: {
						$kind: 'datatype',
						datatype: { typeName: '0x2::object::ID', typeParameters: [] },
					},
				},
			],
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		tx.moveCall({
			target: '0x999::test::take_id',
			arguments: [tx.pure.id('0xdeadbeef')],
		});

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(1);
		expect(results.pureValues.result?.[0].type).toBe('id');
		expect(results.pureValues.result?.[0].value).toBe(
			'0x00000000000000000000000000000000000000000000000000000000deadbeef',
		);
	});

	it('should handle option<T> pure values', async () => {
		const client = new MockSuiClient();

		client.addMoveFunction({
			packageId: '0x999',
			moduleName: 'test',
			name: 'take_option',
			visibility: 'public',
			isEntry: false,
			parameters: [
				{
					reference: null,
					body: {
						$kind: 'datatype',
						datatype: {
							typeName: '0x1::option::Option',
							typeParameters: [{ $kind: 'u64' }],
						},
					},
				},
			],
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		tx.moveCall({
			target: '0x999::test::take_option',
			arguments: [tx.pure('option<u64>', 123n)],
		});

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(1);
		expect(results.pureValues.result?.[0].type).toBe('option<u64>');
		expect(results.pureValues.result?.[0].value).toBe('123');
	});

	it('should not include duplicate entries when a pure input is used in multiple commands', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Split using the same amount for two separate splits
		const amount = tx.pure.u64(100n);
		tx.splitCoins(tx.gas, [amount]);
		tx.splitCoins(tx.gas, [amount]);

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		// Should only appear once despite being used in two commands
		expect(results.pureValues.result).toHaveLength(1);
		expect(results.pureValues.result?.[0].type).toBe('u64');
		expect(results.pureValues.result?.[0].value).toBe('100');
	});

	it('should return empty result for transaction with no pure inputs', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Only object operations, no pure inputs
		const coin1 = tx.object(TEST_COIN_1_ID);
		tx.mergeCoins(tx.gas, [coin1]);

		const results = await analyze(
			{ pureValues },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.pureValues.result).toHaveLength(0);
	});
});
