// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
	analyze,
	analyzers,
	autoApprovalAnalyzer,
	AutoApprovalManager,
	AutoApprovalPolicy,
	operationType,
	type AutoApprovalAnalysis,
	type AutoApprovalResult,
} from '../../src/index.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { MIST_PER_SUI, normalizeSuiAddress } from '@mysten/sui/utils';
import { MockSuiClient } from '../mocks/MockSuiClient.js';
import { DEFAULT_SENDER } from '../mocks/mockData.js';

const RAW_SUI = '0x2::sui::SUI';
const SUI = normalizeSuiAddress('0x2') + '::sui::SUI';

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

const balancePolicy: AutoApprovalPolicy = {
	schemaVersion: '1.0.0',
	operations: [
		{
			id: 'test-operation',
			description: 'Test operation',
			permissions: {
				balances: [
					{
						$kind: 'CoinBalance',
						description: 'SUI',
						coinType: SUI,
					},
				],
			},
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

function managerWithBalanceSettings() {
	const manager = new AutoApprovalManager({
		policy: JSON.stringify(balancePolicy),
		state: null,
	});
	manager.updateSettings({
		approvedOperations: ['test-operation'],
		expiration: Date.now() + 1000 * 60 * 60,
		remainingTransactions: 1,
		sharedBudget: null,
		coinBudgets: {
			[SUI]: '10',
		},
	});
	return manager;
}

function autoApprovalAnalysis(overrides: Partial<AutoApprovalAnalysis> = {}): AutoApprovalAnalysis {
	const balanceFlows = overrides.balanceFlows ?? {
		byAddress: {},
		sender: [],
		sponsor: null,
	};
	const senderAddresses = overrides.senderAddresses ?? [normalizeSuiAddress('0x1')];
	const senderBalanceFlows =
		overrides.senderBalanceFlows ??
		senderAddresses.flatMap((address) => balanceFlows.byAddress[address] ?? []);

	return {
		operationType: 'test-operation',
		senderAddresses,
		bytes: new Uint8Array([1, 2, 3]),
		balanceFlows,
		senderBalanceFlows,
		coinValues: { total: 0, coinTypesWithoutPrice: [], coinTypes: [] },
		accessLevel: {},
		ownedObjects: [],
		digest: 'test-digest',
		...overrides,
	};
}

describe('AutoApprovalManager', () => {
	test('analyzes bytes once with explicit operation type and shared balance flows', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		tx.setGasBudget(10_000_000n);
		tx.setGasPrice(1_000n);
		const bytes = await tx.build({ client });

		const results = await analyze(
			{
				balanceFlows: analyzers.balanceFlows,
				autoApproval: autoApprovalAnalyzer,
			},
			{
				transaction: bytes,
				client,
				operationType: 'increment-counter',
			},
		);

		expect(results.autoApproval.status).toBe('success');
		expect(results.autoApproval.result?.operationType).toBe('increment-counter');
		expect(results.autoApproval.result?.balanceFlows).toBe(results.balanceFlows.result);
		expect(results.autoApproval.result?.senderBalanceFlows).toEqual([
			{ coinType: SUI, amount: -10_000_000n },
		]);
	});

	test('adds configured sender addresses to the transaction sender', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		tx.setGasBudget(10_000_000n);
		tx.setGasPrice(1_000n);
		const bytes = await tx.build({ client });

		const extraSender = normalizeSuiAddress('0x456');
		const results = await analyze(
			{
				autoApproval: autoApprovalAnalyzer,
			},
			{
				transaction: bytes,
				client,
				operationType: 'increment-counter',
				autoApproval: { senderAddresses: [extraSender] },
				getCoinPrices: async () => [],
			},
		);

		expect(results.autoApproval.result?.senderAddresses).toEqual([DEFAULT_SENDER, extraSender]);
	});

	test('matches unnormalized policy and budget coin types against analyzer balance flows', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);
		tx.setGasBudget(10_000_000n);
		tx.setGasPrice(1_000n);
		const bytes = await tx.build({ client });

		const results = await analyze(
			{
				autoApproval: autoApprovalAnalyzer,
			},
			{
				transaction: bytes,
				client,
				operationType: 'test-operation',
			},
		);

		expect(results.autoApproval.status).toBe('success');
		expect(results.autoApproval.result?.senderBalanceFlows).toEqual([
			{ coinType: SUI, amount: -10_000_000n },
		]);

		const manager = new AutoApprovalManager({
			policy: JSON.stringify({
				schemaVersion: '1.0.0',
				operations: [
					{
						id: 'test-operation',
						description: 'Test operation',
						permissions: {
							balances: [
								{
									$kind: 'CoinBalance',
									description: 'SUI',
									coinType: RAW_SUI,
								},
							],
						},
					},
				],
				suggestedSettings: {},
			} satisfies AutoApprovalPolicy),
			state: null,
		});

		manager.updateSettings({
			approvedOperations: ['test-operation'],
			expiration: Date.now() + 1000 * 60 * 60,
			remainingTransactions: 1,
			sharedBudget: null,
			coinBudgets: {
				[RAW_SUI]: '10000000',
			},
		});

		expect(manager.getSettings()?.coinBudgets).toEqual({ [SUI]: '10000000' });
		expect(manager.checkTransaction(results.autoApproval)).toEqual({
			matchesPolicy: true,
			canAutoApprove: true,
			analysisIssues: [],
			policyIssues: [],
			settingsIssues: [],
		});

		manager.commitTransaction(results.autoApproval);

		expect(manager.getSettings()?.coinBudgets).toEqual({ [SUI]: '0' });
	});

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

	test('uses signed sender balance outflows for policy and budget checks', () => {
		const manager = managerWithBalanceSettings();
		const sender = normalizeSuiAddress('0x1');
		const analysis: AutoApprovalResult = {
			status: 'success',
			result: autoApprovalAnalysis({
				senderAddresses: [sender],
				senderBalanceFlows: [{ coinType: SUI, amount: -4n }],
				balanceFlows: {
					byAddress: { [sender]: [{ coinType: SUI, amount: -4n }] },
					sender: [{ coinType: SUI, amount: -4n }],
					sponsor: null,
				},
			}),
		};

		expect(manager.checkTransaction(analysis)).toEqual({
			matchesPolicy: true,
			canAutoApprove: true,
			analysisIssues: [],
			policyIssues: [],
			settingsIssues: [],
		});

		manager.commitTransaction(analysis);

		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('6');

		manager.revertTransaction(analysis);

		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('10');
		expect(manager.getState().pendingDigests).toEqual([]);
	});

	test('uses multiple sender addresses for policy and budget checks', () => {
		const manager = managerWithBalanceSettings();
		const sender = normalizeSuiAddress('0x1');
		const extraSender = normalizeSuiAddress('0x2');
		const analysis: AutoApprovalResult = {
			status: 'success',
			result: autoApprovalAnalysis({
				senderAddresses: [sender, extraSender],
				senderBalanceFlows: [{ coinType: SUI, amount: -6n }],
				balanceFlows: {
					byAddress: {
						[sender]: [{ coinType: SUI, amount: -4n }],
						[extraSender]: [{ coinType: SUI, amount: -2n }],
					},
					sender: [{ coinType: SUI, amount: -4n }],
					sponsor: null,
				},
			}),
		};

		manager.commitTransaction(analysis);

		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('4');
	});

	test('gas-only SUI outflows are budgeted and reconciled from effects', () => {
		const manager = managerWithBalanceSettings();
		manager.updateSettings({
			approvedOperations: ['test-operation'],
			expiration: Date.now() + 1000 * 60 * 60,
			remainingTransactions: 1,
			sharedBudget: null,
			coinBudgets: { [SUI]: '10000000' },
		});
		const sender = normalizeSuiAddress('0x1');
		const analysis: AutoApprovalResult = {
			status: 'success',
			result: autoApprovalAnalysis({
				senderAddresses: [sender],
				senderBalanceFlows: [{ coinType: SUI, amount: -10_000_000n }],
				coinValues: { total: 0, coinTypesWithoutPrice: [], coinTypes: [] },
				balanceFlows: {
					byAddress: {
						[sender]: [{ coinType: SUI, amount: -10_000_000n }],
					},
					sender: [{ coinType: SUI, amount: -10_000_000n }],
					sponsor: null,
				},
			}),
		};

		expect(manager.checkTransaction(analysis)).toEqual({
			matchesPolicy: true,
			canAutoApprove: true,
			analysisIssues: [],
			policyIssues: [],
			settingsIssues: [],
		});

		manager.commitTransaction(analysis);
		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('0');

		manager.applyTransactionEffects(analysis, {
			digest: 'test-digest',
			balanceChanges: [{ address: sender, coinType: SUI, amount: '-5000000' }],
		} as unknown as Parameters<AutoApprovalManager['applyTransactionEffects']>[1]);

		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('5000000');
		expect(manager.getState().pendingDigests).toEqual([]);
	});

	test('does not spend budgets for positive sender balance flows', () => {
		const manager = managerWithBalanceSettings();
		const sender = normalizeSuiAddress('0x1');
		const analysis: AutoApprovalResult = {
			status: 'success',
			result: autoApprovalAnalysis({
				senderAddresses: [sender],
				senderBalanceFlows: [{ coinType: SUI, amount: 4n }],
				balanceFlows: {
					byAddress: { [sender]: [{ coinType: SUI, amount: 4n }] },
					sender: [{ coinType: SUI, amount: 4n }],
					sponsor: null,
				},
			}),
		};

		manager.commitTransaction(analysis);

		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('10');
	});

	test('reconciles transaction effects with sender balance changes only', () => {
		const manager = managerWithBalanceSettings();
		const sender = normalizeSuiAddress('0x1');
		const extraSender = normalizeSuiAddress('0x2');
		const analysis: AutoApprovalResult = {
			status: 'success',
			result: autoApprovalAnalysis({
				senderAddresses: [sender, extraSender],
				senderBalanceFlows: [{ coinType: SUI, amount: -6n }],
				balanceFlows: {
					byAddress: {
						[sender]: [{ coinType: SUI, amount: -4n }],
						[extraSender]: [{ coinType: SUI, amount: -2n }],
					},
					sender: [{ coinType: SUI, amount: -4n }],
					sponsor: null,
				},
			}),
		};

		manager.commitTransaction(analysis);
		manager.applyTransactionEffects(analysis, {
			digest: 'test-digest',
			balanceChanges: [
				{ address: sender, coinType: SUI, amount: '-4' },
				{ address: extraSender, coinType: SUI, amount: '-3' },
				{ address: '0x3', coinType: SUI, amount: '7' },
			],
		} as unknown as Parameters<AutoApprovalManager['applyTransactionEffects']>[1]);

		expect(manager.getSettings()?.coinBudgets[SUI]).toBe('3');
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
