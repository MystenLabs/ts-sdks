// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Analyzer, AnalyzerResult } from '../transaction-analyzer/analyzer.js';
import { createAnalyzer } from '../transaction-analyzer/index.js';
import { analyzers } from '../transaction-analyzer/index.js';
import type { BalanceFlowsAnalyzerOptions } from '../transaction-analyzer/rules/balance-flows.js';
import type { CoinFlowsResult } from '../transaction-analyzer/rules/coin-flows.js';
import type {
	CoinValueAnalysis,
	CoinValueAnalyzerOptions,
} from '../transaction-analyzer/rules/coin-value.js';
import type { AnalyzedObject } from '../transaction-analyzer/rules/objects.js';
import { extractOperationType, OPERATION_INTENT } from './intent.js';

const operationType = createAnalyzer({
	dependencies: {
		bytes: analyzers.bytes,
	},
	analyze: (_options, tx) => {
		let operationType: string | null = null;
		tx.addIntentResolver(
			OPERATION_INTENT,
			extractOperationType((type) => {
				operationType = type;
			}),
		);

		return async () => {
			return {
				result: operationType,
			};
		};
	},
}) as Analyzer<string | null, { client: ClientWithCoreApi }, { bytes: Uint8Array }>;

export interface AutoApprovalAnalysis {
	operationType: string | null;
	bytes: Uint8Array;
	coinFlows: CoinFlowsResult;
	accessLevel: Record<string, 'read' | 'mutate' | 'transfer'>;
	ownedObjects: AnalyzedObject[];
	digest: string;
	coinValues: CoinValueAnalysis;
}

export const autoApprovalAnalyzer: Analyzer<
	AutoApprovalAnalysis,
	{ client: ClientWithCoreApi; balanceFlows?: BalanceFlowsAnalyzerOptions } & CoinValueAnalyzerOptions,
	{
		operationType: string | null;
		bytes: Uint8Array;
		coinFlows: CoinFlowsResult;
		coinValues: CoinValueAnalysis;
		accessLevel: Record<string, 'read' | 'mutate' | 'transfer'>;
		ownedObjects: AnalyzedObject[];
		digest: string;
	}
> = createAnalyzer({
	dependencies: {
		operationType,
		bytes: analyzers.bytes,
		coinFlows: analyzers.coinFlows,
		coinValues: analyzers.coinValues,
		accessLevel: analyzers.accessLevel,
		ownedObjects: analyzers.ownedObjects,
		digest: analyzers.digest,
	},
	analyze:
		() =>
		async ({ bytes, coinFlows, accessLevel, ownedObjects, digest, operationType, coinValues }) => {
			return {
				result: {
					operationType,
					bytes,
					coinFlows,
					accessLevel,
					ownedObjects,
					digest,
					coinValues,
				},
			};
		},
});

export type AutoApprovalResult = AnalyzerResult<AutoApprovalAnalysis>;
