// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAnalyzer } from '../analyzer.js';
import { balanceFlows } from './balance-flows.js';
import type { CoinFlow } from './balance-flows.js';

export type { CoinFlow } from './balance-flows.js';

export interface CoinFlowsResult {
	outflows: CoinFlow[];
}

/**
 * The sender's coin outflows (positive = spent, negative = received).
 *
 * @deprecated Use `balanceFlows.sender` instead. Its entries are signed the
 * natural way (negative = outflow, positive = inflow) and it doesn't
 * require the sign-flip this wrapper applies.
 */
export const coinFlows = createAnalyzer({
	dependencies: { balanceFlows },
	analyze:
		() =>
		({ balanceFlows }) => {
			const outflows = balanceFlows.sender.map(
				(f) => ({ coinType: f.coinType, amount: -f.amount }) satisfies CoinFlow,
			);
			return { result: { outflows } satisfies CoinFlowsResult };
		},
});
