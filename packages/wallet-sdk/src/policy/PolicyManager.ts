// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CoinFlow } from '../transaction-linter.js';
import type {
	AutoApprovalPolicyData,
	AutoApprovalPolicySchema,
	PolicyState,
	PolicyStorage,
	PolicyUsage,
	PolicyValidationResult,
	TransactionAnalysis,
	TransactionType,
} from './types.js';
import { TransactionType as PolicyTransactionType } from './types.js';

/**
 * Manages auto-approval policies for a wallet
 */
export class PolicyManager {
	private storage: PolicyStorage;

	constructor(storage: PolicyStorage) {
		this.storage = storage;
	}

	/**
	 * Processes a policy request from a dApp
	 */
	async processPolicyRequest(data: AutoApprovalPolicyData): Promise<{
		needsUserApproval: boolean;
		existingState?: PolicyState;
		error?: string;
	}> {
		try {
			// Validate the policy schema
			const validationError = this.validatePolicySchema(data.policy);
			if (validationError) {
				return { needsUserApproval: false, error: validationError };
			}

			// Check if we have an existing policy for this origin
			const existingState = await this.storage.getPolicy(data.origin);

			if (existingState) {
				// Check if the new policy matches the existing one using content-based hash
				const existingHash = this.generatePolicyId({ policy: existingState.policy, origin: data.origin });
				const newHash = this.generatePolicyId(data);
				console.log('📋 Policy hash match:', existingHash === newHash);
				if (existingHash === newHash) {
					// Policy matches, check if it's still valid and active
					const isValid = this.isPolicyValid(existingState);
					if (!isValid) {
						// Debug why policy is invalid
						const now = Date.now();
						const expired = existingState.policy.expiresAt <= now;
						const budgetExhausted = existingState.usage.suiSpent >= existingState.policy.budget.maxSui;
						const txLimitReached = existingState.usage.transactionsExecuted >= existingState.policy.budget.maxTransactions;
						const timeWindowExpired = existingState.usage.firstTransactionAt > 0 && now - existingState.usage.firstTransactionAt > existingState.policy.budget.timeWindow;
						console.log('⚠️ Policy invalid:', { expired, budgetExhausted, txLimitReached, timeWindowExpired, isActive: existingState.isActive });
					}
					
					if (isValid) {
						return { needsUserApproval: false, existingState };
					} else {
						// Policy expired or exhausted - return existing state so transaction can be validated and show renewal option
						return { needsUserApproval: false, existingState };
					}
				} else {
					// Policy changed, needs user approval
					return { needsUserApproval: true };
				}
			} else {
				// No existing policy, needs user approval
				return { needsUserApproval: true };
			}
		} catch (error) {
			return {
				needsUserApproval: false,
				error: `Failed to process policy request: ${error}`,
			};
		}
	}

	/**
	 * Creates a new policy state when user approves a policy
	 */
	async createPolicyState(data: AutoApprovalPolicyData): Promise<PolicyState> {
		const now = Date.now();
		// Generate policy ID based on content characteristics rather than timestamp
		// This ensures identical policies get the same ID for reuse
		const policyHash = this.generatePolicyId(data);
		const state: PolicyState = {
			id: `policy_${data.origin}_${policyHash}`,
			policy: data.policy,
			origin: data.origin,
			createdAt: now,
			lastUsedAt: now,
			usage: {
				suiSpent: 0n,
				transactionsExecuted: 0,
				firstTransactionAt: 0,
			},
			isActive: true,
		};

		await this.storage.setPolicy(state);
		return state;
	}

	/**
	 * Generates a consistent policy ID based on policy content characteristics
	 * This ensures identical policies get the same ID for reuse
	 */
	private generatePolicyId(data: AutoApprovalPolicyData): string {
		const policy = data.policy;
		// Create a hash based on policy characteristics (excluding timestamps)
		const characteristics = {
			name: policy.name,
			maxSui: policy.budget.maxSui.toString(),
			maxTransactions: policy.budget.maxTransactions,
			timeWindow: policy.budget.timeWindow,
			allowedTypes: policy.constraints.allowedTransactionTypes?.sort(),
			maxTransactionValue: policy.constraints.maxTransactionValue.toString(),
			allowedRecipients: policy.constraints.allowedRecipients?.sort(),
			allowedContracts: policy.constraints.allowedContracts?.sort(),
		};
		
		// Simple hash function - could be replaced with crypto.subtle.digest for production
		const str = JSON.stringify(characteristics);
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(16);
	}

	/**
	 * Gets the current policy state for an origin
	 */
	async getPolicyState(origin: string): Promise<PolicyState | null> {
		try {
			return await this.storage.getPolicy(origin);
		} catch (error) {
			console.error('Failed to get policy state:', error);
			return null;
		}
	}

	/**
	 * Validates a transaction against an active policy (without updating budget)
	 */
	async validateTransaction(
		origin: string,
		_outflows: CoinFlow[],
		analysis: TransactionAnalysis,
	): Promise<PolicyValidationResult> {
		try {
			const policyState = await this.storage.getPolicy(origin);
			if (!policyState) {
				return {
					approved: false,
					reason: 'No active policy found',
				};
			}
			
			// If policy exists but is invalid, still proceed with budget validation to give specific error
			const isValidPolicy = this.isPolicyValid(policyState);
			if (!isValidPolicy) {
				// Check what specifically is wrong with the policy for better error messages
				const now = Date.now();
				
				if (policyState.policy.expiresAt <= now) {
					return {
						approved: false,
						reason: 'Policy has expired',
					};
				}
				
				if (!policyState.isActive) {
					return {
						approved: false,
						reason: 'Policy is not active',
					};
				}
				
				if (policyState.usage.firstTransactionAt > 0 && 
					now - policyState.usage.firstTransactionAt > policyState.policy.budget.timeWindow) {
					return {
						approved: false,
						reason: 'Policy time window has expired',
					};
				}
				
				// If we get here, it's likely budget/transaction limits - let budget validation handle it
			}

			// Check budget constraints
			const budgetResult = this.validateBudget(policyState, analysis.suiCost);
			if (!budgetResult.approved) {
				return budgetResult;
			}

			// TODO: Transaction constraint validation disabled for now - only checking balances
			// const constraintResult = this.validateConstraints(policyState.policy, analysis);
			// if (!constraintResult.approved) {
			//   return constraintResult;
			// }

			// All checks passed - return what the updated state would be without persisting it yet
			const updatedState = this.updatePolicyUsage(policyState, analysis.suiCost);

			return {
				approved: true,
				updatedState,
			};
		} catch (error) {
			return {
				approved: false,
				reason: `Policy validation failed: ${error}`,
			};
		}
	}

	/**
	 * Updates policy budget after a successful transaction
	 */
	async updatePolicyAfterTransaction(
		origin: string,
		analysis: TransactionAnalysis,
	): Promise<{ success: boolean; updatedState?: PolicyState; error?: string }> {
		console.log('🔍 PolicyManager.updatePolicyAfterTransaction called with:', {
			origin,
			suiCost: analysis.suiCost,
			formattedCost: `${Number(analysis.suiCost) / 1_000_000_000} SUI`,
		});
		console.log('🔍 PolicyManager call stack:', new Error().stack);
		try {
			const policyState = await this.storage.getPolicy(origin);
			if (!policyState) {
				return { success: false, error: 'No policy found for origin' };
			}

			// Update the policy usage and persist it
			const updatedState = this.updatePolicyUsage(policyState, analysis.suiCost);
			await this.storage.setPolicy(updatedState);

			return { success: true, updatedState };
		} catch (error) {
			return { success: false, error: `Failed to update policy: ${error}` };
		}
	}

	/**
	 * Analyzes a transaction to extract relevant information for policy validation
	 */
	analyzeTransaction(outflows: CoinFlow[]): TransactionAnalysis {
		// Calculate total SUI cost from outflows
		let totalSuiCost = 0n;
		const recipients: string[] = [];
		const contracts: string[] = [];
		const functions: string[] = [];
		const transactionTypes = new Set<TransactionType>();

		for (const flow of outflows) {
			// Handle both short and long form SUI coin type addresses
			if (flow.coinType === '0x2::sui::SUI' || flow.coinType.endsWith('::sui::SUI')) {
				// All outflows are negative/costs, so we take the absolute value
				totalSuiCost += BigInt(Math.abs(Number(flow.amount)));
			}

			// Determine transaction type based on coin flow
			if (flow.coinType === '0x2::sui::SUI' || flow.coinType.endsWith('::sui::SUI')) {
				transactionTypes.add(PolicyTransactionType.TRANSFER_SUI);
			} else {
				transactionTypes.add(PolicyTransactionType.TRANSFER_OBJECTS);
			}
		}

		return {
			suiCost: totalSuiCost,
			transactionTypes: Array.from(transactionTypes),
			recipients, // Would need transaction details to extract recipients
			contracts, // Would need more sophisticated analysis for move calls
			functions, // Would need more sophisticated analysis for move calls
		};
	}

	private validatePolicySchema(policy: AutoApprovalPolicySchema): string | null {
		if (policy.version !== '1.0') {
			return 'Unsupported policy version';
		}

		if (!policy.name || policy.name.length === 0) {
			return 'Policy name is required';
		}

		if (!policy.description || policy.description.length === 0) {
			return 'Policy description is required';
		}

		if (policy.expiresAt <= Date.now()) {
			return 'Policy has already expired';
		}

		if (policy.budget.maxSui <= 0n) {
			return 'Budget maxSui must be greater than 0';
		}

		if (policy.budget.maxTransactions <= 0) {
			return 'Budget maxTransactions must be greater than 0';
		}

		if (policy.budget.timeWindow <= 0) {
			return 'Budget timeWindow must be greater than 0';
		}

		return null;
	}


	private isPolicyValid(state: PolicyState): boolean {
		const now = Date.now();

		// Check if policy has expired
		if (state.policy.expiresAt <= now) {
			return false;
		}

		// Check if policy is still active
		if (!state.isActive) {
			return false;
		}

		// Check if time window has passed
		if (
			state.usage.firstTransactionAt > 0 &&
			now - state.usage.firstTransactionAt > state.policy.budget.timeWindow
		) {
			return false;
		}

		// Check if transaction limit reached
		if (state.usage.transactionsExecuted >= state.policy.budget.maxTransactions) {
			return false;
		}

		// Check if budget exhausted
		if (state.usage.suiSpent >= state.policy.budget.maxSui) {
			return false;
		}

		return true;
	}

	private validateBudget(state: PolicyState, transactionCost: bigint): PolicyValidationResult {
		// Check if transaction would exceed remaining budget
		const remainingBudget = state.policy.budget.maxSui - state.usage.suiSpent;
		if (transactionCost > remainingBudget) {
			return {
				approved: false,
				reason: `Transaction cost (${transactionCost}) exceeds remaining budget (${remainingBudget})`,
			};
		}

		// Check if transaction would exceed transaction limit
		const remainingTransactions =
			state.policy.budget.maxTransactions - state.usage.transactionsExecuted;
		if (remainingTransactions <= 0) {
			return {
				approved: false,
				reason: 'Transaction limit exceeded',
			};
		}

		return { approved: true };
	}

	// TODO: Constraint validation disabled for now - only validating balances/budgets
	// private validateConstraints(
	// 	policy: AutoApprovalPolicySchema,
	// 	analysis: TransactionAnalysis,
	// ): PolicyValidationResult {
	// 	// Check transaction value limit
	// 	if (analysis.suiCost > policy.constraints.maxTransactionValue) {
	// 		return {
	// 			approved: false,
	// 			reason: `Transaction value (${analysis.suiCost}) exceeds policy limit (${policy.constraints.maxTransactionValue})`,
	// 		};
	// 	}

	// 	// Check allowed transaction types
	// 	for (const txType of analysis.transactionTypes) {
	// 		if (!policy.constraints.allowedTransactionTypes.includes(txType)) {
	// 			return {
	// 				approved: false,
	// 				reason: `Transaction type ${txType} not allowed by policy`,
	// 			};
	// 		}
	// 	}

	// 	// Check allowed recipients
	// 	if (policy.constraints.allowedRecipients && policy.constraints.allowedRecipients.length > 0) {
	// 		for (const recipient of analysis.recipients) {
	// 			if (!policy.constraints.allowedRecipients.includes(recipient)) {
	// 				return {
	// 					approved: false,
	// 					reason: `Recipient ${recipient} not allowed by policy`,
	// 				};
	// 			}
	// 		}
	// 	}

	// 	// Check allowed contracts and functions (would be implemented for move calls)
	// 	// ... additional constraint validation ...

	// 	return { approved: true };
	// }

	/**
	 * Removes a policy for a given origin
	 */
	async removePolicy(origin: string): Promise<void> {
		await this.storage.removePolicy(origin);
	}

	private updatePolicyUsage(state: PolicyState, transactionCost: bigint): PolicyState {
		const now = Date.now();
		const updatedUsage: PolicyUsage = {
			suiSpent: state.usage.suiSpent + transactionCost,
			transactionsExecuted: state.usage.transactionsExecuted + 1,
			firstTransactionAt: state.usage.firstTransactionAt || now,
		};

		return {
			...state,
			usage: updatedUsage,
			lastUsedAt: now,
		};
	}
}
