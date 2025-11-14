// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Analyzer, AnalyzerResult } from '../transaction-analyzer/analyzer.js';
import { createAnalyzer } from '../transaction-analyzer/index.js';
import { analyzers } from '../transaction-analyzer/index.js';
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
});

export const autoApprovalAnalyzer = createAnalyzer({
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

export type AutoApprovalAnalysis =
	typeof autoApprovalAnalyzer extends Analyzer<infer R, any, any> ? R : never;
export type AutoApprovalResult = AnalyzerResult<AutoApprovalAnalysis>;
