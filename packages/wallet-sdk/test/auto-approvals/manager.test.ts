// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
	analyze,
	autoApprovalAnalyzer,
	AutoApprovalManager,
	AutoApprovalPolicy,
	operationType,
	type AutoApprovalAnalysis,
	type AutoApprovalResult,
} from '../../src/index.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { MIST_PER_SUI } from '@mysten/sui/utils';

const policy: AutoApprovalPolicy = {
	schemaVersion: '1.0.0',
	operations: [
		{
			id: 'test-operation',
			description: 'Test operation',
			permissions: {},
		},
	],
	suggestedSettings: {},
};

function managerWithSettings() {
	const manager = new AutoApprovalManager({
		policy: JSON.stringify(policy),
		state: null,
	});
	manager.updateSettings({
		approvedOperations: ['test-operation'],
		expiration: Date.now() + 1000 * 60 * 60,
		remainingTransactions: 1,
		sharedBudget: 10,
		coinBudgets: {},
	});
	return manager;
}

function autoApprovalAnalysis(): AutoApprovalAnalysis {
	return {
		operationType: 'test-operation',
		bytes: new Uint8Array([1, 2, 3]),
		coinFlows: { outflows: [] },
		coinValues: { total: 0, coinTypesWithoutPrice: [], coinTypes: [] },
		accessLevel: {},
		ownedObjects: [],
		digest: 'test-digest',
	};
}

describe('AutoApprovalManager', () => {
	test('checkTransaction reports partial analysis as analysis issues', () => {
		const manager = managerWithSettings();
		const analysis: AutoApprovalResult = {
			status: 'partial',
			result: autoApprovalAnalysis(),
			issues: [{ message: 'coin values unavailable' }],
			ownIssues: [{ message: 'coin values unavailable' }],
		};

		expect(manager.checkTransaction(analysis)).toEqual({
			matchesPolicy: false,
			canAutoApprove: false,
			analysisIssues: [{ message: 'coin values unavailable' }],
			policyIssues: [],
			settingsIssues: [],
		});
	});

	test('commitTransaction rejects partial analysis without mutating state', () => {
		const manager = managerWithSettings();
		const analysis: AutoApprovalResult = {
			status: 'partial',
			result: autoApprovalAnalysis(),
			issues: [{ message: 'coin values unavailable' }],
			ownIssues: [{ message: 'coin values unavailable' }],
		};

		expect(() => manager.commitTransaction(analysis)).toThrow('Transaction analysis failed');
		expect(manager.getSettings()?.remainingTransactions).toBe(1);
		expect(manager.getState().pendingDigests).toEqual([]);
	});

	test('applyTransactionEffects rejects partial analysis before mutating pending digests', () => {
		const manager = managerWithSettings();
		const analysis: AutoApprovalResult = {
			status: 'partial',
			result: autoApprovalAnalysis(),
			issues: [{ message: 'coin values unavailable' }],
			ownIssues: [{ message: 'coin values unavailable' }],
		};

		expect(() =>
			manager.applyTransactionEffects(analysis, {
				digest: 'test-digest',
				balanceChanges: [],
			} as unknown as Parameters<AutoApprovalManager['applyTransactionEffects']>[1]),
		).toThrow('Transaction analysis failed');
		expect(manager.getState().pendingDigests).toEqual([]);
	});

	test.skip('placeholder example', async () => {
		const keypair = new Ed25519Keypair();
		const client = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'https://fullnode.testnet.sui.io:443',
		});

		const tx = new Transaction();
		tx.add(operationType('test-operation'));
		const transactionJson = await tx.toJSON({ client });

		const { analysis } = await analyze(
			{
				analysis: autoApprovalAnalyzer,
			},
			{
				transaction: transactionJson,
				client,
				getCoinPrices: async (types) =>
					types.map((coinType) => ({ coinType, decimals: 9, price: 2.5 })),
			},
		);

		const manager = new AutoApprovalManager({
			policy: JSON.stringify(policy),
			state: null,
		});

		// the transaction matches the policy
		expect(manager.checkTransaction(analysis).matchesPolicy).toEqual(true);

		// policy has not been approved
		expect(manager.checkTransaction(analysis).canAutoApprove).toEqual(false);

		manager.updateSettings({
			approvedOperations: ['test-operation'],
			expiration: Date.now() + 1000 * 60 * 60,
			remainingTransactions: 10,
			usdBudget: 10,
			coinBudgets: {
				'sui:0x2::sui::SUI': String(10n * MIST_PER_SUI),
			},
			sharedBudget: null,
		});

		expect(manager.checkTransaction(analysis).canAutoApprove).toEqual(true);

		// deduct balances
		manager.commitTransaction(analysis);

		if (!analysis.result) {
			throw new Error('Transaction analysis failed');
		}

		const { signature } = await keypair.signTransaction(analysis.result.bytes);

		try {
			var result = await client.core.executeTransaction({
				transaction: analysis.result?.bytes,
				signatures: [signature],
				include: { balanceChanges: true },
			});
		} catch (e) {
			// revert deductions on failure
			manager.revertTransaction(analysis);
			throw e;
		}

		// update state with real effects
		manager.applyTransactionEffects(analysis, result.Transaction!);

		// get state, store in local storage, etc.
		const state = manager.export();

		// instantiate a new manager with the saved state
		const manager2 = new AutoApprovalManager({
			policy: JSON.stringify(policy),
			state,
		});

		const settings = manager2.getSettings();

		// new manager should have deducted from remaining transactions
		expect(settings?.remainingTransactions).toEqual(9);
	});
});
