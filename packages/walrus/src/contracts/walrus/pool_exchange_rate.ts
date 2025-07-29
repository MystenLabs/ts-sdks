// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A utility module which implements an `ExchangeRate` struct and its methods. It
 * stores a fixed point exchange rate between the WAL token and pool shares.
 */

import { MoveEnum, MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::pool_exchange_rate';
/** Represents the exchange rate for the staking pool. */
export const PoolExchangeRate = new MoveEnum({
	name: `${$moduleName}::PoolExchangeRate`,
	fields: {
		Flat: null,
		Variable: new MoveStruct({
			name: `PoolExchangeRate.Variable`,
			fields: {
				wal_amount: bcs.u128(),
				share_amount: bcs.u128(),
			},
		}),
	},
});
