// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalOperation } from '@mysten/wallet-sdk';

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

export interface OperationSummary {
	balances?: string[];
	anyBalance?: boolean;
	objectTypes?: Array<{
		type: string;
		accessLevel: string;
	}>;
}

export function getOperationSummary(operation: AutoApprovalOperation): OperationSummary {
	const summary: OperationSummary = {};

	// Add balance types
	if (operation.permissions?.balances?.length) {
		const coinTypes = operation.permissions.balances.map((rule) => {
			if (rule.coinType) {
				const parts = rule.coinType.split('::');
				return parts.length >= 3 ? parts[2].toUpperCase() : 'Unknown Coin';
			}
			return 'Unknown Coin';
		});
		summary.balances = coinTypes;
	}

	// Add all balances
	if (operation.permissions?.anyBalance) {
		summary.anyBalance = true;
	}

	// Add object types with access levels
	if (operation.permissions?.ownedObjects?.length) {
		summary.objectTypes = operation.permissions.ownedObjects.map((rule) => ({
			type: rule.objectType ? truncatePackageId(rule.objectType) : 'Unknown',
			accessLevel: rule.accessLevel || 'unknown',
		}));
	}

	return summary;
}
