// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import type { RestrictedMoveCallsOptions } from '../../src/transaction-analyzer/rules/restricted-move-calls.js';
import { restrictedMoveCalls } from '../../src/transaction-analyzer/rules/restricted-move-calls.js';
import { DEFAULT_SENDER } from '../mocks/mockData.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';

const SUI = normalizeSuiAddress('0x2');
const BAD = normalizeSuiAddress('0xbad');

function transactionWith(targets: string[]) {
	const tx = new Transaction();
	tx.setSender(DEFAULT_SENDER);
	tx.setGasBudget(2_000_000n);
	tx.setGasPrice(1000n);
	tx.setGasPayment([]);
	for (const target of targets) {
		tx.moveCall({ target });
	}
	return tx.toJSON({ restrictedMoveCalls: [] });
}

describe('restrictedMoveCalls', () => {
	it('reports address alias calls by default, without failing the analysis', async () => {
		const results = await analyze(
			{ restricted: restrictedMoveCalls() },
			{
				client: new MockSuiClient(),
				transaction: await transactionWith(['0x2::coin::zero', '0x2::address_alias::add']),
			},
		);

		expect(results.restricted).toEqual({
			status: 'success',
			result: [{ index: 1, target: `${SUI}::address_alias::add`, matchedBy: '0x2::address_alias' }],
		});
	});

	it('throws at creation on a malformed entry', () => {
		expect(() => restrictedMoveCalls({ restrictedMoveCalls: ['0x2::coin::zero::x'] })).toThrow(
			'Invalid restrictedMoveCalls entry',
		);
	});

	it('throws at creation on options from earlier releases', () => {
		expect(() =>
			restrictedMoveCalls({ targets: {} } as unknown as RestrictedMoveCallsOptions),
		).toThrow('Unexpected restrictedMoveCalls option "targets"');
	});

	it('runs several lists in the same analysis', async () => {
		const results = await analyze(
			{
				blockedMoveCalls: restrictedMoveCalls(),
				warnMoveCalls: restrictedMoveCalls({ restrictedMoveCalls: ['0xbad'] }),
			},
			{
				client: new MockSuiClient(),
				transaction: await transactionWith(['0x2::address_alias::add', `${BAD}::drain::all`]),
			},
		);

		expect(results.blockedMoveCalls.result?.map((call) => call.index)).toEqual([0]);
		expect(results.warnMoveCalls.result?.map((call) => call.index)).toEqual([1]);
	});
});
