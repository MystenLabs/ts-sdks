// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export interface AutoApprovalPolicy {
	version: '1.0.0';
	origin: string;
	ruleSets: AutoApprovalRuleSet[];
	suggestedSettings: Record<
		// network or chain?
		string,
		Partial<AutoApprovalPolicySettings>
	>;
	defaultRuleSet: null | Record<string, string>;
}

export interface AutoApprovalRuleSet {
	id: string;
	description: string;
	network: string; // Should we use chain?
	rules: {
		// Request access to objects the user already owns
		ownedObjects?: AutoApprovalObjectTypeRule[];
		// Request access to objects created in this session
		sessionCreatedObjects?: AutoApprovalObjectTypeRule[];
		// Request access to balances of specific coin types
		balances?: CoinBalanceRule[];
		// Request access to all coin balances
		allBalances?: AllBalancesRule;
	};
}

export interface BaseRule {
	description: string;
}

export interface AutoApprovalObjectTypeRule extends BaseRule {
	$kind: 'ObjectTypeRule';
	objectType: string;
	accessLevel: ObjectPermissions;
}

export interface CoinBalanceRule extends BaseRule {
	$kind: 'CoinBalanceRule';
	coinType: string;
}

export interface AllBalancesRule extends BaseRule {
	$kind: 'AllBalancesRule';
}

export type ObjectPermissions = 'read' | 'mutate' | 'transfer';

export interface AutoApprovalPolicySettings {
	remainingTransactions: null | number;
	expiration: string;
	usdBudget: null | number;
	approvedRuleSets: string[];
	coinBudgets: {
		[coinType: string]: number;
	};
}
