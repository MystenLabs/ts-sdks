// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { TransactionDataBuilder } from '@mysten/sui/transactions';
import { Commands } from '@mysten/sui/transactions';
import type { AutoApprovalPolicyData } from '../policy/types.js';

// Custom intent identifier
export const AUTO_APPROVAL_POLICY_INTENT = 'AutoApprovalPolicy';

// Callback type for wallet to handle policy data
export type PolicyCallback = (data: AutoApprovalPolicyData) => void;

/**
 * Factory function to create the AutoApprovalPolicy intent (similar to coinWithBalance).
 *
 * @param data - The policy data to include in the intent
 * @param callback - Optional callback for wallets to process policy data before removal
 */
export function autoApprovalPolicy(data: AutoApprovalPolicyData, callback?: PolicyCallback) {
	return (tx: Transaction): TransactionResult => {
		// Register the intent resolver with optional callback support
		tx.addIntentResolver(AUTO_APPROVAL_POLICY_INTENT, (transactionData, options, next) =>
			resolveAutoApprovalPolicy(transactionData, options, next, callback),
		);

		// Add the intent command to the transaction using Commands API
		return tx.add(
			Commands.Intent({
				name: AUTO_APPROVAL_POLICY_INTENT,
				inputs: {},
				data: data as unknown as Record<string, unknown>,
			}),
		);
	};
}

// Intent resolver that processes policy data through callback (if provided) then removes the intent
export async function resolveAutoApprovalPolicy(
	transactionData: TransactionDataBuilder,
	_options: any,
	next: () => Promise<void>,
	callback?: PolicyCallback,
) {
	// Find AutoApprovalPolicy intents before they get resolved
	const autoApprovalIntents = transactionData.commands.filter(
		(command: any) =>
			command.$kind === '$Intent' && command.$Intent.name === AUTO_APPROVAL_POLICY_INTENT,
	);

	// Process each policy through the callback if provided
	autoApprovalIntents.forEach((command: any) => {
		if (callback) {
			callback(command.$Intent.data);
		}
	});

	// Find and replace AutoApprovalPolicy intents with empty command arrays
	for (const [index, command] of transactionData.commands.entries()) {
		if (command.$kind === '$Intent' && command.$Intent.name === AUTO_APPROVAL_POLICY_INTENT) {
			// Replace the intent command with an empty array of commands
			transactionData.replaceCommand(index, []);
		}
	}

	// Call next to continue the plugin chain
	await next();
}
