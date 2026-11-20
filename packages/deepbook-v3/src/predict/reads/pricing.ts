// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { PricerInputs } from '../pricing.js';

/**
 * A resolved pricer snapshot: the decimal forward + rolled SVI the client-side math consumes, plus
 * the oracle source timestamps behind it (ms, for staleness display). The Block Scholes entries are
 * the provider's per-update source timestamps (`value_timestamp` for spot and forward,
 * `svi_timestamp` for SVI), the clocks the SVI roll-down anchors on.
 *
 * Up to Predict version 5 `read.pricer` read it from the chain's `load_live_pricer`. Version 6
 * retires that view, so it is built off chain from signed inputs (`pricerAt`).
 */
export interface PricerSnapshot extends PricerInputs {
	sources: {
		pythSpotMs: number;
		blockScholesSpotMs: number;
		blockScholesForwardMs: number;
		blockScholesSviMs: number;
	};
}
