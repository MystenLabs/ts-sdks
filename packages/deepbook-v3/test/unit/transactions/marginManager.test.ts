// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { MarginManagerContract } from '../../../src/transactions/marginManager.js';
import { DeepBookConfig } from '../../../src/utils/config.js';

const MARGIN_MANAGER_KEY = 'TEST_MGR';

function newContract() {
	const config = new DeepBookConfig({
		network: 'testnet',
		address: '0x1',
		marginManagers: {
			[MARGIN_MANAGER_KEY]: {
				address: '0x2222222222222222222222222222222222222222222222222222222222222222',
				poolKey: 'SUI_DBUSDC',
			},
		},
	});
	return new MarginManagerContract(config);
}

function lastMoveCall(tx: Transaction) {
	const { commands } = tx.getData();
	const last = commands[commands.length - 1];
	if (last.$kind !== 'MoveCall') throw new Error('expected last command to be MoveCall');
	return last.MoveCall;
}

function pureBytesForArg(tx: Transaction, arg: { $kind: string; Input?: number }) {
	if (arg.$kind !== 'Input' || arg.Input === undefined) {
		throw new Error(`expected pure Input argument, got ${JSON.stringify(arg)}`);
	}
	const input = tx.getData().inputs[arg.Input];
	if (input.$kind !== 'Pure') throw new Error('expected pure input');
	return fromBase64(input.Pure.bytes);
}

describe('MarginManagerContract.repayBase', () => {
	it('encodes Option::Some(0) when amount=0 (not None)', () => {
		const tx = new Transaction();
		newContract().repayBase(MARGIN_MANAGER_KEY, 0)(tx);
		const call = lastMoveCall(tx);
		expect(call.function).toBe('repay_base');
		const optionArg = call.arguments[3];
		const bytes = pureBytesForArg(tx, optionArg);
		const parsed = bcs.option(bcs.u64()).parse(bytes);
		expect(parsed).toBe('0');
	});

	it('encodes Option::Some(amount) when amount is a positive number', () => {
		const tx = new Transaction();
		newContract().repayBase(MARGIN_MANAGER_KEY, 1.5)(tx);
		const call = lastMoveCall(tx);
		const bytes = pureBytesForArg(tx, call.arguments[3]);
		// SUI base scalar is 1e9, so 1.5 -> 1_500_000_000
		expect(bcs.option(bcs.u64()).parse(bytes)).toBe('1500000000');
	});

	it('encodes Option::None when amount is omitted', () => {
		const tx = new Transaction();
		newContract().repayBase(MARGIN_MANAGER_KEY)(tx);
		const call = lastMoveCall(tx);
		const bytes = pureBytesForArg(tx, call.arguments[3]);
		expect(bcs.option(bcs.u64()).parse(bytes)).toBeNull();
	});
});

describe('MarginManagerContract.repayQuote', () => {
	it('encodes Option::Some(0) when amount=0 (not None)', () => {
		const tx = new Transaction();
		newContract().repayQuote(MARGIN_MANAGER_KEY, 0)(tx);
		const call = lastMoveCall(tx);
		expect(call.function).toBe('repay_quote');
		const bytes = pureBytesForArg(tx, call.arguments[3]);
		expect(bcs.option(bcs.u64()).parse(bytes)).toBe('0');
	});

	it('encodes Option::Some(amount) when amount is a positive number', () => {
		const tx = new Transaction();
		newContract().repayQuote(MARGIN_MANAGER_KEY, 2.5)(tx);
		const call = lastMoveCall(tx);
		const bytes = pureBytesForArg(tx, call.arguments[3]);
		// DBUSDC quote scalar is 1e6, so 2.5 -> 2_500_000
		expect(bcs.option(bcs.u64()).parse(bytes)).toBe('2500000');
	});

	it('encodes Option::None when amount is omitted', () => {
		const tx = new Transaction();
		newContract().repayQuote(MARGIN_MANAGER_KEY)(tx);
		const call = lastMoveCall(tx);
		const bytes = pureBytesForArg(tx, call.arguments[3]);
		expect(bcs.option(bcs.u64()).parse(bytes)).toBeNull();
	});
});
