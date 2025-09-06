// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalPolicyData, AutoApprovalPolicySchema } from '@mysten/wallet-sdk';
import { TransactionType } from '@mysten/wallet-sdk';

/**
 * Creates a realistic auto-approval policy for SUI transfers
 */
export function createTransferPolicy(
	maxSuiAmount: number,
	maxTransactions: number = 10,
	durationHours: number = 24,
): AutoApprovalPolicyData {
	const now = Date.now();
	const expiresAt = now + durationHours * 60 * 60 * 1000; // Convert hours to milliseconds
	const timeWindow = durationHours * 60 * 60 * 1000;

	// Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
	const maxSuiInMist = BigInt(maxSuiAmount * 1_000_000_000);
	const maxTransactionValueInMist = BigInt(Math.min(maxSuiAmount * 0.5, 1) * 1_000_000_000); // Max 50% of budget per transaction, or 1 SUI max

	const policy: AutoApprovalPolicySchema = {
		version: '1.0',
		name: `Transfer Policy (${maxSuiAmount} SUI)`,
		description: `Auto-approve up to ${maxSuiAmount} SUI in transfers over the next ${durationHours} hours. Maximum ${maxTransactions} transactions allowed.`,
		expiresAt,
		budget: {
			maxSui: maxSuiInMist,
			maxTransactions,
			timeWindow,
		},
		constraints: {
			allowedTransactionTypes: [TransactionType.TRANSFER_SUI, TransactionType.SPLIT_COINS],
			maxTransactionValue: maxTransactionValueInMist,
			// Allow any recipients for demo purposes
			allowedRecipients: undefined,
			allowedContracts: undefined,
			allowedFunctions: undefined,
		},
	};

	return {
		policy,
		origin: window.location.origin,
	};
}

/**
 * Creates a more restrictive policy for specific recipient
 */
export function createRestrictedTransferPolicy(
	maxSuiAmount: number,
	allowedRecipients: string[],
	maxTransactions: number = 5,
	durationHours: number = 1,
): AutoApprovalPolicyData {
	const now = Date.now();
	const expiresAt = now + durationHours * 60 * 60 * 1000;
	const timeWindow = durationHours * 60 * 60 * 1000;

	const maxSuiInMist = BigInt(maxSuiAmount * 1_000_000_000);
	const maxTransactionValueInMist = BigInt(Math.min(maxSuiAmount * 0.2, 0.1) * 1_000_000_000); // Max 20% of budget per transaction, or 0.1 SUI max

	const policy: AutoApprovalPolicySchema = {
		version: '1.0',
		name: `Restricted Transfer Policy (${maxSuiAmount} SUI)`,
		description: `Auto-approve up to ${maxSuiAmount} SUI in transfers to specific addresses over the next ${durationHours} hour(s). Maximum ${maxTransactions} transactions allowed.`,
		expiresAt,
		budget: {
			maxSui: maxSuiInMist,
			maxTransactions,
			timeWindow,
		},
		constraints: {
			allowedTransactionTypes: [TransactionType.TRANSFER_SUI],
			maxTransactionValue: maxTransactionValueInMist,
			allowedRecipients,
			allowedContracts: undefined,
			allowedFunctions: undefined,
		},
	};

	return {
		policy,
		origin: window.location.origin,
	};
}

/**
 * Formats a policy for display
 */
export function formatPolicyForDisplay(policy: AutoApprovalPolicySchema): {
	maxSuiFormatted: string;
	maxTransactionValueFormatted: string;
	expiresAtFormatted: string;
	timeWindowFormatted: string;
} {
	const maxSuiFormatted = `${Number(policy.budget.maxSui) / 1_000_000_000} SUI`;
	const maxTransactionValueFormatted = `${Number(policy.constraints.maxTransactionValue) / 1_000_000_000} SUI`;
	const expiresAtFormatted = new Date(policy.expiresAt).toLocaleString();
	const timeWindowHours = policy.budget.timeWindow / (1000 * 60 * 60);
	const timeWindowFormatted = `${timeWindowHours} hour${timeWindowHours !== 1 ? 's' : ''}`;

	return {
		maxSuiFormatted,
		maxTransactionValueFormatted,
		expiresAtFormatted,
		timeWindowFormatted,
	};
}
