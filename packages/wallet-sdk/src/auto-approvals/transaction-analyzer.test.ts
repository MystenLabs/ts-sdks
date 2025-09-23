// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { TransactionAnalyzer } from './transaction-analyzer.js';
import { autoApproval } from '../intents/AutoApproval.js';
import type { AutoApprovalPolicy } from './types/index.js';
import type { ClientWithCoreApi } from '@mysten/sui/experimental';

// Mock client
const mockClient = {
	core: {
		getObjects: vi.fn(),
		resolveTransactionPlugin: vi.fn().mockResolvedValue(() => Promise.resolve()),
	},
} as unknown as ClientWithCoreApi;

// Mock getCoinPrices function
const mockGetCoinPrices = vi.fn();

// Mock approveObjects function
const mockApproveObjects = vi.fn();

// Mock the transaction linter
vi.mock('../transaction-linter.js', () => ({
	extractCoinFlows: vi.fn(),
	lintTransaction: vi.fn(),
}));

// Sample policy for testing
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
						coinType:
							'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
					},
				],
			},
		},
		{
			id: 'nft-access',
			description: 'NFT operations',
			network: 'testnet',
			rules: {
				ownedObjects: [
					{
						$kind: 'ObjectTypeRule',
						description: 'NFT access',
						objectType: '0x123::nft::NFT',
						accessLevel: 'mutate',
					},
				],
			},
		},
	],
	suggestedSettings: {
		testnet: {
			remainingTransactions: 100,
			usdBudget: 10,
			approvedRuleSets: ['basic-transfers', 'nft-access'],
			coinBudgets: {
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI':
					'1000000000', // 1 SUI
			},
		},
	},
	defaultRuleSet: null,
};

describe('TransactionAnalyzer', () => {
	let analyzer: TransactionAnalyzer;

	beforeEach(async () => {
		vi.clearAllMocks();

		analyzer = new TransactionAnalyzer({
			client: mockClient,
			getCoinPrices: mockGetCoinPrices,
			approveObjects: mockApproveObjects,
		});

		// Setup default mock responses
		mockGetCoinPrices.mockResolvedValue({
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': '1.50',
		});
		mockApproveObjects.mockResolvedValue([true]);

		// Setup default extractCoinFlows mock
		const { extractCoinFlows } = await import('../transaction-linter.js');
		vi.mocked(extractCoinFlows).mockResolvedValue({
			outflows: [],
			inflows: [],
		});
	});

	describe('analyzeTransaction', () => {
		it('should analyze transaction without policy', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasPrice(1000);
			tx.setGasBudget(10000000);

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.autoApproved).toBe(false);
			expect(analysis.coinOutflows).toEqual([]);
			expect(analysis.usedObjects).toEqual([]);
			expect(analysis.expectedBalanceChanges).toEqual({});
		});

		it('should handle transaction analysis errors gracefully', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Mock extractCoinFlows to throw error
			const { extractCoinFlows } = await import('../transaction-linter.js');
			vi.mocked(extractCoinFlows).mockRejectedValue(new Error('Analysis failed'));

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.digest).toBe('test-digest');
			expect(analysis.autoApproved).toBe(false);
			expect(analysis.coinOutflows).toEqual([]);
			expect(analysis.usedObjects).toEqual([]);
		});

		it('should analyze transaction with policy and ruleSetId', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasPrice(1000);
			tx.setGasBudget(10000000);
			tx.add(autoApproval('basic-transfers'));

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.autoApproved).toBeDefined();
		});

		it('should handle transaction without ruleSetId', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.autoApproved).toBeDefined();
		});

		it('should calculate USD spend for transaction', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Mock USD price data
			mockGetCoinPrices.mockResolvedValue({
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': '1.50',
			});

			// Mock transaction with coin outflow
			const { extractCoinFlows } = await import('../transaction-linter.js');
			vi.mocked(extractCoinFlows).mockResolvedValue({
				outflows: [
					{
						coinType:
							'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
						amount: '1000000000', // 1 SUI
						decimals: 9,
						symbol: 'SUI',
						isRecognized: true,
					},
				],
				inflows: [],
			});

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.coinOutflows).toHaveLength(1);
			expect(analysis.coinOutflows[0].coinType).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
			);
			expect(analysis.coinOutflows[0].balance).toBe('1000000000');
		});

		it('should calculate coin balance changes for transaction', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.add(autoApproval('basic-transfers'));

			// Mock transaction with large coin outflow
			const { extractCoinFlows } = await import('../transaction-linter.js');
			vi.mocked(extractCoinFlows).mockResolvedValue({
				outflows: [
					{
						coinType:
							'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
						amount: '1000000000', // 1 SUI
						decimals: 9,
						symbol: 'SUI',
						isRecognized: true,
					},
				],
				inflows: [],
			});

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.expectedBalanceChanges).toBeDefined();
			expect(
				analysis.expectedBalanceChanges[
					'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
				],
			).toBeDefined();
		});

		it('should analyze object usage in transactions', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Mock objects being analyzed
			mockApproveObjects.mockResolvedValue([true]);

			// Add a resolved object to the transaction
			const objectInput = tx.objectRef({
				objectId: '0xabc123',
				digest: 'digest123',
				version: '1',
			});
			tx.transferObjects([objectInput], tx.pure.address('0x456'));

			// Mock getObjects to return object data
			mockClient.core.getObjects = vi.fn().mockResolvedValue({
				objects: [
					{
						id: '0x0000000000000000000000000000000000000000000000000000000000abc123',
						version: '1',
						digest: 'digest123',
						type: '0x123::nft::NFT',
						owner: { AddressOwner: '0x123' },
						content: Promise.resolve(new Uint8Array()),
					},
				],
			});

			// Create a policy with NFT transfer access
			const nftTransferPolicy = {
				...samplePolicy,
				ruleSets: [
					{
						id: 'nft-transfer',
						description: 'NFT transfer operations',
						network: 'testnet',
						rules: {
							ownedObjects: [
								{
									$kind: 'ObjectTypeRule' as const,
									description: 'NFT transfer access',
									objectType: '0x123::nft::NFT',
									accessLevel: 'transfer' as const,
								},
							],
						},
					},
				],
			};

			const analysis = await analyzer.analyzeTransaction(tx, nftTransferPolicy);

			expect(analysis.usedObjects).toHaveLength(1);
			expect(analysis.usedObjects[0].objectType).toBe('0x123::nft::NFT');
			expect(analysis.usedObjects[0].accessType).toBe('transfer');
		});

		it('should handle getObjects errors gracefully', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Mock getObjects to throw error
			mockClient.core.getObjects = vi.fn().mockRejectedValue(new Error('Network error'));

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.usedObjects).toEqual([]);
			expect(analysis.autoApproved).toBe(false);
		});
	});

	describe('object access analysis', () => {
		it('should detect transfer access level correctly', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Add resolved object with digest and version
			const objectInput = tx.objectRef({
				objectId: '0xabc123',
				digest: 'digest123',
				version: '1',
			});
			const addressInput = tx.pure.address('0x456');

			// Add transfer command
			tx.transferObjects([objectInput], addressInput);

			// Mock the object response
			mockClient.core.getObjects = vi.fn().mockResolvedValue({
				objects: [
					{
						id: '0x0000000000000000000000000000000000000000000000000000000000abc123',
						version: '1',
						digest: 'digest123',
						type: '0x123::nft::NFT',
						owner: { AddressOwner: '0x123' },
						content: Promise.resolve(new Uint8Array()),
					},
				],
			});

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.usedObjects).toHaveLength(1);
			expect(analysis.usedObjects[0].accessType).toBe('transfer');
		});

		it('should detect mutate access level correctly', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Add resolved object with digest and version
			const objectInput = tx.objectRef({
				objectId: '0xabc123',
				digest: 'digest123',
				version: '1',
			});
			tx.moveCall({
				target: '0x123::nft::mutate_nft',
				arguments: [objectInput],
			});

			// Mock the object response
			mockClient.core.getObjects = vi.fn().mockResolvedValue({
				objects: [
					{
						id: '0x0000000000000000000000000000000000000000000000000000000000abc123',
						version: '1',
						digest: 'digest123',
						type: '0x123::nft::NFT',
						owner: { AddressOwner: '0x123' },
						content: Promise.resolve(new Uint8Array()),
					},
				],
			});

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.usedObjects).toHaveLength(1);
			expect(analysis.usedObjects[0].accessType).toBe('mutate');
		});

		it('should analyze Move call permissions based on function signature', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Add resolved object with digest and version
			const objectInput = tx.objectRef({
				objectId: '0xabc123',
				digest: 'digest123',
				version: '1',
			});
			tx.moveCall({
				target: '0x123::nft::read_nft',
				arguments: [objectInput],
			});

			// Mock getNormalizedMoveFunction to return a function that takes &T (read access)
			const mockGetNormalizedMoveFunction = vi.fn().mockResolvedValue({
				parameters: [
					{
						type: '&0x123::nft::NFT',
					},
				],
			});
			(mockClient as any).getNormalizedMoveFunction = mockGetNormalizedMoveFunction;

			// Mock the object response
			mockClient.core.getObjects = vi.fn().mockResolvedValue({
				objects: [
					{
						id: '0x0000000000000000000000000000000000000000000000000000000000abc123',
						version: '1',
						digest: 'digest123',
						type: '0x123::nft::NFT',
						owner: { AddressOwner: '0x123' },
						content: Promise.resolve(new Uint8Array()),
					},
				],
			});

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.usedObjects).toHaveLength(1);
			expect(analysis.usedObjects[0].accessType).toBe('read');
			expect(mockGetNormalizedMoveFunction).toHaveBeenCalledWith({
				package: '0x0000000000000000000000000000000000000000000000000000000000000123',
				module: 'nft',
				function: 'read_nft',
			});
		});

		it('should detect transfer access for Move functions that take objects by value', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Add resolved object with digest and version
			const objectInput = tx.objectRef({
				objectId: '0xabc123',
				digest: 'digest123',
				version: '1',
			});
			tx.moveCall({
				target: '0x123::nft::burn_nft',
				arguments: [objectInput],
			});

			// Mock getNormalizedMoveFunction to return a function that takes T by value (transfer access)
			const mockGetNormalizedMoveFunction = vi.fn().mockResolvedValue({
				parameters: [
					{
						type: '0x123::nft::NFT', // By value - no & prefix
					},
				],
			});
			(mockClient as any).getNormalizedMoveFunction = mockGetNormalizedMoveFunction;

			// Mock the object response
			mockClient.core.getObjects = vi.fn().mockResolvedValue({
				objects: [
					{
						id: '0x0000000000000000000000000000000000000000000000000000000000abc123',
						version: '1',
						digest: 'digest123',
						type: '0x123::nft::NFT',
						owner: { AddressOwner: '0x123' },
						content: Promise.resolve(new Uint8Array()),
					},
				],
			});

			const analysis = await analyzer.analyzeTransaction(tx);

			expect(analysis.usedObjects).toHaveLength(1);
			expect(analysis.usedObjects[0].accessType).toBe('transfer');
		});
	});

	describe('policy rule matching', () => {
		it('should check transaction against policy rules', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.autoApproved).toBeDefined();
			expect(analysis.ruleSetId).toBe('basic-transfers');
		});

		it('should detect transactions with non-matching coin types', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Mock different coin type
			const { extractCoinFlows } = await import('../transaction-linter.js');
			vi.mocked(extractCoinFlows).mockResolvedValue({
				outflows: [
					{
						coinType:
							'0x0000000000000000000000000000000000000000000000000000000000000123::other::COIN', // Different coin not in rules
						amount: '100000000',
						decimals: 9,
						symbol: 'OTHER',
						isRecognized: true,
					},
				],
				inflows: [],
			});

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.autoApproved).toBe(false);
			expect(analysis.coinOutflows).toHaveLength(1);
		});
	});

	describe('session created objects', () => {
		it('should handle session-created objects', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');

			// Mock the object response for session-created object
			mockClient.core.getObjects = vi.fn().mockResolvedValue({
				objects: [
					{
						id: '0xsession123',
						version: '1',
						digest: 'digest123',
						type: '0x123::nft::NFT',
						owner: { AddressOwner: '0x123' },
						content: Promise.resolve(new Uint8Array()),
					},
				],
			});

			const policyWithSessionRules = {
				...samplePolicy,
				ruleSets: [
					{
						...samplePolicy.ruleSets[1],
						rules: {
							sessionCreatedObjects: [
								{
									$kind: 'ObjectTypeRule' as const,
									description: 'Session NFT access',
									objectType: '0x123::nft::NFT',
									accessLevel: 'mutate' as const,
								},
							],
						},
					},
				],
			};

			const analysis = await analyzer.analyzeTransaction(tx, policyWithSessionRules);

			expect(analysis.autoApproved).toBeDefined();
		});
	});

	describe('AutoApproval intent resolution', () => {
		it('should extract ruleSetId from AutoApproval intent', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasPrice(1000);
			tx.setGasBudget(10000000);

			// Add AutoApproval intent with ruleSetId
			tx.add(autoApproval('basic-transfers'));

			// Add a simple move call to make it a valid transaction
			tx.moveCall({
				target: '0x2::sui::pay_all',
				arguments: [],
			});

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.ruleSetId).toBe('basic-transfers');
		});

		it('should handle multiple AutoApproval intents', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasPrice(1000);
			tx.setGasBudget(10000000);

			// Add multiple AutoApproval intents (should extract first one)
			tx.add(autoApproval('first-rule'));
			tx.add(autoApproval('second-rule'));

			// Add a simple move call to make it a valid transaction
			tx.moveCall({
				target: '0x2::sui::pay_all',
				arguments: [],
			});

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.ruleSetId).toBe('first-rule');
		});

		it('should return null ruleSetId when no AutoApproval intent present', async () => {
			const tx = new Transaction();
			tx.setSender('0x123');
			tx.setGasPrice(1000);
			tx.setGasBudget(10000000);

			// Add a simple move call without AutoApproval intent
			tx.moveCall({
				target: '0x2::sui::pay_all',
				arguments: [],
			});

			const analysis = await analyzer.analyzeTransaction(tx, samplePolicy);

			expect(analysis.ruleSetId).toBe(null);
		});
	});
});
