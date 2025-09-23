// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalRuleSet } from '@mysten/wallet-sdk';

function truncatePackageId(fullId: string): string {
	const parts = fullId.split('::');
	if (parts.length >= 3 && parts[0].startsWith('0x')) {
		// Show first 6 and last 4 characters of package ID
		const packageId = parts[0];
		if (packageId.length > 12) {
			const short = `${packageId.slice(0, 6)}...${packageId.slice(-4)}`;
			return `${short}::${parts[1]}::${parts[2]}`;
		}
	}
	return fullId;
}

export interface RuleSetSummary {
	balances?: string[];
	allBalances?: boolean;
	objectTypes?: Array<{
		type: string;
		accessLevel: string;
	}>;
}

export function getRuleSetSummary(ruleSet: AutoApprovalRuleSet): RuleSetSummary {
	const summary: RuleSetSummary = {};

	// Add balance types
	if (ruleSet.rules?.balances?.length) {
		const coinTypes = ruleSet.rules.balances.map((rule) => {
			if (rule.coinType) {
				const parts = rule.coinType.split('::');
				return parts.length >= 3 ? parts[2].toUpperCase() : 'Unknown Coin';
			}
			return 'Unknown Coin';
		});
		summary.balances = coinTypes;
	}

	// Add all balances
	if (ruleSet.rules?.allBalances) {
		summary.allBalances = true;
	}

	// Add object types with access levels
	if (ruleSet.rules?.ownedObjects?.length) {
		summary.objectTypes = ruleSet.rules.ownedObjects.map((rule) => ({
			type: rule.objectType ? truncatePackageId(rule.objectType) : 'Unknown',
			accessLevel: rule.accessLevel || 'unknown',
		}));
	}

	return summary;
}
