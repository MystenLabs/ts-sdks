// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PolicyState, PolicyStorage } from '@mysten/wallet-sdk';

/**
 * localStorage-based implementation of PolicyStorage for the demo wallet
 */
export class DemoWalletPolicyStorage implements PolicyStorage {
	private readonly storageKey = 'demo_wallet_policies';

	async getPolicy(origin: string): Promise<PolicyState | null> {
		try {
			const policies = this.loadPolicies();
			const policy = policies[origin] || null;
			console.log('🔍 Policy lookup from localStorage:', {
				origin,
				found: !!policy,
				totalPoliciesInStorage: Object.keys(policies).length,
				policyId: policy?.id || 'none',
			});
			return policy;
		} catch (error) {
			console.error('Failed to get policy from localStorage:', error);
			return null;
		}
	}

	async setPolicy(state: PolicyState): Promise<void> {
		try {
			const policies = this.loadPolicies();
			policies[state.origin] = state;
			this.savePolicies(policies);
			console.log('📦 Policy saved to localStorage:', {
				origin: state.origin,
				policyId: state.id,
				totalPoliciesStored: Object.keys(policies).length,
			});
		} catch (error) {
			console.error('Failed to save policy to localStorage:', error);
			throw error;
		}
	}

	async removePolicy(origin: string): Promise<void> {
		try {
			const policies = this.loadPolicies();
			delete policies[origin];
			this.savePolicies(policies);
		} catch (error) {
			console.error('Failed to remove policy from localStorage:', error);
			throw error;
		}
	}

	async getAllPolicies(): Promise<PolicyState[]> {
		try {
			const policies = this.loadPolicies();
			return Object.values(policies);
		} catch (error) {
			console.error('Failed to get all policies from localStorage:', error);
			return [];
		}
	}

	private loadPolicies(): Record<string, PolicyState> {
		if (typeof localStorage === 'undefined') {
			return {};
		}

		const data = localStorage.getItem(this.storageKey);
		if (!data) {
			return {};
		}

		try {
			const parsed = JSON.parse(data);
			// Convert bigint fields back from strings
			const policies: Record<string, PolicyState> = {};

			for (const [origin, state] of Object.entries(parsed)) {
				const typedState = state as any;
				policies[origin] = {
					...typedState,
					policy: {
						...typedState.policy,
						budget: {
							...typedState.policy.budget,
							maxSui: BigInt(typedState.policy.budget.maxSui),
						},
						constraints: {
							...typedState.policy.constraints,
							maxTransactionValue: BigInt(typedState.policy.constraints.maxTransactionValue),
						},
					},
					usage: {
						...typedState.usage,
						suiSpent: BigInt(typedState.usage.suiSpent),
					},
				};
			}

			return policies;
		} catch (error) {
			console.error('Failed to parse policies from localStorage:', error);
			return {};
		}
	}

	private savePolicies(policies: Record<string, PolicyState>): void {
		if (typeof localStorage === 'undefined') {
			return;
		}

		try {
			// Convert bigint fields to strings for JSON serialization
			const serializable: Record<string, any> = {};

			for (const [origin, state] of Object.entries(policies)) {
				serializable[origin] = {
					...state,
					policy: {
						...state.policy,
						budget: {
							...state.policy.budget,
							maxSui: state.policy.budget.maxSui.toString(),
						},
						constraints: {
							...state.policy.constraints,
							maxTransactionValue: state.policy.constraints.maxTransactionValue.toString(),
						},
					},
					usage: {
						...state.usage,
						suiSpent: state.usage.suiSpent.toString(),
					},
				};
			}

			localStorage.setItem(this.storageKey, JSON.stringify(serializable));
		} catch (error) {
			console.error('Failed to save policies to localStorage:', error);
			throw error;
		}
	}

	/**
	 * Clear all stored policies (useful for testing or reset)
	 */
	async clearAllPolicies(): Promise<void> {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(this.storageKey);
		}
	}
}
