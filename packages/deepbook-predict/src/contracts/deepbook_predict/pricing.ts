/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module reads canonical Propbook Pyth and Block Scholes feeds and computes
 * SVI-adjusted digital probabilities. Live reads require fresh, pricing-safe Block
 * Scholes spot, forward, and SVI observations. A fresh positive Pyth spot
 * reanchors the Block Scholes forward basis; otherwise pricing uses that forward
 * directly. Exact-history reads do not apply live freshness policy.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
const $moduleName = '@local-pkg/deepbook_predict::pricing';
export const PricingSVI = new MoveStruct({
	name: `${$moduleName}::PricingSVI`,
	fields: {
		/** Rolled-down SVI `a`, magnitude at 1e18, sign in `a_is_negative`. */
		a_magnitude: bcs.u128(),
		a_is_negative: bcs.bool(),
		/** Rolled-down SVI `b`, at 1e18. */
		b: bcs.u128(),
		rho: i64.I64,
		m: i64.I64,
		sigma: bcs.u64(),
	},
});
export const Pricer = new MoveStruct({
	name: `${$moduleName}::Pricer`,
	fields: {
		/** Expiry market this snapshot was loaded for. */
		expiry_market_id: bcs.Address,
		forward: bcs.u64(),
		svi: PricingSVI,
		/**
		 * Source timestamps of the oracle observations present when this snapshot was
		 * loaded. Pyth is `0` only when no usable normalized observation exists.
		 */
		pyth_spot_source_timestamp_ms: bcs.u64(),
		block_scholes_spot_source_timestamp_ms: bcs.u64(),
		block_scholes_forward_source_timestamp_ms: bcs.u64(),
		/**
		 * First source envelope carrying the raw SVI tuple from which `svi` was rolled
		 * down.
		 */
		block_scholes_svi_params_timestamp_ms: bcs.u64(),
		block_scholes_svi_source_timestamp_ms: bcs.u64(),
	},
});
export const ExactSpotRead = new MoveStruct({
	name: `${$moduleName}::ExactSpotRead`,
	fields: {
		spot: bcs.option(bcs.u64()),
	},
});
export const PriceMemo = new MoveStruct({
	name: `${$moduleName}::PriceMemo`,
	fields: {
		/** Finite boundary ticks in ascending order (the in-order walk appends them). */
		ticks: bcs.vector(bcs.u64()),
		/** `up_price(ticks[i] * tick_size)`, parallel to `ticks`. */
		prices: bcs.vector(bcs.u64()),
	},
});
export interface UpPriceArguments {
	pricer: TransactionArgument;
	strike: TransactionArgument;
}
export interface UpPriceOptions {
	package?: string;
	arguments: UpPriceArguments | [pricer: TransactionArgument, strike: TransactionArgument];
}
/**
 * Return the current UP digital probability for a typed strike. Public PTB and
 * devInspect reads can compose it with a transaction-local `Pricer`.
 */
export function upPrice(options: UpPriceOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['pricer', 'strike'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'up_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RangePriceArguments {
	pricer: TransactionArgument;
	lower: TransactionArgument;
	higher: TransactionArgument;
}
export interface RangePriceOptions {
	package?: string;
	arguments:
		| RangePriceArguments
		| [pricer: TransactionArgument, lower: TransactionArgument, higher: TransactionArgument];
}
/**
 * Return the current probability for `(lower, higher]`, floored at zero if the two
 * approximated boundary probabilities invert.
 */
export function rangePrice(options: RangePriceOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['pricer', 'lower', 'higher'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'range_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
