/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Per-expiry Predict market.
 *
 * An ExpiryMarket is the hot shared object for one expiry. It owns trade
 * execution, strike exposure state, and an embedded expiry-cash custody component,
 * plus local sponsor-funded fee incentives. Live oracle validation is delegated to
 * `pricing::load_live_pricer`; this module owns market flow policy and then passes
 * loaded `Pricer` snapshots into exposure business logic. Pool-wide PLP accounting
 * and profit accounting remain outside this module.
 *
 * It also owns the delayed-execution flows over the market's `OrderBook` (a
 * dynamic field created by the first queued order): queued placement, commit of
 * signed Pyth Lazer prices, resolve at the committed tick, refunds, cleanup, and
 * the settlement refund and payout phases. A queued fill never enters the account:
 * it stays an Open record until `enqueue_redeem_open` sells it or `try_settle`
 * pays it. `order_queue` owns the book's state and records; this module owns the
 * flow gates, the pricing, and every queue event.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { U64 } from '../../bcs/integers.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as expiry_cash from './expiry_cash.js';
import * as balance from './deps/sui/balance.js';
import * as strike_exposure from './strike_exposure.js';
import * as ewma from './ewma.js';
import * as i64 from './deps/pyth_lazer/i64.js';
import * as i16 from './deps/pyth_lazer/i16.js';
const $moduleName = '@local-pkg/deepbook_predict::expiry_market';
export const ValuationStamp = new MoveStruct({
	name: `${$moduleName}::ValuationStamp`,
	fields: {
		flush_seq: U64,
		/** `cash.balance()` at the snapshot instant. */
		snapshot_cash: U64,
		/** `cash.inventory_impact_reserve()` at the snapshot instant. */
		snapshot_impact_reserve: U64,
	},
});
export const ExpiryMarket = new MoveStruct({
	name: `${$moduleName}::ExpiryMarket`,
	fields: {
		id: bcs.Address,
		/** Propbook underlying this market was created for. */
		propbook_underlying_id: bcs.u32(),
		expiry: U64,
		/** USDC custody and payout backing. */
		cash: expiry_cash.ExpiryCash,
		/** Sponsor-funded USDC available to subsidize this market's taker fees. */
		fee_incentive_balance: balance.Balance,
		/** Exposure lifecycle state for this expiry's strike ticks. */
		strike_exposure: strike_exposure.StrikeExposure,
		/** Smoothed gas-price stats backing the congestion trade penalty. */
		ewma: ewma.EwmaState,
		/**
		 * When true, new mints on this expiry abort. Other flows stay available. Admin
		 * sets/unsets it (version-gated); a `PauseCap` holder can force it true one-way
		 * through the registry (ungated kill switch).
		 */
		mint_paused: bcs.bool(),
		/**
		 * `Some` from the flush's snapshot stage until this market's `value_expiry` (or
		 * lazily discarded once the stamp goes stale — see `ValuationStamp`). Trading is
		 * never gated on it and never touches it: the cash rows are captured eagerly here
		 * at the snapshot instant, and the payout tree captures its own boundary shadows
		 * as trades first touch each node.
		 */
		valuation_stamp: bcs.option(ValuationStamp),
	},
});
export const MintQuote = new MoveStruct({
	name: `${$moduleName}::MintQuote`,
	fields: {
		quantity: U64,
		entry_probability: U64,
		premium: U64,
		trading_fee: U64,
		fee_incentive_subsidy: U64,
		builder_fee: U64,
		penalty_fee: U64,
		inventory_impact_charge: U64,
		all_in_cost: U64,
	},
});
export const RedeemQuote = new MoveStruct({
	name: `${$moduleName}::RedeemQuote`,
	fields: {
		close_quantity: U64,
		probability: U64,
		proceeds: U64,
		trading_fee: U64,
		builder_fee: U64,
		inventory_impact_rebate: U64,
	},
});
export const LazerTickFeed = new MoveStruct({
	name: `${$moduleName}::LazerTickFeed`,
	fields: {
		feed_id: bcs.u32(),
		price: bcs.option(bcs.option(i64.I64)),
		exponent: bcs.option(i16.I16),
		/** The feed's own update time, in µs. */
		feed_update_timestamp_us: bcs.option(bcs.option(U64)),
	},
});
export const LazerTick = new MoveStruct({
	name: `${$moduleName}::LazerTick`,
	fields: {
		/** `update.timestamp()`, in µs. */
		envelope_us: U64,
		/** Lazer channel id: `2` is `fixed_rate@50ms`, `3` is `fixed_rate@200ms`. */
		channel: bcs.u8(),
		feeds: bcs.vector(LazerTickFeed),
	},
});
export interface IdArguments {
	market: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the market object ID for external discovery and PTB construction. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookUnderlyingIdArguments {
	market: RawTransactionArgument<string>;
}
export interface PropbookUnderlyingIdOptions {
	package?: string;
	arguments: PropbookUnderlyingIdArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the Propbook underlying for SDK and devInspect market reads. */
export function propbookUnderlyingId(options: PropbookUnderlyingIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'propbook_underlying_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryArguments {
	market: RawTransactionArgument<string>;
}
export interface ExpiryOptions {
	package?: string;
	arguments: ExpiryArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the expiry timestamp for SDK and devInspect market reads. */
export function expiry(options: ExpiryOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'expiry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SettlementPriceArguments {
	market: RawTransactionArgument<string>;
}
export interface SettlementPriceOptions {
	package?: string;
	arguments: SettlementPriceArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the recorded settlement price. Aborts if the market is not settled. */
export function settlementPrice(options: SettlementPriceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'settlement_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsSettledArguments {
	market: RawTransactionArgument<string>;
}
export interface IsSettledOptions {
	package?: string;
	arguments: IsSettledArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return whether terminal settlement has been recorded for this market. Public
 * read for SDK/devInspect settlement-state checks.
 */
export function isSettled(options: IsSettledOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'is_settled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TrySettlementPriceArguments {
	market: RawTransactionArgument<string>;
}
export interface TrySettlementPriceOptions {
	package?: string;
	arguments: TrySettlementPriceArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the recorded settlement price, or `none` while the market is live.
 * Non-aborting companion to `settlement_price` for SDK/devInspect reads.
 */
export function trySettlementPrice(options: TrySettlementPriceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'try_settlement_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CashBalanceArguments {
	market: RawTransactionArgument<string>;
}
export interface CashBalanceOptions {
	package?: string;
	arguments: CashBalanceArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return expiry USDC custody for SDK and devInspect state reads. */
export function cashBalance(options: CashBalanceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'cash_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InventoryImpactReserveArguments {
	market: RawTransactionArgument<string>;
}
export interface InventoryImpactReserveOptions {
	package?: string;
	arguments: InventoryImpactReserveArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the isolated inventory-impact escrow for SDK and devInspect state reads. */
export function inventoryImpactReserve(options: InventoryImpactReserveOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'inventory_impact_reserve',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeeIncentiveBalanceArguments {
	market: RawTransactionArgument<string>;
}
export interface FeeIncentiveBalanceOptions {
	package?: string;
	arguments: FeeIncentiveBalanceArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return local fee incentives for SDK and devInspect state reads. */
export function feeIncentiveBalance(options: FeeIncentiveBalanceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'fee_incentive_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BackingBufferLambdaArguments {
	market: RawTransactionArgument<string>;
}
export interface BackingBufferLambdaOptions {
	package?: string;
	arguments: BackingBufferLambdaArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the snapshotted backing-buffer lambda for SDK and devInspect reads. */
export function backingBufferLambda(options: BackingBufferLambdaOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'backing_buffer_lambda',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryFeeWindowMsArguments {
	market: RawTransactionArgument<string>;
}
export interface ExpiryFeeWindowMsOptions {
	package?: string;
	arguments: ExpiryFeeWindowMsArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the snapshotted fee-ramp window for SDK and devInspect reads. */
export function expiryFeeWindowMs(options: ExpiryFeeWindowMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'expiry_fee_window_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryFeeMaxMultiplierArguments {
	market: RawTransactionArgument<string>;
}
export interface ExpiryFeeMaxMultiplierOptions {
	package?: string;
	arguments: ExpiryFeeMaxMultiplierArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the snapshotted fee-ramp multiplier for SDK and devInspect reads. */
export function expiryFeeMaxMultiplier(options: ExpiryFeeMaxMultiplierOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'expiry_fee_max_multiplier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InventoryImpactMaxRateArguments {
	market: RawTransactionArgument<string>;
}
export interface InventoryImpactMaxRateOptions {
	package?: string;
	arguments: InventoryImpactMaxRateArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return this market's immutable maximum marginal inventory-impact rate for SDK
 * and devInspect state reads.
 */
export function inventoryImpactMaxRate(options: InventoryImpactMaxRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'inventory_impact_max_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InventoryImpactScaleArguments {
	market: RawTransactionArgument<string>;
}
export interface InventoryImpactScaleOptions {
	package?: string;
	arguments: InventoryImpactScaleArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the immutable USDC scale of this market's inventory-impact curve for SDK
 * and devInspect state reads.
 */
export function inventoryImpactScale(options: InventoryImpactScaleOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'inventory_impact_scale',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TickSizeArguments {
	market: RawTransactionArgument<string>;
}
export interface TickSizeOptions {
	package?: string;
	arguments: TickSizeArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the strike tick size for SDK and devInspect range construction. Raw
 * strikes are `tick * tick_size`.
 */
export function tickSize(options: TickSizeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'tick_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AdmissionTickSizeArguments {
	market: RawTransactionArgument<string>;
}
export interface AdmissionTickSizeOptions {
	package?: string;
	arguments: AdmissionTickSizeArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the admission-grid step for SDK and devInspect range construction. */
export function admissionTickSize(options: AdmissionTickSizeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'admission_tick_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferenceTickArguments {
	market: RawTransactionArgument<string>;
}
export interface ReferenceTickOptions {
	package?: string;
	arguments: ReferenceTickArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the admitted reference tick for SDK and devInspect range construction. */
export function referenceTick(options: ReferenceTickOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'reference_tick',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferenceTickSourceTimestampMsArguments {
	market: RawTransactionArgument<string>;
}
export interface ReferenceTickSourceTimestampMsOptions {
	package?: string;
	arguments: ReferenceTickSourceTimestampMsArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the reference observation timestamp for SDK and devInspect reads. */
export function referenceTickSourceTimestampMs(options: ReferenceTickSourceTimestampMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'reference_tick_source_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PayoutLiabilityArguments {
	market: RawTransactionArgument<string>;
}
export interface PayoutLiabilityOptions {
	package?: string;
	arguments: PayoutLiabilityArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return payout reserve or settled liability for external accounting
 * observability.
 */
export function payoutLiability(options: PayoutLiabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'payout_liability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequiredCashArguments {
	market: RawTransactionArgument<string>;
}
export interface RequiredCashOptions {
	package?: string;
	arguments: RequiredCashArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return required expiry cash for external accounting observability. */
export function requiredCash(options: RequiredCashOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'required_cash',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LoadLivePricerArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
}
export interface LoadLivePricerOptions {
	package?: string;
	arguments: LoadLivePricerArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Load a PTB-local live pricing snapshot for this market.
 *
 * The returned `Pricer` is bound to `market.id()` and can be passed into live
 * mint, redeem, and NAV functions in the same transaction.
 *
 * Aborts `pricing::EOracleWrittenInThisTransaction` when any observation that
 * feeds the returned forward or SVI was written in this transaction (RP-24).
 * Independently submitted refresh-then-trade PTBs are unaffected: the guard
 * compares observation `writer_digest` to `tx_context::digest()`, not sender
 * identity, and does not prohibit reads of older observations.
 */
export function loadLivePricer(options: LoadLivePricerOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['market', 'config', 'propbookRegistry', 'pyth', 'bsValues', 'bsSvi'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'load_live_pricer',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface IsPendingValuationArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
}
export interface IsPendingValuationOptions {
	package?: string;
	arguments: IsPendingValuationArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return whether this market is snapshotted into the in-flight flush and still
 * awaiting its `value_expiry`. For SDK, keeper, and devInspect reads. It gates
 * nothing: settlement and trading both run regardless — the frozen mark is
 * settlement-invariant, so a stamped market settles the instant it expires. Do not
 * defer a settlement attempt on this read.
 */
export function isPendingValuation(options: IsPendingValuationOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['market', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'is_pending_valuation',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CurrentNavArguments {
	market: RawTransactionArgument<string>;
	pricer: TransactionArgument;
}
export interface CurrentNavOptions {
	package?: string;
	arguments:
		CurrentNavArguments | [market: RawTransactionArgument<string>, pricer: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return live marked NAV as free expiry cash minus the exposure book's marked
 * liability, floored at zero. This read requires a market-bound pre-expiry
 * `Pricer`; an expired but unsettled market cannot be valued through this path.
 * Public for PTB composition and devInspect pool valuation.
 */
export function currentNav(options: CurrentNavOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['market', 'pricer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'current_nav',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LiveOrderValueArguments {
	market: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface LiveOrderValueOptions {
	package?: string;
	arguments:
		| LiveOrderValueArguments
		| [
				market: RawTransactionArgument<string>,
				pricer: TransactionArgument,
				orderId: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return one live order's full-close range value before fees. Requires a
 * market-bound `Pricer` and does not prove account ownership of `order_id`. Public
 * for SDK, PTB, and devInspect position valuation.
 */
export function liveOrderValue(options: LiveOrderValueOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['market', 'pricer', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'live_order_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SettledOrderPayoutArguments {
	market: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface SettledOrderPayoutOptions {
	package?: string;
	arguments:
		| SettledOrderPayoutArguments
		| [market: RawTransactionArgument<string>, orderId: RawTransactionArgument<number | bigint>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return one settled order's terminal payout. This function does not prove account
 * ownership of `order_id`. Public for SDK, PTB, and devInspect position valuation.
 */
export function settledOrderPayout(options: SettledOrderPayoutOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['market', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'settled_order_payout',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintPausedArguments {
	market: RawTransactionArgument<string>;
}
export interface MintPausedOptions {
	package?: string;
	arguments: MintPausedArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the market mint-pause state for SDK and devInspect reads. */
export function mintPaused(options: MintPausedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_paused',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuoteMintArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	exactQuantity: RawTransactionArgument<boolean>;
}
export interface QuoteMintOptions {
	package?: string;
	arguments: QuoteMintArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Quote the all-in cost of a mint request for an anonymous taker (no builder code)
 * without mutating any market state. Exact-quantity mode uses `min_quantity`;
 * budget mode conservatively sizes a lot-rounded fill under `max_premium`. The
 * quote applies live-mint and admission gates but does not preflight account
 * balance, slippage caps, or exposure-index capacity. Its penalty uses the current
 * pre-update EWMA state. Public for SDK and devInspect pre-trade pricing.
 */
export function quoteMint(options: QuoteMintOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'bool',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxPremium',
		'minQuantity',
		'exactQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'quote_mint',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface QuoteMintForAccountArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	exactQuantity: RawTransactionArgument<boolean>;
}
export interface QuoteMintForAccountOptions {
	package?: string;
	arguments: QuoteMintForAccountArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Quote the all-in cost of a mint request for one account, reading its builder
 * code. Budget mode caps premium by total account balance, including unsettled
 * accumulator funds. Public for SDK and devInspect pre-trade pricing.
 */
export function quoteMintForAccount(options: QuoteMintForAccountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'bool',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxPremium',
		'minQuantity',
		'exactQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'quote_mint_for_account',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface QuoteMintExactCostForAccountArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface QuoteMintExactCostForAccountOptions {
	package?: string;
	arguments: QuoteMintExactCostForAccountArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Quote `mint_exact_cost` for one account: the fill that mint would size for
 * `max_cost`, capped by total account balance including unsettled accumulator
 * funds, with that fill's cost decomposition. Applies the mint's live-mint gates,
 * sizing, `min_quantity` floor, and admission, but does not preflight
 * exposure-index capacity or cash backing. `quantity` is the figure to derive a
 * `min_quantity` slippage floor from. Public for SDK and devInspect pre-trade
 * pricing.
 */
export function quoteMintExactCostForAccount(options: QuoteMintExactCostForAccountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxCost',
		'minQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'quote_mint_exact_cost_for_account',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface QueuedOrderArguments {
	market: RawTransactionArgument<string>;
	recordId: RawTransactionArgument<number | bigint>;
}
export interface QueuedOrderOptions {
	package?: string;
	arguments:
		| QueuedOrderArguments
		| [market: RawTransactionArgument<string>, recordId: RawTransactionArgument<number | bigint>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return one queue record, or `none` for a missing or deleted record ID. */
export function queuedOrder(options: QueuedOrderOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['market', 'recordId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'queued_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QueueHeadsArguments {
	market: RawTransactionArgument<string>;
}
export interface QueueHeadsOptions {
	package?: string;
	arguments: QueueHeadsArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return `(resolve_head, next_id, last_tau_ms, last_committed_tau_ms)`.
 * `resolve_head` is a lower bound on the first unfinished record.
 */
export function queueHeads(options: QueueHeadsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'queue_heads',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PayoutProgressArguments {
	market: RawTransactionArgument<string>;
}
export interface PayoutProgressOptions {
	package?: string;
	arguments: PayoutProgressArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return `(payout_cursor, next_id)`. The settlement payout walk is finished once
 * the two are equal.
 */
export function payoutProgress(options: PayoutProgressOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'payout_progress',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WaitingCohortsArguments {
	market: RawTransactionArgument<string>;
}
export interface WaitingCohortsOptions {
	package?: string;
	arguments: WaitingCohortsArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return
 * `(cohort count, oldest uncommitted τ, oldest uncommitted τ above  last_committed_tau_ms)`.
 * The third value is the cohort the stuck gate's first rule watches.
 */
export function waitingCohorts(options: WaitingCohortsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'waiting_cohorts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QueueStuckArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
}
export interface QueueStuckOptions {
	package?: string;
	arguments: QueueStuckArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Whether enqueue would refuse a new order as stuck right now (both rules of the
 * stuck gate). Drives the app's "pricing delayed" banner. Aborts
 * `protocol_config::EPolicyNotInitialized` for a market with a queue before the
 * policy exists.
 */
export function queueStuck(options: QueueStuckOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['market', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'queue_stuck',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface PendingCountsArguments {
	market: RawTransactionArgument<string>;
}
export interface PendingCountsOptions {
	package?: string;
	arguments: PendingCountsArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return `(pending_mints, pending_sells)`, the unfinished orders counted against
 * the policy capacities.
 */
export function pendingCounts(options: PendingCountsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'pending_counts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WaitingOrdersArguments {
	market: RawTransactionArgument<string>;
	accountId: RawTransactionArgument<string>;
}
export interface WaitingOrdersOptions {
	package?: string;
	arguments:
		| WaitingOrdersArguments
		| [market: RawTransactionArgument<string>, accountId: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the unfinished queued orders `account_id` holds in this market. */
export function waitingOrders(options: WaitingOrdersOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['market', 'accountId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'waiting_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OldestUnfinishedTauMsArguments {
	market: RawTransactionArgument<string>;
}
export interface OldestUnfinishedTauMsOptions {
	package?: string;
	arguments: OldestUnfinishedTauMsArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Return τ of the oldest cohort with an unfinished order, for monitoring. */
export function oldestUnfinishedTauMs(options: OldestUnfinishedTauMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'oldest_unfinished_tau_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpareCashArguments {
	market: RawTransactionArgument<string>;
}
export interface SpareCashOptions {
	package?: string;
	arguments: SpareCashArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return market cash above required cash: the largest cash need a new queued mint
 * may have right now. Cash backing keeps cash at or above required cash.
 */
export function spareCash(options: SpareCashOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'spare_cash',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WaitingCashNeedArguments {
	market: RawTransactionArgument<string>;
}
export interface WaitingCashNeedOptions {
	package?: string;
	arguments: WaitingCashNeedArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the summed cash need of the market's unfinished queued orders.
 * `rebalance_expiry_cash` keeps a live market at required cash plus this.
 */
export function waitingCashNeed(options: WaitingCashNeedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'waiting_cash_need',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PayoutTreeNodeCountArguments {
	market: RawTransactionArgument<string>;
}
export interface PayoutTreeNodeCountOptions {
	package?: string;
	arguments: PayoutTreeNodeCountArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the payout tree's node count, pinned zero nodes included. The keeper
 * sizes its resolve batches from it.
 */
export function payoutTreeNodeCount(options: PayoutTreeNodeCountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'payout_tree_node_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinEntryProbabilityArguments {
	market: RawTransactionArgument<string>;
}
export interface MinEntryProbabilityOptions {
	package?: string;
	arguments: MinEntryProbabilityArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the market's snapshotted minimum entry probability. The SDK computes a
 * queued mint's cash need from it.
 */
export function minEntryProbability(options: MinEntryProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'min_entry_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuoteRedeemOpenArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	Config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	recordId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
}
export interface QuoteRedeemOpenOptions {
	package?: string;
	arguments: QuoteRedeemOpenArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Quote an early sell of `close_quantity` from the Open record `record_id` at a
 * live `Pricer`, with the wrapper account's builder code. Prices the close the way
 * a queued sell fills, with the trading fee at the clock instead of a committed
 * tick. `proceeds` is before the order fee. Changes nothing. It has no version,
 * freeze, trade-window, or Pyth-freshness gate, only the pricer binding
 * (`EWrongPricer`). Aborts `ERecordNotOpen` for a missing or non-Open record, and
 * otherwise like the live close math. Does not check that the account owns the
 * record. Public for SDK and devInspect pricing before `enqueue_redeem_open`.
 */
export function quoteRedeemOpen(options: QuoteRedeemOpenOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, 'u64', 'u64', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['market', 'wrapper', 'Config', 'pricer', 'recordId', 'closeQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'quote_redeem_open',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					Config: options.arguments?.Config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface QuantityArguments {
	quote: TransactionArgument;
}
export interface QuantityOptions {
	package?: string;
	arguments: QuantityArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the sized quantity for SDK and devInspect quote consumers. */
export function quantity(options: QuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EntryProbabilityArguments {
	quote: TransactionArgument;
}
export interface EntryProbabilityOptions {
	package?: string;
	arguments: EntryProbabilityArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the quoted range probability for SDK and devInspect consumers. */
export function entryProbability(options: EntryProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'entry_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PremiumArguments {
	quote: TransactionArgument;
}
export interface PremiumOptions {
	package?: string;
	arguments: PremiumArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the quoted premium for SDK and devInspect consumers. */
export function premium(options: PremiumOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'premium',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TradingFeeArguments {
	quote: TransactionArgument;
}
export interface TradingFeeOptions {
	package?: string;
	arguments: TradingFeeArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the quoted trading fee before subsidy for SDK and devInspect consumers. */
export function tradingFee(options: TradingFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'trading_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeeIncentiveSubsidyArguments {
	quote: TransactionArgument;
}
export interface FeeIncentiveSubsidyOptions {
	package?: string;
	arguments: FeeIncentiveSubsidyArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the sponsor-funded portion of the quoted fee for SDK and devInspect
 * consumers.
 */
export function feeIncentiveSubsidy(options: FeeIncentiveSubsidyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'fee_incentive_subsidy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BuilderFeeArguments {
	quote: TransactionArgument;
}
export interface BuilderFeeOptions {
	package?: string;
	arguments: BuilderFeeArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the quoted builder fee for SDK and devInspect consumers. */
export function builderFee(options: BuilderFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'builder_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PenaltyFeeArguments {
	quote: TransactionArgument;
}
export interface PenaltyFeeOptions {
	package?: string;
	arguments: PenaltyFeeArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the quoted EWMA congestion surcharge for SDK and devInspect consumers. */
export function penaltyFee(options: PenaltyFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'penalty_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InventoryImpactChargeArguments {
	quote: TransactionArgument;
}
export interface InventoryImpactChargeOptions {
	package?: string;
	arguments: InventoryImpactChargeArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return the separate inventory-impact charge for SDK and devInspect quote
 * consumers.
 */
export function inventoryImpactCharge(options: InventoryImpactChargeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'inventory_impact_charge',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AllInCostArguments {
	quote: TransactionArgument;
}
export interface AllInCostOptions {
	package?: string;
	arguments: AllInCostArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the total quoted account withdrawal for SDK and devInspect consumers. */
export function allInCost(options: AllInCostOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'all_in_cost',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemCloseQuantityArguments {
	quote: TransactionArgument;
}
export interface RedeemCloseQuantityOptions {
	package?: string;
	arguments: RedeemCloseQuantityArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function redeemCloseQuantity(options: RedeemCloseQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_close_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemProbabilityArguments {
	quote: TransactionArgument;
}
export interface RedeemProbabilityOptions {
	package?: string;
	arguments: RedeemProbabilityArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function redeemProbability(options: RedeemProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemProceedsArguments {
	quote: TransactionArgument;
}
export interface RedeemProceedsOptions {
	package?: string;
	arguments: RedeemProceedsArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function redeemProceeds(options: RedeemProceedsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_proceeds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemTradingFeeArguments {
	quote: TransactionArgument;
}
export interface RedeemTradingFeeOptions {
	package?: string;
	arguments: RedeemTradingFeeArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function redeemTradingFee(options: RedeemTradingFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_trading_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemBuilderFeeArguments {
	quote: TransactionArgument;
}
export interface RedeemBuilderFeeOptions {
	package?: string;
	arguments: RedeemBuilderFeeArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function redeemBuilderFee(options: RedeemBuilderFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_builder_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemInventoryImpactRebateArguments {
	quote: TransactionArgument;
}
export interface RedeemInventoryImpactRebateOptions {
	package?: string;
	arguments: RedeemInventoryImpactRebateArguments | [quote: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function redeemInventoryImpactRebate(options: RedeemInventoryImpactRebateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['quote'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_inventory_impact_rebate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintExactQuantityArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
}
export interface MintExactQuantityOptions {
	package?: string;
	arguments: MintExactQuantityArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Mint an exact live position quantity against this expiry market.
 *
 * Requires the running package version to be at or above the protocol version
 * watermark, per-market mint pause to be off, trading globally enabled, valid
 * owner or authorized-app account auth, a market-bound live `Pricer`, and enough
 * expiry cash to back the post-mint max payout. While `use_pyth_spot_for_forward`
 * is set, the `Pricer` must also have loaded a usable, fresh Pyth spot: a mint
 * aborts `pricing::EPythSpotUnavailable` or `pricing::EPythSpotStale` rather than
 * execute on the Block Scholes-forward fallback, and the same holds for every
 * mint, mint quote, and `redeem_live`. Mint fees are paid by routing a withdraw
 * through the loaded account. The position's strike range is the tick pair
 * `(lower_tick, higher_tick]` (`lower_tick = 0` is `-inf`,
 * `higher_tick = pos_inf_tick` is `+inf`); the SDK converts raw strikes to ticks.
 * `max_cost` caps the all-in USDC withdrawal, while `max_probability` caps the
 * quoted per-contract probability before fees. Callers can pass
 * `std::u64::max_value!()` for either uncapped guard. Returns the minted order ID
 * for future order-scoped flows.
 *
 * Retired by delayed execution: aborts `EDelayedExecutionRequired` once the
 * version watermark reaches `current_version`. Use `enqueue_exact_quantity`.
 */
export function mintExactQuantity(options: MintExactQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'quantity',
		'maxCost',
		'maxProbability',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_quantity',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface MintExactAmountArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
}
export interface MintExactAmountOptions {
	package?: string;
	arguments: MintExactAmountArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Mint a conservatively sized lot-rounded position whose premium does not exceed
 * `max_premium`. The result may be one lot below the largest fitting quantity and
 * must meet `min_quantity`.
 *
 * Fees, builder fees, and EWMA congestion penalties are charged on top of
 * `max_premium`, so `max_cost` — not `max_premium` — bounds the all-in USDC
 * withdrawal (`premium + trader-paid fee + builder_fee + EWMA penalty`).
 * `max_cost` is required: unlike `mint_exact_quantity`'s guards there is no value
 * that disables it, because the budget shape exists to bound spend. The sizing
 * budget is first capped to the account's available USDC after settlement; fees
 * still require additional available USDC at payment time. Any unspent premium
 * dust remains in the account because order quantity must be an integer number of
 * `position_lot_size` lots.
 *
 * Retired by delayed execution: aborts `EDelayedExecutionRequired` once the
 * version watermark reaches `current_version`. Use `enqueue_exact_amount`.
 */
export function mintExactAmount(options: MintExactAmountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxPremium',
		'minQuantity',
		'maxCost',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_amount',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface MintExactCostArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface MintExactCostOptions {
	package?: string;
	arguments: MintExactCostArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Mint a lot-rounded position within an all-in `max_cost` budget.
 *
 * Unlike `mint_exact_amount`, fees are sized inside the budget: the quantity
 * search evaluates the all-in withdrawal the mint charges
 * (`premium +  trader-paid fee + builder_fee + EWMA penalty + inventory_impact_charge`)
 * against the fee-incentive, congestion, and book state at execution, so the debit
 * never exceeds `max_cost`. `max_cost` is first capped to the account's available
 * USDC after settlement, so `std::u64::max_value!()` sizes against the whole
 * balance.
 *
 * The budget search finds the largest fitting quantity. If that quantity costs
 * more than its maximum payout, a conservative search tries a smaller fill;
 * rounding can make that fallback miss a larger admissible fill. Only when the
 * budget is the limiting constraint is the remainder less than the incremental
 * all-in cost of one more lot. Payout-limited fills and lot-cap saturation can
 * leave more. Insufficient expiry cash backing aborts the mint; sizing does not
 * shrink the fill to available backing, and the quote does not preflight it.
 *
 * `min_quantity` is this entrypoint's slippage guard. The budget is fixed, so
 * every adverse move between building the transaction and executing it — the
 * price, the congestion surcharge, the sponsor subsidy, the inventory-impact
 * charge — shows up as fewer contracts, and a fill below `min_quantity` aborts
 * `EMintQuantityBelowMin`. It bounds the all-in price per contract at
 * `max_cost / min_quantity`, which is why the shape carries no separate
 * probability cap; passing `0` accepts any fill the budget buys. A budget too
 * small to admit `constants::min_premium` aborts `EPremiumBelowMinimum` rather
 * than minting nothing, and zero is such a budget: unlike `mint_exact_amount`
 * there is no `max_cost` cap to require, because here the budget IS the sizing
 * input. Other requirements match `mint_exact_quantity`. Returns the minted order
 * ID.
 *
 * Retired by delayed execution: aborts `EDelayedExecutionRequired` once the
 * version watermark reaches `current_version`. Use `enqueue_exact_cost`.
 */
export function mintExactCost(options: MintExactCostOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxCost',
		'minQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_cost',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RedeemLiveArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	orderId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
}
export interface RedeemLiveOptions {
	package?: string;
	arguments: RedeemLiveArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Redeem a live order you hold account authority over.
 *
 * A live order is priced and closed (partial or full). Settled orders must use
 * `redeem_settled`. Returns a replacement order ID only when a partial close
 * leaves quantity open.
 *
 * Requires a market-bound live `Pricer` and, while `use_pyth_spot_for_forward` is
 * set, a usable, fresh Pyth spot in it, the same Pyth requirement every mint
 * carries: the close aborts `pricing::EPythSpotUnavailable` or
 * `pricing::EPythSpotStale` rather than execute on the Block Scholes-forward
 * fallback. Trading and mint pauses do not apply. Through a gap in Pyth updates
 * the position stays open until Pyth recovers, an admin deselects Pyth or widens
 * `pyth_spot_freshness_ms` past the gap, or the market settles and
 * `redeem_settled` pays it.
 *
 * Two close-side slippage floors, the mirror of mint's `max_probability` /
 * `max_cost` pair; pass `0` to disable either. `min_probability` floors the quoted
 * per-contract range probability (same units as mint's `max_probability`).
 * `min_proceeds` floors the all-in net USDC credited to the account
 * (`redeem_amount` minus trading fee, builder fee, and EWMA penalty), the mirror
 * of mint's all-in `max_cost`.
 *
 * Retired by delayed execution: aborts `EDelayedExecutionRequired` once the
 * version watermark reaches `current_version`. Early sells then go through
 * `enqueue_redeem_open`, which sells Open queue records only, so a position held
 * in the account has no early exit after the cutover.
 */
export function redeemLive(options: RedeemLiveOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u256',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'pricer',
		'orderId',
		'closeQuantity',
		'minProbability',
		'minProceeds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_live',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RedeemSettledArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface RedeemSettledOptions {
	package?: string;
	arguments: RedeemSettledArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Redeem a settled order you hold account authority over.
 *
 * The market must be settled already; this flow does not run live pricing.
 * Explicit owner auth remains available when Predict app automation is
 * deauthorized; another authorized app may also supply valid account auth.
 */
export function redeemSettled(options: RedeemSettledOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u256',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['market', 'wrapper', 'auth', 'config', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_settled',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RedeemSettledPermissionlessArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface RedeemSettledPermissionlessOptions {
	package?: string;
	arguments: RedeemSettledPermissionlessArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Redeem a settled order without account-owner authority, as an allowlisted
 * keeper.
 *
 * Despite the name, only a sender admin has added through
 * `protocol_config::add_settled_redeem_keeper` may call this; the allowlist starts
 * empty. The payout still goes to the order's account. This keeper path uses
 * Predict app-auth from the account registry, so `deauthorize_app<PredictApp>`
 * also disables it. Owners can still use `redeem_settled` with owner auth to
 * redeem their own settled positions.
 */
export function redeemSettledPermissionless(options: RedeemSettledPermissionlessOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u256',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['market', 'accountRegistry', 'wrapper', 'config', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_settled_permissionless',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetReferenceTickArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
}
export interface SetReferenceTickOptions {
	package?: string;
	arguments: SetReferenceTickArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set this expiry's reference fine-grid tick from the exact previous-window
 * Propbook Pyth observation. The source observation must be inserted into the feed
 * at `reference_tick_source_timestamp_ms` before this call, and the normalized
 * spot is floored to the market's `tick_size`. Not gated on the valuation lock:
 * the reference tick shapes mint admission only, and a mint it admits mid-flush is
 * invisible to the captured snapshot like any other.
 */
export function setReferenceTick(options: SetReferenceTickOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'propbookRegistry', 'pyth'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'set_reference_tick',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetMintPausedArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	paused: RawTransactionArgument<boolean>;
}
export interface SetMintPausedOptions {
	package?: string;
	arguments: SetMintPausedArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set whether new mints are paused on this expiry market. Admin-only and
 * version-gated. A `PauseCap` holder can force-engage the pause one-way under a
 * version freeze via `registry::pause_expiry_market_mint_pause_cap`.
 */
export function setMintPaused(options: SetMintPausedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'AdminCap', 'paused'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'set_mint_paused',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface TrySettleArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
}
export interface TrySettleOptions {
	package?: string;
	arguments: TrySettleArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Settle an expired market and pay its Open queue records, one phase per call.
 * Permissionless, and never aborts because of a queued order.
 *
 * 1.  Refund phase: while queued orders are still waiting, refund them (reason 5;
 *     a RefundDue order keeps its stored reason) visiting at most the policy's
 *     `settle_refund_batch` records, refunded or not, and return false. These
 *     refunds skip node pruning and report `sender` `@0x0`.
 * 2.  Settle phase: settle from Propbook's exact positive Pyth spot at expiry, or
 *     from the exact Block Scholes minute-boundary spot when Pyth remains
 *     unavailable after the compiled grace period; missing or unusable
 *     observations leave the market unsettled. Then close the queue and move any
 *     leftover queue escrow into market cash (`QueueEscrowSwept`). This call pays
 *     nothing.
 * 3.  Payout phase: from the payout cursor, visit at most the policy's
 *     `settle_payout_batch` records. Each Open record is paid its settled payout
 *     from market cash (zero for a loser), marked Closed, and reported with
 *     `OpenRecordSettled`. A record the market cannot pay stays Open with
 *     `OpenRecordPayoutSkipped`. Other records and deleted IDs count as visited.
 *
 * Before the policy exists the compiled default batch sizes apply. Emits
 * `MarketPayoutsCompleted` once: from the call that moves the payout cursor to the
 * last record, or from the settling call of a market without a queue. Returns true
 * once the market is settled and the payout walk is complete; keepers stop on that
 * event or `payout_progress`.
 */
export function trySettle(options: TrySettleOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['market', 'config', 'propbookRegistry', 'pyth', 'bsValues'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'try_settle',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueExactQuantityArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactQuantityOptions {
	package?: string;
	arguments: EnqueueExactQuantityArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Place a queued mint for an exact quantity, priced later at Pyth's signed price
 * for its τ. Replaces `mint_exact_quantity` once the cutover is reached.
 * `max_cost` caps the all-in withdrawal and is mandatory; `max_probability` caps
 * the entry probability at τ. Escrows the budget,
 * `min(max_cost, quantity,  available - order_fee)`, and the order fee, and
 * returns the new record ID.
 *
 * Aborts, charging nothing, when a gate or check refuses the order: the version
 * and cutover gates, the trading and mint pauses, the snapshot stage, a stuck or
 * full queue (`EQueueStuck`, `EQueueFull`, `EAccountOrderCap`), τ at or past the
 * cutoff (`EPastCutoff`), the volatility snapshot, an unlimited or zero `max_cost`
 * (`EMintCostCapRequired`), a balance not above the order fee (`EFeeNotCovered`),
 * an order that already fails its own limits at t₀ (`EOrderFailsLimits`), or a
 * cash need above the market's spare cash (`EInsufficientMarketCash`).
 */
export function enqueueExactQuantity(options: EnqueueExactQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'lowerTick',
		'higherTick',
		'quantity',
		'maxCost',
		'maxProbability',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'enqueue_exact_quantity',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueExactAmountArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactAmountOptions {
	package?: string;
	arguments: EnqueueExactAmountArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Place a queued premium-budget mint: sized at τ under `max_premium`, at least
 * `min_quantity`, with the all-in withdrawal capped by the mandatory `max_cost`.
 * Escrows `min(max_cost, available - order_fee)` and the order fee. Refuses orders
 * like `enqueue_exact_quantity`. Returns the new record ID.
 */
export function enqueueExactAmount(options: EnqueueExactAmountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'lowerTick',
		'higherTick',
		'maxPremium',
		'minQuantity',
		'maxCost',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'enqueue_exact_amount',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueExactCostArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface EnqueueExactCostOptions {
	package?: string;
	arguments: EnqueueExactCostArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Place a queued all-in-budget mint: sized at τ so the all-in cost fits
 * `max_cost`, at least `min_quantity`. Escrows
 * `min(max_cost, available -  order_fee)` and the order fee. `max_cost` is
 * mandatory here too: the unlimited value is refused. Refuses orders like
 * `enqueue_exact_quantity`. Returns the new record ID.
 */
export function enqueueExactCost(options: EnqueueExactCostOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'lowerTick',
		'higherTick',
		'maxCost',
		'minQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'enqueue_exact_cost',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueRedeemOpenArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	recordId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
}
export interface EnqueueRedeemOpenOptions {
	package?: string;
	arguments: EnqueueRedeemOpenArguments;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Place a queued early sell of `close_quantity` of an Open record's position.
 * `record_id` is the record's queue ID, not the position's order ID. The source
 * record must belong to this account (`ENotRecordOwner`) and be Open
 * (`ERecordNotOpen`, also for a missing ID). It is marked Closed and its whole
 * position moves into the new record until the sell fills or refunds.
 * `min_probability` and `min_proceeds` are the close-side floors at τ. Returns the
 * new record ID.
 *
 * Open during the trading pause and a market mint pause. Escrows only the order
 * fee, so a balance equal to it is enough. Refuses a sell below
 * `min_sell_quantity` or one leaving a remainder below it (`EBelowMinSell`). There
 * is no spare-cash check: the keeper funds the market before τ, and resolve
 * refunds a sell the market still cannot cover.
 */
export function enqueueRedeemOpen(options: EnqueueRedeemOpenOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'recordId',
		'closeQuantity',
		'minProbability',
		'minProceeds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'enqueue_redeem_open',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CommitArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	updates: TransactionArgument;
}
export interface CommitOptions {
	package?: string;
	arguments: CommitArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Attach verified Pyth Lazer prices to the waiting cohorts whose τ they match.
 * Permissionless. Each update must come from the current Pyth Lazer package's
 * verifier earlier in the same PTB; their order in `updates` does not matter. An
 * update that matches no waiting cohort is skipped.
 *
 * Uses Lazer's v1 `Update`, which Pyth marked deprecated on Mainnet but still
 * serves; v2 arrives with a later upgrade.
 */
export function commit(options: CommitOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'vector<null>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['market', 'config', 'updates'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'commit',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ResolveArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	maxOrders: RawTransactionArgument<number | bigint>;
}
export interface ResolveOptions {
	package?: string;
	arguments: ResolveArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Fill or refund committed orders in τ order from the market's own cash, visiting
 * at most `max_orders` records. Permissionless. An order the market's cash cannot
 * cover is refunded with reason 8. Returns how many orders it finished.
 *
 * Walks the cohorts in τ order and loads only committed or overdue ones; a cohort
 * still waiting for its price is skipped without loading a record. Every record
 * visited counts against `max_orders`, finished or missing ones included, so one
 * call stays inside Sui's per-transaction object limit. An order at or past its
 * deadline is refunded (reason 5), never filled. Returns 0 on a settled market,
 * whose waiting orders `try_settle` refunds.
 */
export function resolve(options: ResolveOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'maxOrders'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'resolve',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RefundArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	maxOrders: RawTransactionArgument<number | bigint>;
}
export interface RefundOptions {
	package?: string;
	arguments: RefundArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Refund waiting orders at or past their deadline (reason 5), visiting at most
 * `max_orders` records, refunded or not. It walks the cohorts in τ order and stops
 * at the first one not yet due, since deadlines never decrease along the queue. A
 * RefundDue order keeps its stored reason. Permissionless, and available under the
 * emergency freeze. Returns how many orders it refunded: `0`, without aborting,
 * when none is due.
 */
export function refund(options: RefundOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'maxOrders'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'refund',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface AdminRefundArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	recordIds: RawTransactionArgument<Array<number | bigint>>;
}
export interface AdminRefundOptions {
	package?: string;
	arguments: AdminRefundArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Refund the listed waiting orders at once (reason 7; a RefundDue order keeps its
 * stored reason), wherever they sit in the queue. Admin-only, and available under
 * the emergency freeze. Missing and finished IDs are skipped.
 */
export function adminRefund(options: AdminRefundOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'vector<u64>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['market', 'config', 'AdminCap', 'recordIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'admin_refund',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CleanupArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	recordIds: RawTransactionArgument<Array<number | bigint>>;
}
export interface CleanupOptions {
	package?: string;
	arguments: CleanupArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Delete Refunded and Closed records of a settled market. Permissionless; the
 * storage rebate goes to the caller. Missing IDs and other statuses are skipped;
 * `QueuedOrdersCleaned` is emitted only when a record was deleted. Takes `&Clock`
 * only to stamp the event.
 */
export function cleanup(options: CleanupOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'vector<u64>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['market', 'config', 'recordIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'cleanup',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
