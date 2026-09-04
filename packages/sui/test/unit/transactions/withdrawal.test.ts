// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { Transaction } from '../../../src/transactions/Transaction.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/index.js';

const SUI = '0x2::sui::SUI';
const FUNDER = normalizeSuiAddress('0xf00d');
const ALLOWANCE = normalizeSuiAddress('0xa110');
const SPENDER = normalizeSuiAddress('0x5e11');

describe('tx.withdrawal()', () => {
	it('defaults to withdrawing from the sender', () => {
		const tx = new Transaction();
		tx.withdrawal({ amount: 100n });

		expect(tx.getData().inputs[0]).toEqual({
			$kind: 'FundsWithdrawal',
			FundsWithdrawal: {
				reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '100' },
				typeArg: { $kind: 'Balance', Balance: SUI },
				withdrawFrom: { $kind: 'Sender', Sender: true },
			},
		});
	});

	it('creates a SenderAllowance withdrawal with normalized addresses', () => {
		const tx = new Transaction();
		tx.withdrawal({
			amount: 100n,
			withdrawFrom: {
				$kind: 'SenderAllowance',
				SenderAllowance: { funder: '0xf00d', allowance: '0xa110' },
			},
		});

		expect(tx.getData().inputs[0]).toEqual({
			$kind: 'FundsWithdrawal',
			FundsWithdrawal: {
				reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '100' },
				typeArg: { $kind: 'Balance', Balance: SUI },
				withdrawFrom: {
					$kind: 'SenderAllowance',
					SenderAllowance: { funder: FUNDER, allowance: ALLOWANCE },
				},
			},
		});
	});

	it('round-trips a SenderAllowance withdrawal through JSON and BCS', async () => {
		const tx = new Transaction();
		tx.setSender(SPENDER);
		const withdrawal = tx.withdrawal({
			amount: 100n,
			withdrawFrom: {
				$kind: 'SenderAllowance',
				SenderAllowance: { funder: FUNDER, allowance: ALLOWANCE },
			},
		});
		const balance = tx.moveCall({
			target: '0x2::allowance::balance_spend',
			typeArguments: [SUI],
			arguments: [
				tx.sharedObjectRef({ objectId: ALLOWANCE, initialSharedVersion: 5, mutable: true }),
				withdrawal,
				tx.object.clock(),
			],
		});
		tx.transferObjects([balance], SPENDER);

		const restored = Transaction.from(await tx.toJSON());
		expect(restored.getData().inputs[0]).toEqual(tx.getData().inputs[0]);

		const bytes = await tx.build({ onlyTransactionKind: true });
		const kind = bcs.TransactionKind.parse(bytes);
		expect(kind.ProgrammableTransaction?.inputs[0]).toEqual({
			$kind: 'FundsWithdrawal',
			FundsWithdrawal: {
				reservation: { $kind: 'MaxAmountU64', MaxAmountU64: '100' },
				typeArg: { $kind: 'Balance', Balance: normalizeStructTag(SUI) },
				withdrawFrom: {
					$kind: 'SenderAllowance',
					SenderAllowance: { funder: FUNDER, allowance: ALLOWANCE },
				},
			},
		});
	});
});

describe('bcs.CallArg', () => {
	it('serializes SenderAllowance as WithdrawFrom variant 2', () => {
		const callArg = {
			FundsWithdrawal: {
				reservation: { MaxAmountU64: '100' },
				typeArg: { Balance: SUI },
				withdrawFrom: { SenderAllowance: { funder: FUNDER, allowance: ALLOWANCE } },
			},
		};
		const bytes = bcs.CallArg.serialize(callArg).toBytes();

		// WithdrawFrom is the last field: variant index, then two 32-byte addresses.
		const withdrawFrom = bytes.slice(-65);
		expect(withdrawFrom[0]).toBe(2);
		expect(bcs.Address.parse(withdrawFrom.slice(1, 33))).toBe(FUNDER);
		expect(bcs.Address.parse(withdrawFrom.slice(33))).toBe(ALLOWANCE);
		expect(bcs.CallArg.parse(bytes).FundsWithdrawal?.withdrawFrom).toEqual({
			$kind: 'SenderAllowance',
			SenderAllowance: { funder: FUNDER, allowance: ALLOWANCE },
		});
	});
});
