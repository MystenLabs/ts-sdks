/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A utility module which implements an `ExchangeRate` struct and its methods. It
 * stores a fixed point exchange rate between the WAL token and pool shares.
 */

import { MoveEnum, MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::pool_exchange_rate';
/** Represents the exchange rate for the staking pool. */
export const PoolExchangeRate = new MoveEnum(`${$moduleName}::PoolExchangeRate`, {
	Flat: null,
	Variable: new MoveStruct(`PoolExchangeRate.Variable`, {
		wal_amount: bcs.u128(),
		share_amount: bcs.u128(),
	}),
});
