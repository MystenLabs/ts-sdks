// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { AutoApprovalManager, type AutoApprovalManagerOptions } from './manager.js';
import type { AutoApprovalPolicy, AutoApprovalPolicySettings } from './types/index.js';

// Sample policy
const samplePolicy: AutoApprovalPolicy = {
	version: '1.0.0',
	origin: 'https://example.com',
	ruleSets: [
		{
			id: 'basic-transfers',
			description: 'Basic SUI transfers',
			network: 'testnet',
			rules: {
				balances: [
					{
						$kind: 'CoinBalanceRule',
						description: 'SUI balance access',
						coinType: '0x2::sui::SUI',
					},
				],
			},
		},
	],
	suggestedSettings: {
		testnet: {
			remainingTransactions: 100,
			usdBudget: 10,
			approvedRuleSets: ['basic-transfers'],
			coinBudgets: {
				'0x2::sui::SUI': '1000000000', // 1 SUI
			},
		},
	},
	defaultRuleSet: null,
};

// Sample policy settings
const sampleSettings: AutoApprovalPolicySettings = {
	remainingTransactions: 50,
	expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
	usdBudget: 5,
	approvedRuleSets: ['basic-transfers'],
	coinBudgets: {
		'0x2::sui::SUI': '500000000', // 0.5 SUI
	},
};

describe('AutoApprovalManager', () => {
	let managerOptions: AutoApprovalManagerOptions;

	beforeEach(() => {
		vi.clearAllMocks();

		managerOptions = {
			state: null,
			network: 'testnet',
			origin: 'https://example.com',
		};
	});

	describe('constructor', () => {
		it('should initialize with empty state', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const exportedState = JSON.parse(manager.export());

			expect(exportedState.version).toBe('1.0.0');
			expect(exportedState.network).toBe('testnet');
			expect(exportedState.origin).toBe('https://example.com');
			expect(exportedState.policy).toBe(null);
			expect(exportedState.settings).toBe(null);
			expect(exportedState.approvedAt).toBe(null);
		});

		it('should restore state from valid serialized state', () => {
			const existingState = {
				version: '1.0.0',
				network: 'testnet',
				origin: 'https://example.com',
				approvedAt: '2024-01-01T00:00:00.000Z',
				policy: samplePolicy,
				settings: sampleSettings,
				balanceChanges: {},
				createdObjects: {},
				approvedDigests: [],
				pendingDigests: [],
			};

			const manager = new AutoApprovalManager({
				...managerOptions,
				state: JSON.stringify(existingState),
			});

			const exportedState = JSON.parse(manager.export());
			expect(exportedState.approvedAt).toBe('2024-01-01T00:00:00.000Z');
			expect(exportedState.policy).toEqual(samplePolicy);
		});

		it('should throw error for network mismatch', () => {
			const wrongNetworkState = {
				version: '1.0.0',
				network: 'mainnet',
				origin: 'https://example.com',
				approvedAt: null,
				policy: null,
				settings: null,
				balanceChanges: {},
				createdObjects: {},
				approvedDigests: [],
				pendingDigests: [],
			};

			expect(() => {
				new AutoApprovalManager({
					...managerOptions,
					state: JSON.stringify(wrongNetworkState),
				});
			}).toThrow('Network mismatch: expected testnet, got mainnet');
		});

		it('should throw error for origin mismatch', () => {
			const wrongOriginState = {
				version: '1.0.0',
				network: 'testnet',
				origin: 'https://malicious.com',
				approvedAt: null,
				policy: null,
				settings: null,
				balanceChanges: {},
				createdObjects: {},
				approvedDigests: [],
				pendingDigests: [],
			};

			expect(() => {
				new AutoApprovalManager({
					...managerOptions,
					state: JSON.stringify(wrongOriginState),
				});
			}).toThrow('Origin mismatch: expected https://example.com, got https://malicious.com');
		});

		it('should throw error for invalid state schema', () => {
			const invalidState = {
				version: '2.0.0', // Invalid version
				network: 'testnet',
				origin: 'https://example.com',
			};

			expect(() => {
				new AutoApprovalManager({
					...managerOptions,
					state: JSON.stringify(invalidState),
				});
			}).toThrow(/Invalid state:/);
		});
	});

	describe('update', () => {
		it('should update policy and settings with validation', () => {
			const manager = new AutoApprovalManager(managerOptions);

			manager.update(samplePolicy, sampleSettings);

			const exportedState = JSON.parse(manager.export());
			expect(exportedState.policy).toEqual(samplePolicy);
			expect(exportedState.settings).toEqual(sampleSettings);
			expect(exportedState.approvedAt).toBe(null);
		});

		it('should reset state when updating', () => {
			const manager = new AutoApprovalManager(managerOptions);

			// Set some initial state
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			// Update again should reset
			manager.update(samplePolicy, sampleSettings);

			const exportedState = JSON.parse(manager.export());
			expect(exportedState.approvedAt).toBe(null);
			expect(exportedState.balanceChanges).toEqual({});
			expect(exportedState.approvedDigests).toEqual([]);
		});

		it('should throw error for invalid policy schema', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const invalidPolicy = { ...samplePolicy, version: '2.0.0' } as any;

			expect(() => {
				manager.update(invalidPolicy, sampleSettings);
			}).toThrow();
		});
	});

	describe('approve', () => {
		it('should set approvedAt timestamp', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);

			const beforeApproval = new Date();
			manager.approve();
			const afterApproval = new Date();

			const exportedState = JSON.parse(manager.export());
			const approvedAt = new Date(exportedState.approvedAt);

			expect(approvedAt.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime());
			expect(approvedAt.getTime()).toBeLessThanOrEqual(afterApproval.getTime());
		});

		it('should throw error when no policy is set', () => {
			const manager = new AutoApprovalManager(managerOptions);

			expect(() => {
				manager.approve();
			}).toThrow('No policy to approve');
		});

		it('should throw error when no settings are set', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const state = JSON.parse(manager.export());
			state.policy = samplePolicy;

			const managerWithPolicy = new AutoApprovalManager({
				...managerOptions,
				state: JSON.stringify(state),
			});

			expect(() => {
				managerWithPolicy.approve();
			}).toThrow('Policy settings have not been set');
		});
	});

	describe('reset', () => {
		it('should reset all tracking state', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			// Manually set some tracking data
			const state = JSON.parse(manager.export());
			state.balanceChanges = { test: { balanceChange: '-1000', lastUpdated: '2024-01-01' } };
			state.approvedDigests = ['digest1', 'digest2'];
			state.pendingDigests = ['digest3'];
			state.createdObjects = {
				obj1: { objectId: 'obj1', version: '1', digest: 'hash', objectType: 'test' },
			};

			const managerWithData = new AutoApprovalManager({
				...managerOptions,
				state: JSON.stringify(state),
			});

			managerWithData.reset();

			const resetState = JSON.parse(managerWithData.export());
			expect(resetState.approvedAt).toBe(null);
			expect(resetState.balanceChanges).toEqual({});
			expect(resetState.approvedDigests).toEqual([]);
			expect(resetState.pendingDigests).toEqual([]);
			expect(resetState.createdObjects).toEqual({});
		});
	});

	describe('detectChange', () => {
		it('should return true when no existing policy', () => {
			const manager = new AutoApprovalManager(managerOptions);

			expect(manager.detectChange(samplePolicy)).toBe(true);
		});

		it('should return false when policy is the same', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);

			expect(manager.detectChange(samplePolicy)).toBe(false);
		});

		it('should return true when policy changes', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);

			const modifiedPolicy = {
				...samplePolicy,
				ruleSets: [
					{
						...samplePolicy.ruleSets[0],
						description: 'Modified description',
					},
				],
			};

			expect(manager.detectChange(modifiedPolicy)).toBe(true);
		});
	});

	describe('canAutoApprove', () => {
		it('should return false when no policy or settings', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const mockAnalysis = {
				autoApproved: true,
				ruleSetId: 'basic-transfers',
				digest: 'test-digest',
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			expect(manager.canAutoApprove(mockAnalysis)).toBe(false);
		});

		it('should return false when policy expired', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const expiredSettings = {
				...sampleSettings,
				expiration: new Date(Date.now() - 1000).toISOString(), // 1 second ago
			};

			manager.update(samplePolicy, expiredSettings);
			manager.approve();

			const mockAnalysis = {
				autoApproved: true,
				ruleSetId: 'basic-transfers',
				digest: 'test-digest',
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			expect(manager.canAutoApprove(mockAnalysis)).toBe(false);
		});

		it('should return false when no remaining transactions', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const noTransactionsSettings = {
				...sampleSettings,
				remainingTransactions: 0,
			};

			manager.update(samplePolicy, noTransactionsSettings);
			manager.approve();

			const mockAnalysis = {
				autoApproved: true,
				ruleSetId: 'basic-transfers',
				digest: 'test-digest',
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			expect(manager.canAutoApprove(mockAnalysis)).toBe(false);
		});

		it('should return false when ruleSetId is not approved', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const mockAnalysis = {
				autoApproved: true,
				ruleSetId: 'unapproved-rule-set',
				digest: 'test-digest',
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			expect(manager.canAutoApprove(mockAnalysis)).toBe(false);
		});

		it('should return false when analysis is not auto-approved', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const mockAnalysis = {
				autoApproved: false,
				ruleSetId: 'basic-transfers',
				digest: 'test-digest',
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			expect(manager.canAutoApprove(mockAnalysis)).toBe(false);
		});

		it('should return true when all conditions are met', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const mockAnalysis = {
				autoApproved: true,
				ruleSetId: 'basic-transfers',
				digest: 'test-digest',
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			expect(manager.canAutoApprove(mockAnalysis)).toBe(true);
		});
	});

	describe('extractRuleSetId', () => {
		it('should return null for transaction without auto-approval intent', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const tx = new Transaction();
			tx.setSender('0x123');

			const ruleSetId = manager.extractRuleSetId(tx);

			expect(ruleSetId).toBe(null);
		});

		it('should handle errors gracefully', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const invalidTx = {} as Transaction;

			const ruleSetId = manager.extractRuleSetId(invalidTx);

			expect(ruleSetId).toBe(null);
		});
	});

	describe('commitTransaction', () => {
		it('should not modify state for non-approved transactions', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const nonApprovedAnalysis = {
				digest: 'test-digest',
				autoApproved: false,
				ruleSetId: null,
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			manager.commitTransaction(nonApprovedAnalysis);

			const state = JSON.parse(manager.export());
			expect(state.settings?.remainingTransactions).toBe(50);
			expect(state.pendingDigests).toEqual([]);
		});

		it('should update remaining transactions for approved transactions', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const approvedAnalysis = {
				digest: 'test-digest',
				autoApproved: true,
				ruleSetId: null,
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			manager.commitTransaction(approvedAnalysis);

			const state = JSON.parse(manager.export());
			expect(state.settings?.remainingTransactions).toBe(49);
			expect(state.pendingDigests).toContain('test-digest');
		});

		it('should update balance changes for coin outflows', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const approvedAnalysis = {
				digest: 'test-digest',
				autoApproved: true,
				ruleSetId: null,
				coinOutflows: [
					{
						coinType: '0x2::sui::SUI',
						balance: '100000000', // 0.1 SUI
					},
				],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			manager.commitTransaction(approvedAnalysis);

			const state = JSON.parse(manager.export());
			expect(state.balanceChanges['0x2::sui::SUI']).toBeDefined();
			expect(state.balanceChanges['0x2::sui::SUI'].balanceChange).toBe('-100000000');
		});

		it('should not go below zero remaining transactions', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const zeroTransactionsSettings = {
				...sampleSettings,
				remainingTransactions: 0,
			};

			manager.update(samplePolicy, zeroTransactionsSettings);
			manager.approve();

			const approvedAnalysis = {
				digest: 'test-digest',
				autoApproved: true,
				ruleSetId: null,
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			manager.commitTransaction(approvedAnalysis);

			const state = JSON.parse(manager.export());
			expect(state.settings?.remainingTransactions).toBe(0);
		});
	});

	describe('applyTransactionEffects', () => {
		it('should move digest from pending to approved', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			// First commit a transaction
			const approvedAnalysis = {
				digest: 'test-digest',
				autoApproved: true,
				ruleSetId: null,
				coinOutflows: [],
				usedObjects: [],
				expectedBalanceChanges: {},
				inputs: [],
				commands: [],
			};

			manager.commitTransaction(approvedAnalysis);

			// Simulate transaction effects
			const mockEffects = {
				transactionDigest: 'test-digest',
				changedObjects: [],
			} as any;

			manager.applyTransactionEffects(mockEffects);

			const state = JSON.parse(manager.export());
			expect(state.pendingDigests).toEqual([]);
			expect(state.approvedDigests).toContain('test-digest');
		});

		it('should track created objects', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const mockEffects = {
				transactionDigest: 'test-digest',
				changedObjects: [
					{
						id: 'new-object-id',
						idOperation: 'Created',
						outputState: 'ObjectWrite',
						outputVersion: '1',
						outputDigest: 'object-digest',
					},
				],
			} as any;

			manager.applyTransactionEffects(mockEffects);

			const state = JSON.parse(manager.export());
			expect(state.createdObjects['new-object-id']).toBeDefined();
			expect(state.createdObjects['new-object-id'].objectId).toBe('new-object-id');
			expect(state.createdObjects['new-object-id'].version).toBe('1');
		});
	});

	describe('applySettings', () => {
		it('should update settings with validation', () => {
			const manager = new AutoApprovalManager(managerOptions);

			manager.applySettings(sampleSettings);

			const state = JSON.parse(manager.export());
			expect(state.settings).toEqual(sampleSettings);
		});

		it('should throw error for invalid settings', () => {
			const manager = new AutoApprovalManager(managerOptions);
			const invalidSettings = { ...sampleSettings, expiration: 123 } as any; // Invalid type

			expect(() => {
				manager.applySettings(invalidSettings);
			}).toThrow();
		});
	});

	describe('export', () => {
		it('should return valid JSON string of validated state', () => {
			const manager = new AutoApprovalManager(managerOptions);
			manager.update(samplePolicy, sampleSettings);
			manager.approve();

			const exportedString = manager.export();
			const parsedState = JSON.parse(exportedString);

			expect(parsedState.version).toBe('1.0.0');
			expect(parsedState.policy).toEqual(samplePolicy);
			expect(parsedState.settings).toEqual(sampleSettings);
			expect(parsedState.approvedAt).toBeTruthy();
		});

		it('should validate state before exporting', () => {
			const manager = new AutoApprovalManager(managerOptions);

			// This should not throw as the default state is valid
			expect(() => manager.export()).not.toThrow();
		});
	});
});
