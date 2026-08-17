// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';

import { AccountContract } from '../src/account.js';

const PKG = '0x' + '11'.repeat(32);
const REGISTRY = '0x' + '22'.repeat(32);
const OWNER = '0x' + 'ab'.repeat(32);
const COIN_TYPE = '0x2::sui::SUI';

const account = new AccountContract({ accountPackageId: PKG, accountRegistry: REGISTRY });

// The move-call targets, in the order the builder emitted them.
function targets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall
				? [`${c.MoveCall.package}::${c.MoveCall.module}::${c.MoveCall.function}`]
				: [],
		);
}

function call(tx: Transaction, cmdIdx: number) {
	return tx.getData().commands[cmdIdx].MoveCall!;
}

// Resolve the object id an argument points at (undefined if not an object input).
function argObjectId(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	return 'UnresolvedObject' in input ? input.UnresolvedObject?.objectId : undefined;
}

describe('createAccount', () => {
	test('registry.new → share, against the configured registry', () => {
		const tx = new Transaction();
		tx.add(account.createAccount());
		expect(targets(tx)).toEqual([`${PKG}::account_registry::new`, `${PKG}::account::share`]);
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress(REGISTRY));
		// `share` consumes the wrapper handle `new` returned, not an input.
		expect(call(tx, 1).arguments[0]).toMatchObject({ $kind: 'Result', Result: 0 });
	});
});

describe('createAccountAndDeposit', () => {
	test('new → auth → deposit_funds → share (share LAST, once by-value use is over)', () => {
		const tx = new Transaction();
		const coin = tx.object('0xc0');
		tx.add(account.createAccountAndDeposit({ coin, coinType: COIN_TYPE }));
		expect(targets(tx)).toEqual([
			`${PKG}::account_registry::new`,
			`${PKG}::account::generate_auth`,
			`${PKG}::account::deposit_funds`,
			`${PKG}::account::share`,
		]);
		expect(call(tx, 2).typeArguments).toEqual([COIN_TYPE]);
		// deposit and share both address the wrapper created in-PTB (command 0's result).
		expect(call(tx, 2).arguments[0]).toMatchObject({ $kind: 'Result', Result: 0 });
		expect(call(tx, 3).arguments[0]).toMatchObject({ $kind: 'Result', Result: 0 });
	});
});

describe('depositFunds', () => {
	test('auth → deposit_funds<T>, wrapper + accumulator root in their slots', () => {
		const tx = new Transaction();
		const coin = tx.object('0xc0');
		tx.add(account.depositFunds({ wrapperId: '0x123', coin, coinType: COIN_TYPE }));
		expect(targets(tx)).toEqual([
			`${PKG}::account::generate_auth`,
			`${PKG}::account::deposit_funds`,
		]);
		expect(call(tx, 1).typeArguments).toEqual([COIN_TYPE]);
		expect(argObjectId(tx, 1, 0)).toBe(normalizeSuiAddress('0x123'));
		// auth is the hot potato from command 0, consumed here.
		expect(call(tx, 1).arguments[1]).toMatchObject({ $kind: 'Result', Result: 0 });
		// the AccumulatorRoot is auto-injected by the generated move-call layer
		expect(argObjectId(tx, 1, 3)).toBe(normalizeSuiAddress('0xacc'));
	});
});

describe('withdrawFunds', () => {
	test('auth → withdraw_funds<T> with the raw amount, returning the coin', () => {
		const tx = new Transaction();
		const coin = tx.add(
			account.withdrawFunds({ wrapperId: '0x123', amount: 5_000_000n, coinType: COIN_TYPE }),
		);
		expect(targets(tx)).toEqual([
			`${PKG}::account::generate_auth`,
			`${PKG}::account::withdraw_funds`,
		]);
		expect(call(tx, 1).typeArguments).toEqual([COIN_TYPE]);
		expect(argObjectId(tx, 1, 0)).toBe(normalizeSuiAddress('0x123'));
		// the AccumulatorRoot is auto-injected by the generated move-call layer
		expect(argObjectId(tx, 1, 3)).toBe(normalizeSuiAddress('0xacc'));
		// the builder hands back withdraw_funds' result for the caller to compose
		expect(coin).toBeDefined();
	});
});

describe('reads', () => {
	test('loadAccount targets load_account against the wrapper', () => {
		const tx = new Transaction();
		tx.add(account.loadAccount({ wrapperId: '0x123' }));
		expect(targets(tx)).toEqual([`${PKG}::account::load_account`]);
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress('0x123'));
	});

	test('balance chains load_account → balance<T> on the derived wrapper', () => {
		const tx = new Transaction();
		tx.add(account.balance({ owner: OWNER, coinType: COIN_TYPE }));
		expect(targets(tx)).toEqual([`${PKG}::account::load_account`, `${PKG}::account::balance`]);
		expect(argObjectId(tx, 0, 0)).toBe(normalizeSuiAddress(account.deriveAccountWrapperId(OWNER)));
		expect(call(tx, 1).typeArguments).toEqual([COIN_TYPE]);
		// balance reads the Account handle load_account returned
		expect(call(tx, 1).arguments[0]).toMatchObject({ $kind: 'Result', Result: 0 });
	});
});

describe('deriveAccountWrapperId', () => {
	test('deterministic, well-formed, and owner-specific', () => {
		const a = account.deriveAccountWrapperId(OWNER);
		expect(a).toMatch(/^0x[0-9a-f]{64}$/);
		expect(account.deriveAccountWrapperId(OWNER)).toBe(a);
		expect(account.deriveAccountWrapperId('0x' + 'cd'.repeat(32))).not.toBe(a);
	});

	test('registry-specific: the same owner derives differently under another registry', () => {
		const other = new AccountContract({
			accountPackageId: PKG,
			accountRegistry: '0x' + '33'.repeat(32),
		});
		expect(other.deriveAccountWrapperId(OWNER)).not.toBe(account.deriveAccountWrapperId(OWNER));
	});
});
