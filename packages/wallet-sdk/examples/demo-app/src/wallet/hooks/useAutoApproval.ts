// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction } from '@mysten/sui/transactions';
import type { SuiClient } from '@mysten/sui/client';
import { AutoApprovalManager, TransactionAnalyzer } from '@mysten/wallet-sdk';
import type { AutoApprovalPolicy, AutoApprovalPolicySettings } from '@mysten/wallet-sdk';
import type { TransactionAnalysis } from '@mysten/wallet-sdk';

interface AutoApprovalState {
	// Analysis state
	isAnalyzing: boolean;
	analysisError?: string;
	analysis?: TransactionAnalysis;

	// Transaction state
	transaction?: Transaction;

	// Policy state
	policy?: AutoApprovalPolicy;
	hasExistingPolicy: boolean;
	isApprovalEnabled: boolean;
	currentSettings?: AutoApprovalPolicySettings;

	// Auto-approval countdown state
	isCountingDown: boolean;
	countdownSeconds?: number;
	shouldAutoApprove: boolean;
	cancelled: boolean;

	// Transaction analysis
	canAutoApprove: boolean;
	autoApprovalReason?: string;
	ruleSetId?: string;
}

interface AutoApprovalActions {
	// Policy actions
	enablePolicy: (settings: AutoApprovalPolicySettings) => Promise<void>;
	updatePolicy: (settings: AutoApprovalPolicySettings) => Promise<void>;
	disablePolicy: () => Promise<void>;

	// Countdown actions
	cancelCountdown: () => void;

	// Transaction actions
	approveTransaction: () => void;
	rejectTransaction: () => void;

	// Reset
	reset: () => void;
}

const COUNTDOWN_DURATION = 5; // seconds

export function useAutoApproval(
	transaction: Transaction | null,
	suiClient?: SuiClient,
	origin?: string,
	_ruleSetId?: string, // Deprecated - ruleSetId is now extracted from transaction
): [AutoApprovalState, AutoApprovalActions] {
	const [state, setState] = useState<AutoApprovalState>({
		isAnalyzing: false,
		isCountingDown: false,
		shouldAutoApprove: false,
		cancelled: false,
		hasExistingPolicy: false,
		isApprovalEnabled: false,
		canAutoApprove: false,
	});

	const managerRef = useRef<AutoApprovalManager | null>(null);
	const analyzerRef = useRef<TransactionAnalyzer | null>(null);
	const lastAnalyzedTransactionRef = useRef<Transaction | null>(null);

	// Get the policy from the well-known endpoint
	const getPolicy = useCallback(async (): Promise<AutoApprovalPolicy | null> => {
		if (!origin) return null;

		try {
			// Fetch policy from well-known endpoint
			const policyUrl = `${origin}/.well-known/sui/automatic-approval-policy.json`;
			const response = await fetch(policyUrl);
			if (!response.ok) {
				console.warn('Failed to fetch policy from', policyUrl);
				return null;
			}

			const policyData = await response.json();

			// Transform the well-known policy format to AutoApprovalPolicy format
			return {
				version: policyData.version,
				origin: origin,
				ruleSets: Object.entries(policyData.ruleSets).map(([id, ruleSet]: [string, any]) => ({
					id,
					description: ruleSet.description,
					network: 'testnet', // TODO: detect network
					rules: ruleSet.rules,
				})),
				suggestedSettings: {
					testnet: {
						remainingTransactions: policyData.defaultSettings?.remainingTransactions || 50,
						usdBudget: parseFloat(policyData.defaultSettings?.maxUsdBudget || '100'),
						approvedRuleSets: [], // Will be set when user approves
						coinBudgets: policyData.defaultSettings?.maxCoinBudget || {
							'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI':
								'10000000000',
						},
					},
				},
				defaultRuleSet: null,
			};
		} catch (error) {
			console.error('Failed to fetch or parse policy:', error);
			return null;
		}
	}, [origin]);

	// Create manager instance
	const createManager = useCallback(async (): Promise<AutoApprovalManager | null> => {
		if (!suiClient || !origin) return null;

		try {
			// Get existing state from localStorage
			const storageKey = `auto-approval-${origin}`;
			const existingState = localStorage.getItem(storageKey);

			const manager = new AutoApprovalManager({
				state: existingState,
				network: 'testnet',
				origin,
			});

			return manager;
		} catch (error) {
			console.error('Failed to create AutoApprovalManager:', error);
			return null;
		}
	}, [suiClient, origin]);

	// Create analyzer instance
	const createAnalyzer = useCallback((): TransactionAnalyzer | null => {
		if (!suiClient) return null;

		try {
			const analyzer = new TransactionAnalyzer({
				client: suiClient,
				getCoinPrices: async () => ({}), // Empty price data for now
				approveObjects: async () => [], // Empty object approvals for now
			});

			return analyzer;
		} catch (error) {
			console.error('Failed to create TransactionAnalyzer:', error);
			return null;
		}
	}, [suiClient]);

	// Save manager state to localStorage
	const saveManagerState = useCallback(
		async (manager: AutoApprovalManager) => {
			if (!origin) return;

			try {
				const state = await manager.serialize();
				const storageKey = `auto-approval-${origin}`;
				localStorage.setItem(storageKey, state);
			} catch (error) {
				console.error('Failed to save manager state:', error);
			}
		},
		[origin],
	);

	const clearCountdown = useCallback(() => {
		setState((prev) => ({
			...prev,
			isCountingDown: false,
			countdownSeconds: undefined,
			cancelled: true,
			canAutoApprove: false,
		}));
	}, []);

	// Main analysis function
	const analyzeTransactionAndPolicy = useCallback(
		async (
			transaction: Transaction,
			overrideSettings?: {
				hasExistingPolicy?: boolean;
				isEnabled?: boolean;
				currentSettings?: AutoApprovalPolicySettings;
			},
		) => {
			if (!suiClient || !origin) {
				setState((prev) => ({
					...prev,
					analysisError: 'Auto-approval requires suiClient and origin',
					isAnalyzing: false,
					canAutoApprove: false,
				}));
				return;
			}

			try {
				// Create manager and analyzer
				const manager = await createManager();
				if (!manager) {
					throw new Error('Failed to create AutoApprovalManager');
				}

				const analyzer = createAnalyzer();
				if (!analyzer) {
					throw new Error('Failed to create TransactionAnalyzer');
				}

				managerRef.current = manager;
				analyzerRef.current = analyzer;

				// Get policy for this demo first
				const policy = await getPolicy();
				if (!policy) {
					throw new Error('No policy available for this demo');
				}

				// Check for policy changes using manager's built-in helper
				if (manager.detectChange(policy)) {
					await manager.clearPolicy();
					await saveManagerState(manager);
				}

				// Check if we already have an enabled policy (or use override settings)
				const hasExistingPolicy =
					overrideSettings?.hasExistingPolicy ?? (await manager.hasPolicy());
				const isEnabled =
					overrideSettings?.isEnabled ?? (hasExistingPolicy && (await manager.isPolicyEnabled()));

				// Analyze the transaction against the policy (no settings needed)
				const analysis = await analyzer.analyzeTransaction(transaction, policy);

				// If no auto-approval intent found, skip approval checking
				if (!analysis.ruleSetId) {
					setState((prev) => ({
						...prev,
						isAnalyzing: false,
						canAutoApprove: false,
						autoApprovalReason: 'No auto-approval intent found',
						transaction,
						analysis,
						policy,
					}));
					return;
				}

				let currentSettings: AutoApprovalPolicySettings | undefined;
				if (overrideSettings?.currentSettings) {
					currentSettings = overrideSettings.currentSettings;
				} else if (hasExistingPolicy) {
					currentSettings = manager.getCurrentSettings() || undefined;
				}

				// Use the new canAutoApprove method to check if transaction can be approved
				const settingsToUse = overrideSettings?.currentSettings || currentSettings;
				const canAutoApprove = manager.canAutoApprove(
					analysis,
					policy,
					settingsToUse,
					analysis.ruleSetId,
				);

				// Determine specific reason for why auto-approval failed
				let specificReason: string | undefined;
				if (canAutoApprove) {
					specificReason = 'Transaction matches approved rule set';
				} else if (analysis.ruleSetId && !settingsToUse?.approvedRuleSets.includes(analysis.ruleSetId)) {
					// Ruleset exists but not approved - this is a setup issue, show "Enable Auto Approvals" instead
					specificReason = undefined;
				} else if (!hasExistingPolicy || !isEnabled) {
					// No policy or disabled - setup issue
					specificReason = undefined;
				} else {
					// Policy is properly configured but still can't approve - show constraint violation
					const now = new Date();
					if (settingsToUse && new Date(settingsToUse.expiration) < now) {
						specificReason = 'Policy has expired';
					} else if (
						settingsToUse?.remainingTransactions !== null &&
						settingsToUse?.remainingTransactions !== undefined &&
						settingsToUse.remainingTransactions <= 0
					) {
						specificReason = 'No remaining transactions in policy budget';
					} else {
						specificReason = 'Transaction exceeds policy constraints';
					}
				}

				setState((prev) => ({
					...prev,
					isAnalyzing: false,
					analysisError: undefined,
					analysis,
					policy,
					hasExistingPolicy,
					isApprovalEnabled: isEnabled,
					currentSettings,
					canAutoApprove,
					autoApprovalReason: specificReason,
					ruleSetId: analysis.ruleSetId || undefined,
					// Auto-start countdown if transaction can be auto-approved
					isCountingDown: canAutoApprove,
					countdownSeconds: canAutoApprove ? COUNTDOWN_DURATION : undefined,
				}));
			} catch (error) {
				console.error('❌ Error analyzing transaction:', error);
				setState((prev) => ({
					...prev,
					isAnalyzing: false,
					analysisError: `Analysis failed: ${error}`,
					canAutoApprove: false,
				}));
			}
		},
		[suiClient, origin, createManager, createAnalyzer, getPolicy, saveManagerState],
	);

	// Auto-start analysis when transaction changes
	useEffect(() => {
		if (!transaction || !suiClient || !origin) return;

		// Skip if we've already analyzed this exact transaction instance
		if (lastAnalyzedTransactionRef.current === transaction) {
			return;
		}

		// Mark this transaction as being analyzed
		lastAnalyzedTransactionRef.current = transaction;

		setState({
			isAnalyzing: true,
			isCountingDown: false,
			shouldAutoApprove: false,
			cancelled: false,
			hasExistingPolicy: false,
			isApprovalEnabled: false,
			canAutoApprove: false,
			transaction,
			policy: undefined,
			currentSettings: undefined,
			analysisError: undefined,
		});

		analyzeTransactionAndPolicy(transaction);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [transaction, origin, suiClient]);

	const actions: AutoApprovalActions = {
		enablePolicy: useCallback(
			async (settings: AutoApprovalPolicySettings) => {
				const manager = managerRef.current;
				const policy = state.policy;

				if (!manager || !policy) {
					throw new Error('Manager or policy not available');
				}

				await manager.createPolicy(policy, settings);
				manager.approve();
				await saveManagerState(manager);

				setState((prev) => ({
					...prev,
					hasExistingPolicy: true,
					isApprovalEnabled: true,
					currentSettings: settings,
				}));

				// Re-check if we can auto-approve with the new policy settings
				if (state.transaction && state.analysis) {
					const canAutoApprove = manager.canAutoApprove(
						state.analysis,
						state.policy,
						settings,
						state.analysis.ruleSetId,
					);

					setState((prev) => ({
						...prev,
						canAutoApprove,
						autoApprovalReason: canAutoApprove
							? 'Transaction matches approved rule set'
							: undefined,
						// Start countdown if we can auto-approve
						isCountingDown: canAutoApprove,
						countdownSeconds: canAutoApprove ? COUNTDOWN_DURATION : undefined,
					}));
				}
			},
			[state.policy, state.transaction, state.analysis, saveManagerState],
		),

		updatePolicy: useCallback(
			async (settings: AutoApprovalPolicySettings) => {
				const manager = managerRef.current;

				if (!manager) {
					throw new Error('Manager not available');
				}

				await manager.updateSettings(settings);
				await saveManagerState(manager);

				setState((prev) => ({
					...prev,
					currentSettings: settings,
				}));

				// Re-evaluate auto-approval with updated policy settings (don't re-analyze, just re-check)
				if (state.analysis && state.policy && state.analysis.ruleSetId) {
					const canAutoApprove = manager.canAutoApprove(
						state.analysis,
						state.policy,
						settings,
						state.analysis.ruleSetId,
					);

					setState((prev) => ({
						...prev,
						currentSettings: settings,
						hasExistingPolicy: true,
						isApprovalEnabled: true,
						canAutoApprove,
						// Start countdown if transaction is now eligible for auto-approval
						isCountingDown: canAutoApprove,
						countdownSeconds: canAutoApprove ? COUNTDOWN_DURATION : undefined,
						cancelled: false, // Clear cancelled state when policy is updated
						autoApprovalReason: canAutoApprove
							? 'Transaction matches approved rule set'
							: undefined,
					}));

					// Start countdown if we can now auto-approve - already handled in state update above
				}
			},
			[state.analysis, state.policy, saveManagerState],
		),

		disablePolicy: useCallback(async () => {
			const manager = managerRef.current;

			if (!manager) {
				throw new Error('Manager not available');
			}

			await manager.clearPolicy();
			await saveManagerState(manager);

			setState((prev) => ({
				...prev,
				hasExistingPolicy: false,
				isApprovalEnabled: false,
				currentSettings: undefined,
				canAutoApprove: false,
				// Clear cancelled state so auto-approval evaluation can happen again
				cancelled: false,
				isCountingDown: false,
				countdownSeconds: undefined,
			}));
		}, [saveManagerState]),

		cancelCountdown: useCallback(() => {
			clearCountdown();
		}, [clearCountdown]),

		approveTransaction: useCallback(() => {
			clearCountdown();
			setState((prev) => ({ ...prev, shouldAutoApprove: false }));
		}, [clearCountdown]),

		rejectTransaction: useCallback(() => {
			clearCountdown();
			setState((prev) => ({ ...prev, analysisError: 'Transaction rejected by user' }));
		}, [clearCountdown]),

		reset: useCallback(() => {
			clearCountdown();
			setState({
				isAnalyzing: false,
				isCountingDown: false,
				shouldAutoApprove: false,
				cancelled: false,
				hasExistingPolicy: false,
				isApprovalEnabled: false,
				canAutoApprove: false,
			});
		}, [clearCountdown]),
	};

	return [state, actions];
}
