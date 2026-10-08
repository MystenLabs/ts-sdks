/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module reads canonical Propbook Pyth and Block Scholes feeds and computes
 * SVI-adjusted digital probabilities. Live reads require fresh, pricing-safe Block
 * Scholes spot, forward, and SVI observations. The latest forward is paired with
 * an exact source-timestamp spot from Propbook's bounded recent history. The live
 * forward comes from one of two admin-selected sources
 * (`PricingConfig.use_pyth_spot_for_forward`): a fresh positive Pyth spot carrying
 * the Block Scholes basis, or the Block Scholes forward directly. A load falls
 * back to the Block Scholes forward when the selected Pyth spot is stale or
 * unavailable; valuation prices on that fallback, while every live trade (mints,
 * mint quotes, and live redeems) refuses it through `assert_pyth_spot_fresh`.
 * Exact-history reads do not apply live freshness policy.
 *
 * Delayed execution splits that read in two. `load_vol_snapshot` validates the
 * same live inputs when an order is queued and returns the raw Block Scholes basis
 * and SVI it stores; `pricer_at` later rebuilds a `Pricer` from them at the
 * order's committed Pyth tick. The `try_*` reads price exactly as `up_price` and
 * `range_price` do, and return `none` where those abort, so resolving a queue
 * never aborts on a surface.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64, U128 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
const $moduleName = '@local-pkg/deepbook_predict::pricing';
export const VolSnapshot = new MoveStruct({
	name: `${$moduleName}::VolSnapshot`,
	fields: {
		/**
		 * Canonical Propbook Pyth source for the market's underlying; commit finds this
		 * feed in each Lazer update.
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
export interface PythSourceIdArguments {
	snapshot: TransactionArgument;
}
export interface PythSourceIdOptions {
	package?: string;
	arguments: PythSourceIdArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function pythSourceId(options: PythSourceIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'pyth_source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BsSpotArguments {
	snapshot: TransactionArgument;
}
export interface BsSpotOptions {
	package?: string;
	arguments: BsSpotArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function bsSpot(options: BsSpotOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'bs_spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BsForwardArguments {
	snapshot: TransactionArgument;
}
export interface BsForwardOptions {
	package?: string;
	arguments: BsForwardArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function bsForward(options: BsForwardOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'bs_forward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviAArguments {
	snapshot: TransactionArgument;
}
export interface SviAOptions {
	package?: string;
	arguments: SviAArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviA(options: SviAOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'svi_a',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviBArguments {
	snapshot: TransactionArgument;
}
export interface SviBOptions {
	package?: string;
	arguments: SviBArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviB(options: SviBOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'svi_b',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviRhoArguments {
	snapshot: TransactionArgument;
}
export interface SviRhoOptions {
	package?: string;
	arguments: SviRhoArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviRho(options: SviRhoOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'svi_rho',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviMArguments {
	snapshot: TransactionArgument;
}
export interface SviMOptions {
	package?: string;
	arguments: SviMArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviM(options: SviMOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'svi_m',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviSigmaArguments {
	snapshot: TransactionArgument;
}
export interface SviSigmaOptions {
	package?: string;
	arguments: SviSigmaArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviSigma(options: SviSigmaOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'svi_sigma',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BsSpotSourceTimestampMsArguments {
	snapshot: TransactionArgument;
}
export interface BsSpotSourceTimestampMsOptions {
	package?: string;
	arguments: BsSpotSourceTimestampMsArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function bsSpotSourceTimestampMs(options: BsSpotSourceTimestampMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'bs_spot_source_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BsForwardSourceTimestampMsArguments {
	snapshot: TransactionArgument;
}
export interface BsForwardSourceTimestampMsOptions {
	package?: string;
	arguments: BsForwardSourceTimestampMsArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function bsForwardSourceTimestampMs(options: BsForwardSourceTimestampMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'bs_forward_source_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviSourceTimestampMsArguments {
	snapshot: TransactionArgument;
}
export interface SviSourceTimestampMsOptions {
	package?: string;
	arguments: SviSourceTimestampMsArguments | [snapshot: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviSourceTimestampMs(options: SviSourceTimestampMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['snapshot'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'svi_source_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
