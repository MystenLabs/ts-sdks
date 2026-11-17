/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module computes SVI-adjusted digital probabilities from Block Scholes
 * inputs and a Pyth spot that arrive inline, signed, in the transaction that needs
 * them. `snap_v2` turns a `block_scholes::BsVol` into the `VolSnapshot` a receipt
 * or the flush stores, and `pricer_at` builds a `Pricer` from a snapshot at a
 * committed Pyth tick: the Block Scholes basis re-anchored on the Pyth spot, and
 * the SVI rolled down to the tick. It returns `none` where the inputs leave
 * Predict's pricing envelope. The `try_*` reads price exactly as `up_price` and
 * `range_price` do, and return `none` where those abort, so an order-flow fill
 * never aborts on a surface.
 *
 * Block Scholes signs SVI at `9` or `18` decimals. Pricing carries `a` and `b` at
 * 1e18 either way, exactly when they were signed at 18. A snapshot keeps them at
 * 1e9, so a snapshot from 18 decimals also records the full-precision tuple in its
 * market's SVI cache, a dynamic field this module keeps on the market's UID
 * (`SviKey`), and pricing reads that entry when it still holds it.
 *
 * Earlier package versions read Propbook's stores here. Those readers survive only
 * as test fixtures (`load_live_pricer`, `load_vol`).
 */

import { MoveStruct, MoveTuple, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64, U128 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
const $moduleName = '@local-pkg/deepbook_predict::pricing';
export const VolSnapshot = new MoveStruct({
	name: `${$moduleName}::VolSnapshot`,
	fields: {
		/**
		 * The market's Pyth Lazer feed, from its oracle binding at admission. Commit finds
		 * this feed in each Lazer update.
		 */
		pyth_source_id: bcs.u32(),
		/** The matched Block Scholes spot and forward, narrowed to Predict's width. */
		bs_spot: U64,
		bs_forward: U64,
		/** Raw SVI parameters before roll-down, at 1e9. */
		svi_a: i64.I64,
		svi_b: U64,
		svi_rho: i64.I64,
		svi_m: i64.I64,
		svi_sigma: U64,
		/**
		 * Provider source timestamps of the three reads. The SVI one is also the roll-down
		 * anchor.
		 */
		bs_spot_source_timestamp_ms: U64,
		bs_forward_source_timestamp_ms: U64,
		svi_source_timestamp_ms: U64,
	},
});
export const PricingSVI = new MoveStruct({
	name: `${$moduleName}::PricingSVI`,
	fields: {
		/** SVI `a`, magnitude at 1e18, sign in `a_is_negative`. */
		a_magnitude: U128,
		a_is_negative: bcs.bool(),
		/** SVI `b`, at 1e18. */
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
		 * timestamp (`0` only when no usable normalized observation exists; a `pricer_at`
		 * Pricer carries the committed update's generation time); Block Scholes spot and
		 * forward carry the provider `value_timestamp`, and SVI carries the provider
		 * `svi_timestamp`. Those timestamps are the clocks freshness gates and SVI
		 * roll-down use. The Pyth timestamp, including its `0` sentinel, is also what
		 * `assert_pyth_spot_fresh` gates live trades on, so it must stay the value the
		 * load's forward selection read.
		 */
		pyth_spot_source_timestamp_ms: U64,
		block_scholes_spot_source_timestamp_ms: U64,
		block_scholes_forward_source_timestamp_ms: U64,
		block_scholes_svi_source_timestamp_ms: U64,
	},
});
export const RangePrice = new MoveStruct({
	name: `${$moduleName}::RangePrice`,
	fields: {
		lower_up: bcs.option(U64),
		higher_up: bcs.option(U64),
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
export const SviKey = new MoveTuple({ name: `${$moduleName}::SviKey`, fields: [bcs.bool()] });
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
 * Return both boundary probabilities for `(lower, higher]`. Use `probability()`
 * for the combined range probability; absent boundaries are infinite sentinels.
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
export interface LowerUpArguments {
	price: TransactionArgument;
}
export interface LowerUpOptions {
	package?: string;
	arguments: LowerUpArguments | [price: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function lowerUp(options: LowerUpOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'lower_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HigherUpArguments {
	price: TransactionArgument;
}
export interface HigherUpOptions {
	package?: string;
	arguments: HigherUpArguments | [price: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function higherUp(options: HigherUpOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'higher_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProbabilityArguments {
	price: TransactionArgument;
}
export interface ProbabilityOptions {
	package?: string;
	arguments: ProbabilityArguments | [price: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the combined probability, floored at zero if approximated boundary prices
 * invert.
 */
export function probability(options: ProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
