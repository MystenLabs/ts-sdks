// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from '@mysten/sui/utils';
import { createAnalyzer } from '../analyzer.js';
import { balanceFlows } from './balance-flows.js';
import type { BalanceFlowsResult, CoinFlow } from './balance-flows.js';
import { data } from './core.js';

export type { CoinFlow } from './balance-flows.js';

export interface CoinFlowsResult {
	outflows: CoinFlow[];
}

function outflowsFor(balanceFlows: BalanceFlowsResult, address: string | null): CoinFlowsResult {
	const flows = address ? balanceFlows.byAddress[address] : undefined;
	const outflows: CoinFlow[] = [];
	if (flows) {
		for (const flow of flows) {
			outflows.push({ coinType: flow.coinType, amount: -flow.amount });
		}
	}
	return { outflows };
}

/**
 * The sender's coin outflows (positive = spent, negative = received).
 * Callers only interested in spending should skip non-positive entries.
 */
export const coinFlows = createAnalyzer({
	dependencies: { balanceFlows, data },
	analyze:
		() =>
		({ balanceFlows, data }) => {
			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			return { result: outflowsFor(balanceFlows, sender) satisfies CoinFlowsResult };
		},
});

/** The sponsor's coin outflows, or `null` when the tx isn't sponsored. */
export const sponsorFlows = createAnalyzer({
	dependencies: { balanceFlows, data },
	analyze:
		() =>
		({ balanceFlows, data }) => {
			const gasOwner = data.gasData.owner ? normalizeSuiAddress(data.gasData.owner) : null;
			const sender = data.sender ? normalizeSuiAddress(data.sender) : null;
			const sponsor = gasOwner && gasOwner !== sender ? gasOwner : null;
			return { result: sponsor ? outflowsFor(balanceFlows, sponsor) : null };
		},
});
