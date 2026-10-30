// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import { addressAliasCalls } from '../../src/transaction-analyzer/rules/address-alias.js';
import { DEFAULT_SENDER, TEST_PACKAGE_ID } from '../mocks/mockData.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';

const ALIASES_ID = '0x0000000000000000000000000000000000000000000000000000000000000a11';
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000bad';

function resolvedTransaction() {
	const tx = new Transaction();
	tx.setSender(DEFAULT_SENDER);
	tx.setGasBudget(2_000_000n);
	tx.setGasPrice(1000n);
	tx.setGasPayment([]);
	return tx;
}

function aliasesRef(tx: Transaction) {
	return tx.objectRef({
		objectId: ALIASES_ID,
		version: '1',
		digest: '11111111111111111111111111111111',
	});
}

describe('TransactionAnalyzer - addressAliasCalls', () => {
	it('returns no calls for a transaction without address alias calls', async () => {
		const client = new MockSuiClient();
		const tx = resolvedTransaction();
		tx.moveCall({ target: `${TEST_PACKAGE_ID}::test::transfer`, arguments: [] });

		const results = await analyze(
			{ addressAliasCalls },
			{ client, transaction: await tx.toJSON() },
		);

		expect(results.addressAliasCalls.result).toEqual([]);
	});

	it('finds every 0x2::address_alias call, with short and long framework addresses', async () => {
		const client = new MockSuiClient();
		const tx = resolvedTransaction();
		tx.moveCall({
			target: '0x2::address_alias::enable',
			arguments: [
				tx.sharedObjectRef({ objectId: '0xa', initialSharedVersion: '1', mutable: true }),
			],
		});
		tx.moveCall({ target: `${TEST_PACKAGE_ID}::test::transfer`, arguments: [] });
		tx.moveCall({
			target:
				'0x0000000000000000000000000000000000000000000000000000000000000002::address_alias::add',
			arguments: [aliasesRef(tx), tx.pure.address(OTHER_ADDRESS)],
		});
		tx.moveCall({
			target: '0x2::address_alias::replace_all',
			arguments: [aliasesRef(tx), tx.pure.vector('address', [OTHER_ADDRESS])],
		});
		tx.moveCall({
			target: '0x2::address_alias::remove',
			arguments: [aliasesRef(tx), tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze(
			{ addressAliasCalls },
			{ client, transaction: await tx.toJSON() },
		);

		expect(results.addressAliasCalls.result).toEqual([
			{ index: 0, function: 'enable' },
			{ index: 2, function: 'add' },
			{ index: 3, function: 'replace_all' },
			{ index: 4, function: 'remove' },
		]);
	});

	it('ignores address_alias modules in other packages', async () => {
		const client = new MockSuiClient();
		const tx = resolvedTransaction();
		tx.moveCall({ target: `${TEST_PACKAGE_ID}::address_alias::add`, arguments: [] });

		const results = await analyze(
			{ addressAliasCalls },
			{ client, transaction: await tx.toJSON() },
		);

		expect(results.addressAliasCalls.result).toEqual([]);
	});
});
