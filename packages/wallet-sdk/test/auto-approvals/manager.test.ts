// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
	AutoApprovalManager,
	AutoApprovalPolicy,
	CoinValueAnalysis,
	createCoinValueAnalyzer,
	operationType,
	operationTypeAnalyzer,
	TransactionAnalyzer,
} from '../../src';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
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

describe('AutoApprovalManager', () => {
	describe('placeholder example', async () => {
		const keypair = new Ed25519Keypair();
		const client = new SuiClient({ url: getFullnodeUrl('testnet') });

		const tx = new Transaction();
		tx.add(operationType('test-operation'));
		const txJson = await tx.toJSON({ client });

		const analysis = await TransactionAnalyzer.create<{
			operationType: string | null;
			usdValue: CoinValueAnalysis;
		}>(client, txJson, {
			operationType: operationTypeAnalyzer,
			usdValue: createCoinValueAnalyzer({
				getCoinPrices: async (types) =>
					types.map((coinType) => ({ coinType, decimals: 9, price: 2.5 })),
			}),
		}).analyze();

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
		});

		expect(manager.checkTransaction(analysis).canAutoApprove).toEqual(true);

		// deduct balances
		manager.commitTransaction(analysis);

		const { signature } = await keypair.signTransaction(analysis.results.bytes);

		try {
			var { transaction } = await client.core.executeTransaction({
				transaction: analysis.results.bytes,
				signatures: [signature],
			});
		} catch (e) {
			// revert deductions on failure
			manager.revertTransaction(analysis);
			throw e;
		}

		// update state with real effects
		manager.applyTransactionEffects(analysis, transaction);

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
