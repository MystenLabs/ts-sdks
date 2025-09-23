// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { TransactionDataBuilder } from '@mysten/sui/transactions';
import { Commands } from '@mysten/sui/transactions';

// Custom intent identifier for rule set selection
export const AUTO_APPROVAL_INTENT = 'AutoApproval';

/**
 * Factory function to create the AutoApproval intent for rule set selection.
 *
 * This intent tells the wallet which rule set ID should be used for auto-approval analysis.
 * Unlike the old autoApprovalPolicy intent which embedded policy data, this just provides
 * a hint about which rule set from the app's policy should be used.
 *
 * @param ruleSetId - The rule set ID to use from the app's auto-approval policy
 */
export function autoApproval(ruleSetId: string) {
	return (tx: Transaction): TransactionResult => {
		// Register the intent resolver (only if not already registered)
		try {
			tx.addIntentResolver(AUTO_APPROVAL_INTENT, (transactionData, options, next) =>
				resolveAutoApproval(transactionData, options, next),
			);
		} catch (error) {
			// Resolver already exists, that's fine - multiple AutoApproval intents can share the same resolver
		}

		// Add the intent command to the transaction using Commands API
		const result = tx.add(
			Commands.Intent({
				name: AUTO_APPROVAL_INTENT,
				inputs: {},
				data: { ruleSetId } as Record<string, unknown>,
			}),
		);

		return result;
	};
}

// Intent resolver that removes the intent after wallets extract the rule set ID
export async function resolveAutoApproval(
	transactionData: TransactionDataBuilder,
	_options: any,
	next: () => Promise<void>,
) {
	// Find AutoApproval intents and remove them by replacing with empty array
	// We iterate backwards to avoid index shifting issues when removing commands
	for (let index = transactionData.commands.length - 1; index >= 0; index--) {
		const command = transactionData.commands[index];
		if (command.$kind === '$Intent' && command.$Intent.name === AUTO_APPROVAL_INTENT) {
			// Replace the intent command with empty array (effectively removes it)
			transactionData.replaceCommand(index, []);
		}
	}

	// Continue with normal transaction processing
	await next();
}
