/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module reads canonical Propbook Pyth and Block Scholes feeds and computes
 * SVI-adjusted digital probabilities. Live reads require fresh, pricing-safe Block
 * Scholes spot, forward, and SVI observations. The live forward comes from one of
 * two admin-selected sources (`PricingConfig.use_pyth_spot_for_forward`): a fresh
 * positive Pyth spot carrying the Block Scholes basis, or the Block Scholes
 * forward directly. Exact-history reads do not apply live freshness policy.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { U128, U64 } from '../../bcs/integers.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
const $moduleName = '@local-pkg/deepbook_predict::pricing';
export const PricingSVI = new MoveStruct({
	name: `${$moduleName}::PricingSVI`,
	fields: {
		/** Rolled-down SVI `a`, magnitude at 1e18, sign in `a_is_negative`. */
		a_magnitude: U128,
		a_is_negative: bcs.bool(),
		/** Rolled-down SVI `b`, at 1e18. */
		b: U128,
		rho: i64.I64,
		m: i64.I64,
		sigma: U64,
	},
});
export const FrozenPricer = new MoveStruct({
	name: `${$moduleName}::FrozenPricer`,
	fields: {
		expiry_market_id: bcs.Address,
		forward: U64,
		svi: PricingSVI,
		pyth_spot_source_timestamp_ms: U64,
		block_scholes_spot_source_timestamp_ms: U64,
		block_scholes_forward_source_timestamp_ms: U64,
		block_scholes_svi_source_timestamp_ms: U64,
	},
});
export const Pricer = new MoveStruct({
	name: `${$moduleName}::Pricer`,
	fields: {
		/** Expiry market this snapshot was loaded for. */
		expiry_market_id: bcs.Address,
		forward: U64,
		svi: PricingSVI,
		/**
		 * Timestamps of the oracle observations this snapshot validated, as trade events
		 * report them — each observation's own economic clock. Pyth carries its source
		 * timestamp (`0` only when no usable normalized observation exists); Block Scholes
		 * spot and forward carry the provider `value_timestamp`, and SVI carries the
		 * provider `svi_timestamp`. Those timestamps are the clocks freshness gates and
		 * SVI roll-down use.
		 */
		pyth_spot_source_timestamp_ms: U64,
		block_scholes_spot_source_timestamp_ms: U64,
		block_scholes_forward_source_timestamp_ms: U64,
		block_scholes_svi_source_timestamp_ms: U64,
	},
});
export const RawSVI = new MoveStruct({
	name: `${$moduleName}::RawSVI`,
	fields: {
		a: i64.I64,
		b: U64,
		rho: i64.I64,
		m: i64.I64,
		sigma: U64,
	},
});
export interface UpPriceArguments {
	pricer: TransactionArgument;
	strike: TransactionArgument;
}
export interface UpPriceOptions {
	package?: string;
	arguments: UpPriceArguments | [pricer: TransactionArgument, strike: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the current UP digital probability for a typed strike. Public PTB and
 * devInspect reads can compose it with a transaction-local `Pricer`.
 */
export function upPrice(options: UpPriceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the current probability for `(lower, higher]`, floored at zero if the two
 * approximated boundary probabilities invert.
 */
export function rangePrice(options: RangePriceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
