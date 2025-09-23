// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export * from './transaction-analyzer/index.js';

export { autoApproval, resolveAutoApproval, AUTO_APPROVAL_INTENT } from './intents/AutoApproval.js';

// Auto-approval system exports
export { AutoApprovalManager } from './auto-approvals/manager.js';
export { TransactionAnalyzer } from './auto-approvals/transaction-analyzer.js';
export {
	type AutoApprovalPolicy,
	type AutoApprovalRuleSet,
	type AutoApprovalObjectTypeRule,
	type CoinBalanceRule,
	type AllBalancesRule,
	type AutoApprovalPolicySettings,
	type ObjectPermissions,
} from './auto-approvals/types/index.js';

export {
	type TransactionAnalysis,
	type CoinOutflow,
	type UsedObject,
} from './auto-approvals/types/analysis.js';
