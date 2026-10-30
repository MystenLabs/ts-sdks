// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { analyze, createAnalyzer } from '../../src/transaction-analyzer/analyzer.js';
import { addressAliasChanges } from '../../src/transaction-analyzer/rules/address-alias.js';
import { data } from '../../src/transaction-analyzer/rules/core.js';
import { defaultRules } from '../../src/transaction-analyzer/rules/defaults.js';
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

async function aliasAddTransaction() {
	const tx = resolvedTransaction();
	tx.moveCall({
		target: '0x2::address_alias::add',
		arguments: [aliasesRef(tx), tx.pure.address(OTHER_ADDRESS)],
	});
	return tx.toJSON();
}

const ADD_ISSUE = {
	message:
		'Command 0 calls 0x2::address_alias::add, which changes which addresses can sign for this account',
};

describe('TransactionAnalyzer - addressAliasChanges', () => {
	it('succeeds with no changes for a transaction without address alias calls', async () => {
		const client = new MockSuiClient();
		const tx = resolvedTransaction();
		tx.moveCall({ target: `${TEST_PACKAGE_ID}::test::transfer`, arguments: [] });

		const results = await analyze(
			{ addressAliasChanges },
			{ client, transaction: await tx.toJSON() },
		);

		expect(results.status).toBe('complete');
		expect(results.addressAliasChanges).toEqual({ status: 'success', result: [] });
	});

	it('adds an issue for every 0x2::address_alias call', async () => {
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
			{ addressAliasChanges },
			{ client, transaction: await tx.toJSON() },
		);

		expect(results.status).toBe('partial');
		expect(results.addressAliasChanges.status).toBe('partial');
		expect(results.addressAliasChanges.result).toEqual([
			{ index: 0, function: 'enable' },
			{ index: 2, function: 'add' },
			{ index: 3, function: 'replace_all' },
			{ index: 4, function: 'remove' },
		]);
		expect(results.addressAliasChanges.issues?.map((issue) => issue.message)).toEqual([
			expect.stringContaining('Command 0 calls 0x2::address_alias::enable'),
			expect.stringContaining('Command 2 calls 0x2::address_alias::add'),
			expect.stringContaining('Command 3 calls 0x2::address_alias::replace_all'),
			expect.stringContaining('Command 4 calls 0x2::address_alias::remove'),
		]);
	});

	it('ignores address_alias modules in other packages', async () => {
		const client = new MockSuiClient();
		const tx = resolvedTransaction();
		tx.moveCall({ target: `${TEST_PACKAGE_ID}::address_alias::add`, arguments: [] });

		const results = await analyze(
			{ addressAliasChanges },
			{ client, transaction: await tx.toJSON() },
		);

		expect(results.addressAliasChanges).toEqual({ status: 'success', result: [] });
	});

	it('reports no issue with allowAddressAliasChanges', async () => {
		const client = new MockSuiClient();

		const results = await analyze(
			{ addressAliasChanges },
			{ client, transaction: await aliasAddTransaction(), allowAddressAliasChanges: true },
		);

		expect(results.status).toBe('complete');
		expect(results.addressAliasChanges).toEqual({
			status: 'success',
			result: [{ index: 0, function: 'add' }],
		});
	});
});

describe('TransactionAnalyzer - defaultRules', () => {
	it('passes its issues on to analyzers that depend on it', async () => {
		const client = new MockSuiClient();
		const dependent = createAnalyzer({
			dependencies: { defaultRules, data },
			analyze:
				() =>
				({ data }) => ({ result: data.commands.length }),
		});

		const results = await analyze(
			{ dependent },
			{ client, transaction: await aliasAddTransaction() },
		);

		expect(results.status).toBe('partial');
		expect(results.dependent).toEqual({
			status: 'partial',
			result: 1,
			issues: [ADD_ISSUE],
			ownIssues: [],
		});
		expect(results.issues).toEqual([ADD_ISSUE]);
	});

	it('succeeds for a transaction that passes every rule', async () => {
		const client = new MockSuiClient();
		const tx = resolvedTransaction();
		tx.moveCall({ target: `${TEST_PACKAGE_ID}::test::transfer`, arguments: [] });

		const results = await analyze({ defaultRules }, { client, transaction: await tx.toJSON() });

		expect(results.defaultRules).toEqual({ status: 'success', result: null });
	});
});
