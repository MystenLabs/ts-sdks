// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import type { ValidationIssue, Validator } from '../src/validation.js';
import {
	allowedFunctions,
	allowedPackages,
	boundedExpiration,
	defaults,
	gasBudget,
	gasCoinNotUsed,
	onlyAddressBalanceGas,
	simulationSucceeds,
	onlySenderWithdrawals,
	validSender,
} from '../src/validators.js';

function dataFor(buildTx: (tx: Transaction) => void) {
	const tx = new Transaction();
	buildTx(tx);
	return tx.getData();
}

/**
 * Run a validator (an analyzer) directly with a stubbed analysis — the resolved,
 * unwrapped values keyed by the analyzer name it depends on.
 */
async function run(
	validator: Validator,
	analysis: Record<string, unknown>,
): Promise<ValidationIssue[]> {
	const output = await validator.analyze(
		{ client: {} as ClientWithCoreApi },
		new Transaction(),
	)(analysis);
	return 'result' in output && output.result ? output.result : [];
}

describe('defaults', () => {
	it('bundles the baseline validators', () => {
		expect(defaults()).toHaveLength(6);
	});
});

describe('onlySenderWithdrawals', () => {
	it('rejects an input that withdraws from the sponsor balance', async () => {
		const data = {
			inputs: [
				{ $kind: 'FundsWithdrawal', FundsWithdrawal: { withdrawFrom: { $kind: 'Sponsor' } } },
			],
		};
		expect((await run(onlySenderWithdrawals(), { data })).map((i) => i.code)).toEqual([
			'NON_SENDER_WITHDRAWAL',
		]);
	});

	it('allows a withdrawal from the sender', async () => {
		const data = {
			inputs: [
				{ $kind: 'FundsWithdrawal', FundsWithdrawal: { withdrawFrom: { $kind: 'Sender' } } },
			],
		};
		expect(await run(onlySenderWithdrawals(), { data })).toEqual([]);
	});

	it('allows a transaction with no withdrawal inputs', async () => {
		const data = dataFor((tx) =>
			tx.moveCall({ target: '0x2::foo::bar', arguments: [tx.pure.u64(1n)] }),
		);
		expect(await run(onlySenderWithdrawals(), { data })).toEqual([]);
	});
});

describe('validSender', () => {
	it('rejects when the sender is unset', async () => {
		const data = dataFor((tx) => tx.setGasOwner(normalizeSuiAddress('0x5')));
		expect((await run(validSender(), { data })).map((i) => i.code)).toEqual(['SENDER_UNSET']);
	});

	it('rejects when the sender is the gas owner (sponsor)', async () => {
		const data = dataFor((tx) => {
			tx.setSender(normalizeSuiAddress('0x5'));
			tx.setGasOwner(normalizeSuiAddress('0x5'));
		});
		expect((await run(validSender(), { data })).map((i) => i.code)).toEqual(['SENDER_IS_SPONSOR']);
	});

	it('allows a distinct sender and sponsor', async () => {
		const data = dataFor((tx) => {
			tx.setSender(normalizeSuiAddress('0xa'));
			tx.setGasOwner(normalizeSuiAddress('0xb'));
		});
		expect(await run(validSender(), { data })).toEqual([]);
	});

	it('reads only `data`', () => {
		expect(Object.keys(validSender().dependencies)).toEqual(['data']);
	});
});

describe('onlyAddressBalanceGas', () => {
	it('allows an empty gas payment (address-balance gas)', async () => {
		const data = dataFor((tx) => tx.setGasPayment([]));
		expect(await run(onlyAddressBalanceGas(), { data })).toEqual([]);
	});

	it('rejects an unset gas payment', async () => {
		expect(
			(await run(onlyAddressBalanceGas(), { data: { gasData: { payment: null } } })).map(
				(i) => i.code,
			),
		).toEqual(['GAS_PAYMENT_UNSET']);
	});

	it('rejects a non-empty gas payment (nominated gas coins)', async () => {
		const data = {
			gasData: { payment: [{ objectId: '0x1', version: '1', digest: 'abc' }] },
		};
		expect((await run(onlyAddressBalanceGas(), { data })).map((i) => i.code)).toEqual([
			'GAS_PAYMENT_NOT_EMPTY',
		]);
	});
});

describe('gasCoinNotUsed', () => {
	it('rejects a transaction that uses the gas coin', async () => {
		const data = dataFor((tx) => tx.splitCoins(tx.gas, [1]));
		expect((await run(gasCoinNotUsed(), { data })).map((i) => i.code)).toEqual(['GAS_COIN_USED']);
	});

	it('allows a transaction that does not touch the gas coin', async () => {
		const data = dataFor((tx) =>
			tx.moveCall({ target: '0x2::foo::bar', arguments: [tx.pure.u64(1n)] }),
		);
		expect(await run(gasCoinNotUsed(), { data })).toEqual([]);
	});
});

describe('gasBudget', () => {
	const data = dataFor((tx) => tx.setGasBudget(100n));

	it('rejects budgets above max', async () => {
		expect((await run(gasBudget({ max: 50n }), { data })).map((i) => i.code)).toEqual([
			'GAS_BUDGET_TOO_HIGH',
		]);
	});

	it('rejects budgets below min', async () => {
		expect((await run(gasBudget({ min: 200n }), { data })).map((i) => i.code)).toEqual([
			'GAS_BUDGET_TOO_LOW',
		]);
	});

	it('accepts budgets within range', async () => {
		expect(await run(gasBudget({ min: 10n, max: 1000n }), { data })).toEqual([]);
	});

	it('rejects when the budget is unset', async () => {
		const unset = dataFor(() => {});
		expect((await run(gasBudget({ max: 1000n }), { data: unset })).map((i) => i.code)).toEqual([
			'GAS_BUDGET_UNSET',
		]);
	});
});

describe('allowedPackages / allowedFunctions', () => {
	const data = dataFor((tx) =>
		tx.moveCall({ target: '0x2::coin::transfer', arguments: [tx.pure.u64(1n)] }),
	);

	it('allows a package on the list (short/long form agnostic)', async () => {
		expect(await run(allowedPackages(['0x2']), { data })).toEqual([]);
	});

	it('rejects a package not on the list', async () => {
		expect((await run(allowedPackages(['0x3']), { data })).map((i) => i.code)).toEqual([
			'PACKAGE_NOT_ALLOWED',
		]);
	});

	it('allows an exact function target', async () => {
		expect(await run(allowedFunctions(['0x2::coin::transfer']), { data })).toEqual([]);
	});

	it('rejects a function not on the list', async () => {
		expect((await run(allowedFunctions(['0x2::coin::mint']), { data })).map((i) => i.code)).toEqual(
			['FUNCTION_NOT_ALLOWED'],
		);
	});
});

describe('simulationSucceeds', () => {
	it('passes when the dry-run succeeds', async () => {
		const transactionResponse = { effects: { status: { success: true, error: null } } };
		expect(await run(simulationSucceeds(), { transactionResponse })).toEqual([]);
	});

	it('rejects a simulated transaction that would abort (the dry-run succeeded)', async () => {
		const transactionResponse = {
			effects: {
				status: { success: false, error: { $kind: 'MoveAbort', message: 'aborted at 0x2' } },
			},
		};
		const issues = await run(simulationSucceeds(), { transactionResponse });
		expect(issues.map((i) => i.code)).toEqual(['TRANSACTION_WOULD_FAIL']);
		// The structured ExecutionError detail is surfaced, not a generic message.
		expect(issues[0].message).toContain('MoveAbort');
		expect(issues[0].message).toContain('aborted at 0x2');
	});

	it('fails closed when the status is missing', async () => {
		const transactionResponse = { effects: {} };
		expect((await run(simulationSucceeds(), { transactionResponse })).map((i) => i.code)).toEqual([
			'SIMULATION_STATUS_MISSING',
		]);
	});

	it('depends on `transactionResponse` (so a sponsor without it never simulates)', () => {
		expect(Object.keys(simulationSucceeds().dependencies)).toEqual(['transactionResponse']);
	});
});

describe('boundedExpiration', () => {
	it('rejects when no expiration is set', async () => {
		const data = dataFor(() => {});
		expect(
			(await run(boundedExpiration(), { data, currentEpoch: 10n })).map((i) => i.code),
		).toEqual(['EXPIRATION_REQUIRED']);
	});

	it('accepts an expiration through the next epoch', async () => {
		const data = dataFor((tx) => tx.setExpiration({ Epoch: 11 }));
		expect(await run(boundedExpiration(), { data, currentEpoch: 10n })).toEqual([]);
	});

	it('rejects an expiration too far ahead', async () => {
		const data = dataFor((tx) => tx.setExpiration({ Epoch: 20 }));
		expect(
			(await run(boundedExpiration(), { data, currentEpoch: 10n })).map((i) => i.code),
		).toEqual(['EXPIRATION_TOO_LONG']);
	});
});
