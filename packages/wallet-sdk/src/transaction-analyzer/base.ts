// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { TransactionData } from '@mysten/sui/transactions';
import type { CoinFlow } from './rules/coin-flows.js';
import { coinFlowAnalyzer } from './rules/coin-flows.js';
import type { AnalyzedCommandInput } from './rules/inputs.js';
import { inputAnalyzer } from './rules/inputs.js';
import { commandAnalyzer } from './rules/commands.js';
import type { AnalyzedCommand } from './rules/commands.js';
import type { Analyzer } from './analyzer.js';
import { objectAnalyzers } from './rules/objects.js';
import type { AnalyzedObject } from './rules/objects.js';
import type { AnalyzedCoin } from './rules/coins.js';
import { coinsAnalyzer, gasCoinsAnalyzer } from './rules/coins.js';
import { moveFunctionAnalyzer } from './rules/functions.js';

export interface BaseAnalysis {
	bytes: Uint8Array;
	data: TransactionData;
	inputs: AnalyzedCommandInput[];
	commands: AnalyzedCommand[];
	objectIds: string[];
	objects: AnalyzedObject[];
	ownedObjects: AnalyzedObject[];
	objectsById: Map<string, AnalyzedObject>;
	coins: Record<string, AnalyzedCoin>;
	gasCoins: AnalyzedCoin[];
	moveFunctions: Experimental_SuiClientTypes.FunctionResponse[];
	dryRun: Experimental_SuiClientTypes.DryRunTransactionResponse;
	balanceChanges: Experimental_SuiClientTypes.BalanceChange[];
	coinFlows: CoinFlow[];
}

export const baseAnalyzers: {
	[k in keyof BaseAnalysis]: Analyzer<BaseAnalysis[k]>;
} = {
	bytes: (tx, client) => async () => tx.build({ client }),
	data:
		(tx) =>
		async ({ get }) => {
			// ensure the transaction is built first
			await get('bytes');
			return tx.getData();
		},

	dryRun:
		(_tx, client) =>
		async ({ get }) => {
			return client.core.dryRunTransaction({ transaction: await get('bytes') });
		},
	balanceChanges:
		() =>
		async ({ get }) =>
			(await get('dryRun')).transaction.balanceChanges || [],
	moveFunctions: moveFunctionAnalyzer,
	...objectAnalyzers,
	coinFlows: coinFlowAnalyzer,
	coins: coinsAnalyzer,
	gasCoins: gasCoinsAnalyzer,
	inputs: inputAnalyzer,
	commands: commandAnalyzer,
};
