// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Policy schema defining what the dApp is requesting permission for
 */
export interface AutoApprovalPolicySchema {
	/** Version of the policy schema for future compatibility */
	version: '1.0';
	/** Human-readable name for the policy */
	name: string;
	/** Detailed description of what this policy covers */
	description: string;
	/** Expiry time for the policy (Unix timestamp in milliseconds) */
	expiresAt: number;
	/** Budget constraints for the policy */
	budget: PolicyBudget;
	/** Transaction constraints */
	constraints: PolicyConstraints;
}

/**
 * Budget limitations for auto-approval
 */
export interface PolicyBudget {
	/** Maximum SUI that can be spent under this policy (in MIST - 1 SUI = 1,000,000,000 MIST) */
	maxSui: bigint;
	/** Maximum number of transactions allowed under this policy */
	maxTransactions: number;
	/** Time window for the budget (in milliseconds) */
	timeWindow: number;
}

/**
 * Transaction constraints that must be met for auto-approval
 */
export interface PolicyConstraints {
	/** Allowed transaction types */
	allowedTransactionTypes: TransactionType[];
	/** Maximum transaction value (in MIST) */
	maxTransactionValue: bigint;
	/** Allowed recipient addresses (empty means any recipient allowed) */
	allowedRecipients?: string[];
	/** Allowed contract addresses for moveCall transactions */
	allowedContracts?: string[];
	/** Allowed function names for moveCall transactions */
	allowedFunctions?: string[];
}

/**
 * Types of transactions that can be auto-approved
 */
export enum TransactionType {
	TRANSFER_SUI = 'transfer_sui',
	TRANSFER_OBJECTS = 'transfer_objects',
	MOVE_CALL = 'move_call',
	SPLIT_COINS = 'split_coins',
	MERGE_COINS = 'merge_coins',
}

/**
 * Current state of an active policy
 */
export interface PolicyState {
	/** Unique identifier for this policy state */
	id: string;
	/** The original policy schema */
	policy: AutoApprovalPolicySchema;
	/** dApp origin that created this policy */
	origin: string;
	/** When this policy was created/accepted (Unix timestamp) */
	createdAt: number;
	/** When this policy was last used (Unix timestamp) */
	lastUsedAt: number;
	/** Current budget usage */
	usage: PolicyUsage;
	/** Whether this policy is currently active */
	isActive: boolean;
}

/**
 * Tracks current usage against the policy budget
 */
export interface PolicyUsage {
	/** Amount of SUI spent under this policy (in MIST) */
	suiSpent: bigint;
	/** Number of transactions executed under this policy */
	transactionsExecuted: number;
	/** Timestamp of first transaction under this policy (for time window tracking) */
	firstTransactionAt: number;
}

/**
 * Result of policy validation
 */
export interface PolicyValidationResult {
	/** Whether the transaction passes policy validation */
	approved: boolean;
	/** If not approved, the reason why */
	reason?: string;
	/** Updated policy state after this transaction (if approved) */
	updatedState?: PolicyState;
}

/**
 * Data structure passed through the AutoApprovalPolicy intent
 */
export interface AutoApprovalPolicyData {
	/** The policy being requested */
	policy: AutoApprovalPolicySchema;
	/** dApp origin requesting the policy */
	origin: string;
}

/**
 * Interface for policy persistence
 */
export interface PolicyStorage {
	/** Get a policy by origin */
	getPolicy(origin: string): Promise<PolicyState | null>;
	/** Store or update a policy */
	setPolicy(state: PolicyState): Promise<void>;
	/** Remove a policy */
	removePolicy(origin: string): Promise<void>;
	/** Get all active policies */
	getAllPolicies(): Promise<PolicyState[]>;
}

/**
 * Transaction analysis result from the wallet
 */
export interface TransactionAnalysis {
	/** Estimated SUI cost of the transaction */
	suiCost: bigint;
	/** Types of transactions in this block */
	transactionTypes: TransactionType[];
	/** Recipient addresses involved */
	recipients: string[];
	/** Contract addresses called (for move calls) */
	contracts: string[];
	/** Function names called (for move calls) */
	functions: string[];
}
