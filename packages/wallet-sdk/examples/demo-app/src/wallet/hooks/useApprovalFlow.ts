// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction } from '@mysten/sui/transactions';
import { Transaction as TransactionClass } from '@mysten/sui/transactions';
import type { SuiClient } from '@mysten/sui/client';
import type { AutoApprovalPolicyData, PolicyManager } from '@mysten/wallet-sdk';
import {
	AUTO_APPROVAL_POLICY_INTENT,
	resolveAutoApprovalPolicy,
	extractCoinFlows,
} from '@mysten/wallet-sdk';

// Removed ApprovalStep enum - component will determine what to render based on state

export interface PolicyContext {
	exists: boolean;
	valid: boolean;
	expired: boolean;
	budgetExhausted: boolean;
	policy?: AutoApprovalPolicyData;
	validationReason?: string;
	remainingBudget?: string;
	totalBudget?: string;
	remainingTransactions?: number;
	totalTransactions?: number;
}

export interface ApprovalFlowState {
	// Analysis state
	isAnalyzing: boolean;
	analysisError?: string;

	// Transaction state
	transaction?: Transaction;

	// Policy state
	policyContext?: PolicyContext;
	collectedPolicies?: AutoApprovalPolicyData[];

	// Auto-approval countdown state
	isCountingDown: boolean;
	countdownSeconds?: number;
	shouldAutoApprove: boolean;
}

export interface ApprovalFlowActions {
	// Policy actions
	approvePolicy: (policy: AutoApprovalPolicyData) => void;
	rejectPolicy: () => void;
	renewPolicy: () => void;
	removePolicy: () => void;

	// Countdown actions
	startCountdown: () => void;
	cancelCountdown: () => void;

	// Transaction actions
	approveTransaction: () => void;
	rejectTransaction: () => void;

	// Reset
	reset: () => void;
}

const COUNTDOWN_DURATION = 3; // seconds

export function useApprovalFlow(
	transactionJson: string | null,
	suiClient?: SuiClient,
	policyManager?: PolicyManager,
	origin?: string,
): [ApprovalFlowState, ApprovalFlowActions] {
	const [state, setState] = useState<ApprovalFlowState>({
		isAnalyzing: false,
		isCountingDown: false,
		shouldAutoApprove: false,
	});

	const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);
	const processedTransactionJsonRef = useRef<string | null>(null);

	const startCountdown = useCallback(() => {
		setState((prev) => ({
			...prev,
			isCountingDown: true,
			countdownSeconds: COUNTDOWN_DURATION,
		}));

		let remaining = COUNTDOWN_DURATION;
		const timer = setInterval(() => {
			remaining -= 1;
			setState((prev) => ({ ...prev, countdownSeconds: remaining }));

			if (remaining <= 0) {
				clearInterval(timer);
				setCountdownTimer(null);
				// Auto-approve - stop countdown and set flag to trigger approval
				setState((prev) => ({
					...prev,
					isCountingDown: false,
					countdownSeconds: undefined,
					shouldAutoApprove: true,
				}));
				console.log('🤖 Auto-approval countdown ended, setting shouldAutoApprove flag');
			}
		}, 1000);

		setCountdownTimer(timer);
	}, []);

	const clearCountdown = useCallback(() => {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			setCountdownTimer(null);
		}
		setState((prev) => ({ ...prev, isCountingDown: false, countdownSeconds: undefined }));
	}, [countdownTimer]);

	// Main analysis function that processes transaction and resolves intents
	const analyzeTransactionAndPolicies = useCallback(
		async (transaction: Transaction) => {
			if (!suiClient || !policyManager || !origin) {
				setState((prev) => ({
					...prev,
					analysisError: 'Missing required dependencies',
					isAnalyzing: false,
				}));
				return;
			}

			try {
				console.log('🔍 Analyzing transaction and policies...');

				// Collect policies from the transaction before building
				const collectedPolicies: AutoApprovalPolicyData[] = [];

				// Create callback to collect policies
				const policyCallback = (data: AutoApprovalPolicyData) => {
					collectedPolicies.push(data);
					console.log('📋 Collected policy via callback:', data);
				};

				// Add the proper intent resolver with callback
				transaction.addIntentResolver(
					AUTO_APPROVAL_POLICY_INTENT,
					async (transactionData: any, options: any, next: () => Promise<void>) => {
						await resolveAutoApprovalPolicy(transactionData, options, next, policyCallback);
					},
				);

				// Build transaction (intent resolver will process any AutoApprovalPolicy intents)
				const builtTransactionBytes = await transaction.build({ client: suiClient });
				await suiClient.dryRunTransactionBlock({
					transactionBlock: builtTransactionBytes,
				});

				console.log('📋 Total policies collected:', collectedPolicies.length);

				// Analyze the transaction to get real costs
				console.log('💰 Analyzing transaction costs...');
				const coinFlows = await extractCoinFlows(transaction, suiClient);

				// Use PolicyManager to analyze the coin flows and get the actual cost
				const analysis = policyManager.analyzeTransaction(coinFlows.outflows);
				console.log('💰 Real transaction cost:', `${Number(analysis.suiCost) / 1_000_000_000} SUI`);

				const validationResult = await policyManager.validateTransaction(origin, [], analysis);

				// Get existing policy state to show current budget information
				const existingPolicyState = await policyManager.getPolicyState(origin);

				const policyContext: PolicyContext = {
					exists:
						validationResult.approved ||
						validationResult.reason?.includes('expired') ||
						validationResult.reason?.includes('budget') ||
						!!existingPolicyState,
					valid: validationResult.approved || false,
					expired:
						(!validationResult.approved && validationResult.reason?.includes('expired')) || false,
					budgetExhausted:
						(!validationResult.approved && validationResult.reason?.includes('budget')) || false,
					policy: existingPolicyState
						? { policy: existingPolicyState.policy, origin: existingPolicyState.origin }
						: undefined,
					validationReason: validationResult.reason,
					// Add current budget information from existing policy state
					remainingBudget: existingPolicyState
						? `${Number(existingPolicyState.policy.budget.maxSui - existingPolicyState.usage.suiSpent) / 1_000_000_000}`
						: undefined,
					totalBudget: existingPolicyState
						? `${Number(existingPolicyState.policy.budget.maxSui) / 1_000_000_000}`
						: undefined,
					remainingTransactions: existingPolicyState
						? existingPolicyState.policy.budget.maxTransactions -
							existingPolicyState.usage.transactionsExecuted
						: undefined,
					totalTransactions: existingPolicyState?.policy.budget.maxTransactions,
				};

				// Update state with analysis results - component decides what to render
				setState((prev) => ({
					...prev,
					isAnalyzing: false,
					analysisError: undefined,
					policyContext,
					collectedPolicies,
				}));

				// Auto-start countdown if policy is valid and approved
				if (policyContext.valid) {
					startCountdown();
				}
			} catch (error) {
				console.error('❌ Error analyzing transaction:', error);
				setState((prev) => ({
					...prev,
					isAnalyzing: false,
					analysisError: `Analysis failed: ${error}`,
				}));
			}
		},
		[suiClient, policyManager, origin, startCountdown],
	);

	// Auto-start analysis when transaction JSON changes
	useEffect(() => {
		if (!transactionJson || processedTransactionJsonRef.current === transactionJson) return;

		processedTransactionJsonRef.current = transactionJson;

		try {
			// Parse the transaction JSON into a Transaction object
			const transaction = TransactionClass.from(transactionJson);

			setState({
				isAnalyzing: true,
				isCountingDown: false,
				shouldAutoApprove: false,
				transaction,
				policyContext: undefined,
				collectedPolicies: undefined,
				analysisError: undefined,
			});

			// Start the analysis process
			analyzeTransactionAndPolicies(transaction);
		} catch (error) {
			console.error('❌ Error parsing transaction JSON:', error);
			setState({
				isAnalyzing: false,
				isCountingDown: false,
				shouldAutoApprove: false,
				transaction: undefined,
				policyContext: undefined,
				collectedPolicies: undefined,
				analysisError: `Failed to parse transaction: ${error}`,
			});
		}
	}, [transactionJson, analyzeTransactionAndPolicies]);

	const actions: ApprovalFlowActions = {
		// Policy actions
		approvePolicy: useCallback(
			(policy: AutoApprovalPolicyData) => {
				console.log('✅ useApprovalFlow: Policy approved, updating state');
				// Clear collected policies and set policy context to approved state
				setState((prev) => ({
					...prev,
					collectedPolicies: [],
					policyContext: {
						exists: true,
						valid: true,
						expired: false,
						budgetExhausted: false,
						policy,
						validationReason: 'Policy approved by user',
						// Add budget information from the new policy
						remainingBudget: `${Number(policy.policy.budget.maxSui) / 1_000_000_000}`,
						totalBudget: `${Number(policy.policy.budget.maxSui) / 1_000_000_000}`,
						remainingTransactions: policy.policy.budget.maxTransactions,
						totalTransactions: policy.policy.budget.maxTransactions,
					},
				}));
				// Start countdown for auto-approval
				startCountdown();
			},
			[startCountdown],
		),

		rejectPolicy: useCallback(() => {
			console.log('❌ useApprovalFlow: Policy rejected, clearing collected policies');
			// Clear collected policies so we fall through to regular signing modal
			setState((prev) => ({
				...prev,
				collectedPolicies: [],
				policyContext: undefined,
			}));
		}, []),

		renewPolicy: useCallback(() => {
			console.log('🔄 Policy renewal requested');
			setState((prev) => ({ ...prev, policyContext: undefined }));
		}, []),

		removePolicy: useCallback(() => {
			console.log('🗑️ Policy removed - marking as rejected');
			// Mark policy as rejected so we don't ask for approval again
			setState((prev) => ({
				...prev,
				collectedPolicies: [],
				policyContext: undefined,
			}));
		}, []),

		// Countdown actions
		startCountdown,

		cancelCountdown: useCallback(() => {
			console.log('⏹️ Countdown canceled');
			clearCountdown();
		}, [clearCountdown]),

		// Transaction actions
		approveTransaction: useCallback(() => {
			console.log('✅ Transaction approved');
			clearCountdown();
			// Reset auto-approval flag when transaction is approved
			setState((prev) => ({ ...prev, shouldAutoApprove: false }));
			// Transaction execution happens in parent component
		}, [clearCountdown]),

		rejectTransaction: useCallback(() => {
			console.log('❌ useApprovalFlow: Transaction rejected');
			clearCountdown();
			setState((prev) => ({ ...prev, analysisError: 'Transaction rejected by user' }));
		}, [clearCountdown]),

		// Reset
		reset: useCallback(() => {
			clearCountdown();
			setState({
				isAnalyzing: false,
				isCountingDown: false,
				shouldAutoApprove: false,
			});
		}, [clearCountdown]),
	};

	return [state, actions];
}
