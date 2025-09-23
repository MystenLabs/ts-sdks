// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/dist/cjs/experimental';

export interface TransactionAnalysis {
	digest: string;
	autoApproved: boolean;
	ruleSetId: string | null; // The extracted rule set ID from AutoApproval intent
	coinOutflows: CoinOutflow[];
	usedObjects: UsedObject[];
	// TODO: this should be based on `core` API balance changes
	expectedBalanceChanges: Record<string, CoinOutflow[]>;
	// USD cost calculations
	estimatedUsdCost?: number;
	// Transaction structure for UI display
	inputs: any[];
	commands: any[];
}

export interface CoinOutflow {
	coinType: string;
	balance: string;
}

export interface UsedObject {
	id: string;
	version: string;
	digest: string;
	objectType: string;
	owner: Experimental_SuiClientTypes.ObjectOwner;
	accessType: 'read' | 'mutate' | 'transfer';
}
