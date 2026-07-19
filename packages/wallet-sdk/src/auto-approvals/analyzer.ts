// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { Analyzer, AnalyzerResult } from '../transaction-analyzer/analyzer.js';
import { createAnalyzer } from '../transaction-analyzer/index.js';
import { analyzers } from '../transaction-analyzer/index.js';
import type { CoinFlow } from '../transaction-analyzer/rules/balance-flows.js';
import type {
	CoinValueAnalysis,
	CoinValueAnalyzerOptions,
} from '../transaction-analyzer/rules/coin-value.js';
import { getCoinValues as getCoinValuesForFlows } from '../transaction-analyzer/rules/coin-value.js';
import { extractOperationType, OPERATION_INTENT } from './intent.js';

export interface AutoApprovalAnalyzerOptions {
	senderAddresses?: string[];
}

interface AutoApprovalAnalyzeOptions {
	operationType?: string;
	getCoinPrices?: CoinValueAnalyzerOptions['getCoinPrices'];
	autoApproval?: AutoApprovalAnalyzerOptions;
}

const operationType = createAnalyzer({
	dependencies: {
		bytes: analyzers.bytes,
	},
	analyze: (options: Pick<AutoApprovalAnalyzeOptions, 'operationType'>, tx) => {
		let operationType = options.operationType ?? null;

		if (!operationType) {
			tx.addIntentResolver(
				OPERATION_INTENT,
				extractOperationType((type) => {
					operationType = type;
				}),
			);
		}

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
		data: analyzers.data,
		balanceFlows: analyzers.balanceFlows,
		accessLevel: analyzers.accessLevel,
		ownedObjects: analyzers.ownedObjects,
		digest: analyzers.digest,
	},
	analyze:
		(options: AutoApprovalAnalyzeOptions) =>
		async ({ bytes, data, balanceFlows, accessLevel, ownedObjects, digest, operationType }) => {
			const senderAddresses = uniqueNormalizedAddresses([
				...(data.sender ? [data.sender] : []),
				...(options.autoApproval?.senderAddresses ?? []),
			]);
			const senderBalanceFlows = aggregateBalanceFlowsForAddresses(
				balanceFlows.byAddress,
				senderAddresses,
			);

			const coinValues = options.getCoinPrices
				? await getCoinValuesForFlows(senderBalanceFlows, options.getCoinPrices)
				: getCoinValuesUnavailable(senderBalanceFlows);

			return {
				result: {
					operationType,
					senderAddresses,
					bytes,
					balanceFlows,
					senderBalanceFlows,
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

function uniqueNormalizedAddresses(addresses: string[]): string[] {
	return [...new Set(addresses.map((address) => normalizeSuiAddress(address)))];
}

function aggregateBalanceFlowsForAddresses(
	byAddress: Record<string, CoinFlow[]>,
	addresses: string[],
): CoinFlow[] {
	const senderAddresses = new Set(addresses);
	const flowsByCoinType = new Map<string, bigint>();

	for (const [address, flows] of Object.entries(byAddress)) {
		if (!senderAddresses.has(normalizeSuiAddress(address))) {
			continue;
		}

		for (const flow of flows) {
			flowsByCoinType.set(flow.coinType, (flowsByCoinType.get(flow.coinType) ?? 0n) + flow.amount);
		}
	}

	return Array.from(flowsByCoinType, ([coinType, amount]) => ({ coinType, amount })).filter(
		(flow) => flow.amount !== 0n,
	);
}

function getCoinValuesUnavailable(balanceFlows: CoinFlow[]): CoinValueAnalysis {
	const outflows = balanceFlows
		.filter((flow) => flow.amount < 0n)
		.map((flow) => ({ coinType: flow.coinType, amount: -flow.amount }));

	if (outflows.length === 0) {
		return { total: 0, coinTypesWithoutPrice: [], coinTypes: [] };
	}

	return {
		total: 0,
		coinTypesWithoutPrice: [...new Set(outflows.map((flow) => flow.coinType))],
		coinTypes: [],
	};
}
