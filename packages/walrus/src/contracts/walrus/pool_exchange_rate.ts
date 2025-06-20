// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A utility module which implements an `ExchangeRate` struct and its methods. It
 * stores a fixed point exchange rate between the WAL token and pool shares.
 */

import { bcs } from '@mysten/sui/bcs';
/** Represents the exchange rate for the staking pool. */
export function PoolExchangeRate() {
	return bcs.enum('PoolExchangeRate', {
		Flat: null,
		Variable: bcs.struct('PoolExchangeRate.Variable', {
			wal_amount: bcs.u128(),
			share_amount: bcs.u128(),
		}),
	});
}
