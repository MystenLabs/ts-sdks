// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { Transaction } from '../../../src/transactions/Transaction.js';
import { coinWithBalance } from '../../../src/transactions/intents/CoinWithBalance.js';
import { normalizeSuiAddress, normalizeStructTag } from '../../../src/utils/index.js';

describe('coinWithBalance with forceAddressBalance', () => {
	it('includes forceAddressBalance flag in intent data', async () => {
		const tx = new Transaction();
		tx.setSender('0x123');

		tx.transferObjects(
			[coinWithBalance({ balance: 1_000_000n, forceAddressBalance: true })],
			'0x456',
		);

		const json = JSON.parse(
			await tx.toJSON({
				supportedIntents: ['CoinWithBalance'],
			}),
		);

		expect(json.commands[0]).toEqual({
			$Intent: {
				name: 'CoinWithBalance',
				inputs: {},
				data: {
					balance: '1000000',
					type: normalizeStructTag('0x2::sui::SUI'),
					forceAddressBalance: true,
				},
			},
		});
	});

	it('resolves to FundsWithdrawal without a client when forceAddressBalance is true', async () => {
		const tx = new Transaction();
		tx.setSender('0x123');

		tx.transferObjects(
			[coinWithBalance({ balance: 1_000_000n, forceAddressBalance: true })],
			'0x456',
		);

		// Should resolve without a client since forceAddressBalance skips network lookups
		const json = JSON.parse(
			await tx.toJSON({
				supportedIntents: [],
			}),
		);

		expect(json.inputs).toEqual([
			{
				Pure: {
					bytes: expect.any(String),
				},
			},
			{
				FundsWithdrawal: {
					reservation: {
						$kind: 'MaxAmountU64',
						MaxAmountU64: '1000000',
					},
					typeArg: {
						$kind: 'Balance',
						Balance: normalizeStructTag('0x2::sui::SUI'),
					},
					withdrawFrom: {
						$kind: 'Sender',
						Sender: true,
					},
				},
			},
		]);

		expect(json.commands).toEqual([
			{
				MoveCall: {
					package: normalizeSuiAddress('0x2'),
					module: 'coin',
					function: 'redeem_funds',
					typeArguments: [normalizeStructTag('0x2::sui::SUI')],
					arguments: [{ Input: 1 }],
				},
			},
			{
				TransferObjects: {
					objects: [{ NestedResult: [0, 0] }],
					address: { Input: 0 },
				},
			},
		]);
	});

	it('resolves custom coin type to FundsWithdrawal without a client', async () => {
		const customType = normalizeStructTag('0xabc::token::TOKEN');
		const tx = new Transaction();
		tx.setSender('0x123');

		tx.transferObjects(
			[coinWithBalance({ balance: 500n, type: customType, forceAddressBalance: true })],
			'0x456',
		);

		const json = JSON.parse(
			await tx.toJSON({
				supportedIntents: [],
			}),
		);

		expect(json.inputs[1]).toEqual({
			FundsWithdrawal: {
				reservation: {
					$kind: 'MaxAmountU64',
					MaxAmountU64: '500',
				},
				typeArg: {
					$kind: 'Balance',
					Balance: customType,
				},
				withdrawFrom: {
					$kind: 'Sender',
					Sender: true,
				},
			},
		});

		expect(json.commands[0]).toEqual({
			MoveCall: {
				package: normalizeSuiAddress('0x2'),
				module: 'coin',
				function: 'redeem_funds',
				typeArguments: [customType],
				arguments: [{ Input: 1 }],
			},
		});
	});

	it('resolves multiple forceAddressBalance intents without a client', async () => {
		const tx = new Transaction();
		tx.setSender('0x123');

		tx.transferObjects(
			[
				coinWithBalance({ balance: 100n, forceAddressBalance: true }),
				coinWithBalance({ balance: 200n, forceAddressBalance: true }),
			],
			'0x456',
		);

		const json = JSON.parse(
			await tx.toJSON({
				supportedIntents: [],
			}),
		);

		// Should have address input + 2 FundsWithdrawal inputs
		expect(json.inputs).toHaveLength(3);
		expect(json.inputs[1].FundsWithdrawal.reservation.MaxAmountU64).toBe('100');
		expect(json.inputs[2].FundsWithdrawal.reservation.MaxAmountU64).toBe('200');

		// Should have 2 redeem_funds calls + 1 TransferObjects
		expect(json.commands).toHaveLength(3);
		expect(json.commands[0].MoveCall.function).toBe('redeem_funds');
		expect(json.commands[1].MoveCall.function).toBe('redeem_funds');
		expect(json.commands[2].TransferObjects).toBeDefined();
	});

	it('resolves zero balance with forceAddressBalance to coin::zero', async () => {
		const tx = new Transaction();
		tx.setSender('0x123');

		tx.transferObjects([coinWithBalance({ balance: 0n, forceAddressBalance: true })], '0x456');

		const json = JSON.parse(
			await tx.toJSON({
				supportedIntents: [],
			}),
		);

		expect(json.commands[0]).toEqual({
			MoveCall: {
				package: normalizeSuiAddress('0x2'),
				module: 'coin',
				function: 'zero',
				typeArguments: [normalizeStructTag('0x2::sui::SUI')],
				arguments: [],
			},
		});
	});

	it('throws when forceAddressBalance is false and no client is provided', async () => {
		const tx = new Transaction();
		tx.setSender('0x123');

		tx.transferObjects([coinWithBalance({ balance: 1_000n })], '0x456');

		await expect(
			tx.toJSON({
				supportedIntents: [],
			}),
		).rejects.toThrow('Client must be provided');
	});
});
