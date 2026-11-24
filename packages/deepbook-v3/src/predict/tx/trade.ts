// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The immediate trades (`mint_exact_*`, `redeem_live`) were retired by delayed execution, and the
// `load_live_pricer` they priced with is retired by Predict version 6 (it aborts `EUseV2`), so
// their thunks are gone. Queue orders with `tx/queue.ts`, and price off chain with `inputs.ts`.
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { GeneratedConfig } from '../config/generated.js';
import * as expiryMarketBindings from '../bindings/expiry-market.js';
import { withAuth } from './common.js';

// The trade calls with their `auth` argument already supplied (see `withAuth`): each
// takes its generated options minus that slot and expands to auth → call.
const authed = {
	// The shipped argument keys: Predict v5 underscore-prefixed the retired call's parameters.
	redeemSettled: withAuth(expiryMarketBindings.redeemSettled),
};

/**
 * The Propbook object ids a market's version 5 placement reads (`queue::enqueue_*` on
 * `deepbook_predict_orders` before version 3). Grouped so callers pass one bundle; the
 * deployment's per-underlying ids live in `cfg.underlyings[symbol]`. Version 6 placement takes
 * none of them.
 */
export interface MarketFeeds {
	pythFeed: string;
	blockScholesValueStore: string;
	blockScholesSviStore: string;
}

// Unchanged by delayed execution: still pays settled positions held in the account. It doesn't
// pay Open queue records, which the queue's `settle_step` pays at settlement.
//
// Owner-authorized redeem of a settled position: closes `orderId` IN FULL against the
// recorded settlement price (the deployed entrypoint takes no quantity — a settled claim
// is all-or-nothing). No live pricer (settlement price is fixed); auth is consumed by the
// call. Deployed sig `redeem_settled` (owner-auth form). The keeper-facing
// `redeem_settled_permissionless` is a separate entrypoint, out of scope for this SDK.
export function redeemSettled(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		orderId: bigint;
	},
): (tx: Transaction) => TransactionResult {
	return authed.redeemSettled({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			orderId: args.orderId,
		},
	});
}
