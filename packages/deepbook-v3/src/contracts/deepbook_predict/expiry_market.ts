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
 * It also owns the order-flow primitives an order-flow companion package drives.
 * `admit_mint` and `admit_sell` admit one queued order, pin a mint's boundary
 * nodes, record the order's cash need in the market's `OrderFlowLedger`, and issue
 * or advance its `OrderReceipt`. `commit` stores the bounded Pyth price the order
 * fills at, `try_fill` fills or refunds it, `release` takes it out without
 * filling, and `try_pay_settled` pays a queue-held position after settlement. A
 * queued fill never enters the account: its position stays in the receipt.
 * Admission, commit, and fill need an allowlisted companion witness; release and
 * the settled payout need only the receipt. The queue itself, its escrow, its
 * policy, and its events live in the companion.
 *
 * Mainnet USDC is a regulated coin: Sui aborts a transaction that sends it to an
 * address on its deny list, or to anyone while it is globally paused. So the fill,
 * the fee routing, and the settled payout read `sui::deny_list` first and never
 * send to such an address. A fill for a denied receive address is refused, a
 * denied builder or referrer's fee stays in market cash, and a denied winner's
 * payout is skipped for a later `try_pay_settled`.
 */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { U64, U256 } from '../../bcs/integers.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as expiry_cash from './expiry_cash.js';
import * as balance from './deps/sui/balance.js';
import * as strike_exposure from './strike_exposure.js';
import * as ewma from './ewma.js';
import * as pricing from './pricing.js';
import * as vec_map from './deps/sui/vec_map.js';
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
export const OrderParties = new MoveStruct({
	name: `${$moduleName}::OrderParties`,
	fields: {
		account_id: bcs.Address,
		owner: bcs.Address,
		/** Sell proceeds and the settled payout go only here. */
		receive_address: bcs.Address,
		referrer_account_id: bcs.option(bcs.Address),
		referrer_receive_address: bcs.option(bcs.Address),
		builder_code_id: bcs.option(bcs.Address),
	},
});
export const OrderReceipt = new MoveStruct({
	name: `${$moduleName}::OrderReceipt`,
	fields: {
		expiry_market_id: bcs.Address,
		stage: bcs.u8(),
		/** A `constants` mint kind, or `order_kind_sell` once a sell is admitted. */
		kind: bcs.u8(),
		/** The account's snapshot at the last admission. */
		parties: OrderParties,
		lower_tick: U64,
		higher_tick: U64,
		/** The exact mint quantity, or the sell's close quantity. */
		quantity: U64,
		max_premium: U64,
		min_quantity: U64,
		max_probability: U64,
		min_probability: U64,
		min_proceeds: U64,
		/** Earliest Pyth generation time the order may price at. */
		tau_ms: U64,
		/** At or past it the order is refunded, never filled. */
		deadline_ms: U64,
		/** The Lazer channel τ was planned on; the committed price must come from it. */
		channel: bcs.u8(),
		vol: pricing.VolSnapshot,
		budget: U64,
		order_fee: U64,
		/**
		 * Worst-case market cash the fill can consume. Counted in the ledger's
		 * `waiting_cash_need` while the order is admitted.
		 */
		cash_need: U64,
		/**
		 * The t₀ quote's pre-subsidy trading fee, capped at `budget`. Bounds the subsidy
		 * `commit` reserves.
		 */
		subsidy_bound: U64,
		subsidy_rate: U64,
		subsidy_reserved: U64,
		/** The committed Pyth price, 1e9-normalized; `0` until `commit`. */
		spot: U64,
		/** The committed update's envelope, in ms. The fill prices at it. */
		tick_ms: U64,
		/** The committed feed's own update time, in µs. */
		generation_us: U64,
		/** The open position's order ID; `0` until the mint fills. */
		order_id: U256,
		/** Stable economic-position handle, constant across partial closes. */
		root_id: U256,
		opened_at_ms: U64,
		/**
		 * The open position's size, the quantity `order_id` names. The request's
		 * `quantity` is the mint or close quantity, so a sell admission never overwrites
		 * the size it closes.
		 */
		held_quantity: U64,
	},
});
export const OrderFlowLedgerKey = new MoveTuple({
	name: `${$moduleName}::OrderFlowLedgerKey`,
	fields: [bcs.bool()],
});
export const OrderFlowLedger = new MoveStruct({
	name: `${$moduleName}::OrderFlowLedger`,
	fields: {
		/**
		 * Admitted mints per payout-tree tick (tick -> count). A pinned node is never
		 * pruned, so a fill never creates one.
		 */
		pins: vec_map.VecMap(U64, U64),
		/**
		 * Sum of the admitted orders' cash needs. `rebalance_expiry_cash` funds a live
		 * market to at least required cash plus this.
		 */
		waiting_cash_need: U64,
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
 * Quote a prospective mint at a market-bound `Pricer`, priced like a queued fill
 * at the clock, for SDK and devInspect previews. `exact_quantity` quotes
 * `min_quantity` exactly; otherwise the largest quantity whose premium fits
 * `max_premium`, at least `min_quantity`. No builder fee. The fee subsidy is the
 * configured rate capped by the market's incentive balance, and `penalty_fee` is
 * always 0. Gated only on the pricer binding (`EWrongPricer`) and `now < expiry`
 * (`EInvalidOrderTiming`). Aborts `EOrderFailsLimits` when the mint would be
 * refused at the clock.
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
 * `quote_mint` for the wrapper's account: `max_premium` is capped at the account's
 * balance and the account's builder fee is charged.
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
 * Quote the largest mint whose all-in cost fits `min(max_cost, account  balance)`,
 * at least `min_quantity`, for the wrapper's account, priced like a queued
 * exact-cost fill at the clock. Charges the account's builder fee, and otherwise
 * prices and gates like `quote_mint`.
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
export interface OrderFlowStateArguments {
	market: RawTransactionArgument<string>;
}
export interface OrderFlowStateOptions {
	package?: string;
	arguments: OrderFlowStateArguments | [market: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return `(waiting_cash_need, payout_tree_node_count, min_entry_probability)`: the
 * summed cash need of the market's admitted orders, above required cash, that
 * `rebalance_expiry_cash` keeps a live market funded with; the payout tree's node
 * count, pinned zero nodes included, which sizes the keeper's fill batches; and
 * the snapshotted minimum entry probability the SDK computes a queued mint's cash
 * need from. For SDK, keeper, and devInspect reads.
 */
export function orderFlowState(options: OrderFlowStateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'order_flow_state',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiptInfoArguments {
	receipt: TransactionArgument;
}
export interface ReceiptInfoOptions {
	package?: string;
	arguments: ReceiptInfoArguments | [receipt: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Return a receipt's
 * `(expiry_market_id, stage, account_id, order_id,  pyth_source_id, cash_need, subsidy_bound, vol)`.
 * For the order-flow companion's queue events and Lazer decoding, and devInspect
 * reads of queue records.
 */
export function receiptInfo(options: ReceiptInfoOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'receipt_info',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
export interface QuoteCloseArguments {
	market: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	receipt: TransactionArgument;
	closeQuantity: RawTransactionArgument<number | bigint>;
	builderCodeId: RawTransactionArgument<string | null>;
}
export interface QuoteCloseOptions {
	package?: string;
	arguments:
		| QuoteCloseArguments
		| [
				market: RawTransactionArgument<string>,
				pricer: TransactionArgument,
				receipt: TransactionArgument,
				closeQuantity: RawTransactionArgument<number | bigint>,
				builderCodeId: RawTransactionArgument<string | null>,
		  ];
	config?: {
		predictPackageId?: string;
	};
}
/**
 * Quote an early sell of `close_quantity` of an open receipt's position at a
 * market-bound `Pricer` and the clock, charging `builder_code_id`'s builder fee:
 * the close a sell fill prices, without the trader's floors. `proceeds` is before
 * the order fee. Changes nothing. Aborts on the pricer binding (`EWrongPricer`),
 * another market's receipt (`EWrongMarket`), a receipt that is not open
 * (`EWrongStage`), `now >= expiry` (`EInvalidOrderTiming`), or a close that cannot
 * be priced (`EOrderFailsLimits`). Public for the order-flow companion's sell
 * preview and SDK reads.
 */
export function quoteClose(options: QuoteCloseOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		'u64',
		'0x1::option::Option<0x2::object::ID>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['market', 'pricer', 'receipt', 'closeQuantity', 'builderCodeId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'quote_close',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintExactQuantityArguments {
	Market: RawTransactionArgument<string>;
	Wrapper: RawTransactionArgument<string>;
	Auth: TransactionArgument;
	Config?: RawTransactionArgument<string>;
	Pricer: TransactionArgument;
	LowerTick: RawTransactionArgument<number | bigint>;
	HigherTick: RawTransactionArgument<number | bigint>;
	Quantity: RawTransactionArgument<number | bigint>;
	MaxCost: RawTransactionArgument<number | bigint>;
	MaxProbability: RawTransactionArgument<number | bigint>;
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
 * Retired by delayed execution: always aborts `EDelayedExecutionRequired`. Mints
 * are queued through the order-flow companion.
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
		'Market',
		'Wrapper',
		'Auth',
		'Config',
		'Pricer',
		'LowerTick',
		'HigherTick',
		'Quantity',
		'MaxCost',
		'MaxProbability',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_quantity',
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
export interface MintExactAmountArguments {
	Market: RawTransactionArgument<string>;
	Wrapper: RawTransactionArgument<string>;
	Auth: TransactionArgument;
	Config?: RawTransactionArgument<string>;
	Pricer: TransactionArgument;
	LowerTick: RawTransactionArgument<number | bigint>;
	HigherTick: RawTransactionArgument<number | bigint>;
	MaxPremium: RawTransactionArgument<number | bigint>;
	MinQuantity: RawTransactionArgument<number | bigint>;
	MaxCost: RawTransactionArgument<number | bigint>;
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
 * Retired by delayed execution: always aborts `EDelayedExecutionRequired`. Mints
 * are queued through the order-flow companion.
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
		'Market',
		'Wrapper',
		'Auth',
		'Config',
		'Pricer',
		'LowerTick',
		'HigherTick',
		'MaxPremium',
		'MinQuantity',
		'MaxCost',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_amount',
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
export interface MintExactCostArguments {
	Market: RawTransactionArgument<string>;
	Wrapper: RawTransactionArgument<string>;
	Auth: TransactionArgument;
	Config?: RawTransactionArgument<string>;
	Pricer: TransactionArgument;
	LowerTick: RawTransactionArgument<number | bigint>;
	HigherTick: RawTransactionArgument<number | bigint>;
	MaxCost: RawTransactionArgument<number | bigint>;
	MinQuantity: RawTransactionArgument<number | bigint>;
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
 * Retired by delayed execution: always aborts `EDelayedExecutionRequired`. Mints
 * are queued through the order-flow companion.
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
		'Market',
		'Wrapper',
		'Auth',
		'Config',
		'Pricer',
		'LowerTick',
		'HigherTick',
		'MaxCost',
		'MinQuantity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_cost',
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
export interface RedeemLiveArguments {
	Market: RawTransactionArgument<string>;
	Wrapper: RawTransactionArgument<string>;
	Auth: TransactionArgument;
	Config?: RawTransactionArgument<string>;
	Pricer: TransactionArgument;
	OrderId: RawTransactionArgument<number | bigint>;
	CloseQuantity: RawTransactionArgument<number | bigint>;
	MinProbability: RawTransactionArgument<number | bigint>;
	MinProceeds: RawTransactionArgument<number | bigint>;
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
 * Retired by delayed execution: always aborts `EDelayedExecutionRequired`. Early
 * sells of queue-held positions go through the order-flow companion; account-held
 * positions exit through `redeem_settled` after settlement.
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
		'Market',
		'Wrapper',
		'Auth',
		'Config',
		'Pricer',
		'OrderId',
		'CloseQuantity',
		'MinProbability',
		'MinProceeds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_live',
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
 * Settle from Propbook's exact positive Pyth spot at expiry, or from the exact
 * Block Scholes minute-boundary spot when Pyth remains unavailable after the
 * compiled grace period. Permissionless and idempotent; missing or unusable
 * observations leave the market unsettled.
 *
 * Settlement reads nothing from the order-flow queue. Every admission's deadline
 * is at least `constants::deadline_expiry_margin_ms!()` before expiry, so at
 * expiry a waiting order can only be released, and the settled liability already
 * covers every queue-held position, which lives in the payout tree. The companion
 * drains and pays its queue afterwards.
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
export interface AdmitMintArguments<W extends BcsType<any>> {
	W: RawTransactionArgument<W>;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	account: TransactionArgument;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	kind: RawTransactionArgument<number>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
	budget: RawTransactionArgument<number | bigint>;
	orderFee: RawTransactionArgument<number | bigint>;
	sviMaxAgeMs: RawTransactionArgument<number | bigint>;
	channel: RawTransactionArgument<number>;
	tauMs: RawTransactionArgument<number | bigint>;
	deadlineMs: RawTransactionArgument<number | bigint>;
}
export interface AdmitMintOptions<W extends BcsType<any>> {
	package?: string;
	arguments: AdmitMintArguments<W>;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Admit one queued mint for the order-flow companion and return its receipt.
 *
 * `kind` is a `constants` mint kind. The companion has already taken
 * `budget +  order_fee` from the account and escrows it. `budget` caps the fill's
 * all-in cost; the companion sets it to `min(max_cost, balance - order_fee)`, and
 * to at most `quantity` for an exact-quantity mint. The order prices at a Pyth
 * price on Lazer channel `channel`, generated at or after `tau_ms`, and must fill
 * before `deadline_ms`.
 *
 * Aborts unless `W` is allowlisted, the version and cutover gates pass, trading
 * and this market's mints are unpaused, and the snapshot stage is closed. The
 * timing must fit (`EInvalidOrderTiming`): `channel` a supported fixed-rate
 * channel (`lazer_price::channel_fixed_rate_*`), `tau_ms` on its grid, at most one
 * of its ticks before now, and before `deadline_ms`, τ before the no-trade window,
 * and the deadline at least `constants::deadline_expiry_margin_ms!()` before
 * expiry. Then `svi_max_age_ms` must be within `constants::max_svi_max_age_ms!()`
 * and `kind` a mint kind (`EInvalidOrderTerms`), the volatility snapshot must
 * load, `budget` must be positive (`EMintCostCapRequired`), the order must pass
 * its own limits at the clock without subsidy (`EOrderFailsLimits`), and its cash
 * need must fit the market's spare cash (`EInsufficientMarketCash`). Admission
 * then pins both boundary nodes, creating them under the node cap, and adds the
 * cash need to the ledger.
 */
export function admitMint<W extends BcsType<any>>(options: AdmitMintOptions<W>) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u8',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u8',
		'u64',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'W',
		'market',
		'config',
		'account',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'kind',
		'lowerTick',
		'higherTick',
		'quantity',
		'maxPremium',
		'minQuantity',
		'maxProbability',
		'budget',
		'orderFee',
		'sviMaxAgeMs',
		'channel',
		'tauMs',
		'deadlineMs',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'admit_mint',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface AdmitSellArguments<W extends BcsType<any>> {
	W: RawTransactionArgument<W>;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	account: TransactionArgument;
	receipt: TransactionArgument;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
	orderFee: RawTransactionArgument<number | bigint>;
	sviMaxAgeMs: RawTransactionArgument<number | bigint>;
	channel: RawTransactionArgument<number>;
	tauMs: RawTransactionArgument<number | bigint>;
	deadlineMs: RawTransactionArgument<number | bigint>;
}
export interface AdmitSellOptions<W extends BcsType<any>> {
	package?: string;
	arguments: AdmitSellArguments<W>;
	config?: {
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Admit an early sell of `close_quantity` of an open receipt's position: the
 * receipt moves to the sell stage in place, with the sell's request, the account's
 * current owner and builder code, a fresh volatility snapshot, τ, the deadline,
 * and no price. The companion escrows `order_fee` and owns the minimum-sell
 * checks.
 *
 * Open during the trading pause and a market mint pause. Aborts unless `W` is
 * allowlisted, the version, cutover, and snapshot-stage gates and `admit_mint`'s
 * timing and SVI-age checks pass, the receipt is this market's (`EWrongMarket`),
 * open (`EWrongStage`), and `account`'s (`ENotRecordOwner`), the volatility
 * snapshot loads, and the close passes its own floors at the clock
 * (`EOrderFailsLimits`). Then adds the sell's cash need,
 * `ceil(close_quantity * (1 - backing_buffer_lambda)) + 1`, to the ledger: a close
 * lowers payout liability by at least `lambda * close_quantity` and pays at most
 * `close_quantity`. There is no spare-cash check. The keeper funds the market
 * before τ, and the fill refunds a sell the market cannot cover.
 */
export function admitSell<W extends BcsType<any>>(options: AdmitSellOptions<W>) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
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
		'u8',
		'u64',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'W',
		'market',
		'config',
		'account',
		'receipt',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
		'closeQuantity',
		'minProbability',
		'minProceeds',
		'orderFee',
		'sviMaxAgeMs',
		'channel',
		'tauMs',
		'deadlineMs',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'admit_sell',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface CommitArguments<W extends BcsType<any>> {
	W: RawTransactionArgument<W>;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	receipt: TransactionArgument;
	price: TransactionArgument;
}
export interface CommitOptions<W extends BcsType<any>> {
	package?: string;
	arguments: CommitArguments<W>;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Commit the Pyth price an admitted order fills at: a `LazerPrice`, which only the
 * `deepbook_predict_math` library builds, from a Pyth-verified Lazer update.
 * Stores the spot, the envelope time (the tick the fill prices at), and the feed's
 * generation time. For a mint it also reserves the fee subsidy,
 * `min(subsidy_bound * fee_incentive_subsidy_rate, incentives left)`, records the
 * rate and amount, and returns the reservation for the companion to escrow with
 * the order. A sell returns a zero balance.
 *
 * The price must be the receipt's: its Pyth feed and channel, an envelope at
 * exactly τ or one tick of that channel later (the backup tick), a generation time
 * between τ and the envelope, an envelope at or before now, and a pricing-safe
 * spot (`EWrongPrice`). Aborts unless `W` is allowlisted, the version gate passes,
 * the receipt is this market's (`EWrongMarket`), admitted with no price yet
 * (`EWrongStage`), and before its deadline (`EInvalidOrderTiming`).
 */
export function commit<W extends BcsType<any>>(options: CommitOptions<W>) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		null,
		null,
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['W', 'market', 'config', 'receipt', 'price'];
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
			typeArguments: options.typeArguments,
		});
}
export interface TryFillArguments<W extends BcsType<any>> {
	W: RawTransactionArgument<W>;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	receipt: TransactionArgument;
	escrow: TransactionArgument;
}
export interface TryFillOptions<W extends BcsType<any>> {
	package?: string;
	arguments: TryFillArguments<W>;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Fill or refund one committed order at its committed price and consume or return
 * its receipt. `escrow` is the order's escrowed budget, order fee, and reserved
 * subsidy. Returns
 * `(reason, receipt to keep, escrow left over,  quantity, amount, trading_fee, builder_fee, referral_fee, subsidy_used,  inventory_impact)`.
 * The amounts are zero on a refund. For a mint `amount` is the all-in cost and
 * `inventory_impact` the charge; for a sell `amount` is the proceeds and
 * `inventory_impact` the rebate.
 *
 * Aborts only on a companion bookkeeping error: `W` not allowlisted, the version,
 * freeze, or snapshot-stage gate, another market's receipt (`EWrongMarket`), a
 * receipt not admitted or without a price (`EWrongStage`), or `escrow` below
 * `budget + order_fee + subsidy_reserved` (`EEscrowMismatch`). Every market
 * condition returns a refund reason instead, `0` for a fill: 5 at or past the
 * deadline, which also covers expiry and settlement; 9 when USDC sent to the
 * receipt's receive address would abort the transaction (`denied`: the address is
 * on USDC's deny list for the current epoch, or USDC is globally paused), so
 * nothing is sent there; 2 when no `Pricer` exists at the tick; then the fill's
 * own 1 (the order's limits), 2 (admission), 4 (a pinned node is missing, a
 * backstop), and 8 (the market's cash after the fill would not cover its required
 * cash).
 *
 * A mint fill pays the premium, the trading fee net of the referral share, the
 * used subsidy, the order fee, and the inventory-impact charge into market cash,
 * sends the builder and referral fees, returns unused subsidy to the incentive
 * balance, emits `OrderMinted` with no congestion penalty, and returns the receipt
 * open. A sell fill pays the proceeds (redeem value plus inventory-impact rebate,
 * less the trading and builder fees) to the receipt's receive address, keeps the
 * trading and order fees in market cash, emits `LiveOrderRedeemed`, and returns
 * the receipt open with the replacement position of a partial close, or consumes
 * it on a full close. A builder or referral fee whose recipient is denied stays in
 * market cash instead, and the events still report it as charged. A refund keeps
 * the order fee in market cash for reasons 1 and 2, returns the reserved subsidy
 * to the incentive balance, prunes a mint's emptied unpinned nodes, returns the
 * rest of the escrow, and returns a sell's receipt open or consumes a mint's.
 * Every outcome takes the order out of the ledger.
 */
export function tryFill<W extends BcsType<any>>(options: TryFillOptions<W>) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		null,
		null,
		null,
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['W', 'market', 'config', 'receipt', 'escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'try_fill',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface ReleaseArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	receipt: TransactionArgument;
	escrow: TransactionArgument;
	reason: RawTransactionArgument<number>;
	prune: RawTransactionArgument<boolean>;
}
export interface ReleaseOptions {
	package?: string;
	arguments: ReleaseArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Take an admitted order out without filling it: the companion's deadline, admin,
 * and settlement-drain refunds release their receipt here. `escrow` is the order's
 * escrowed budget, order fee, and reserved subsidy, and `reason` the refund's
 * `constants::fill_reason_*` code. The order fee follows `try_fill`'s refund rule:
 * reasons 1 and 2 keep it in market cash, and every other reason leaves it in the
 * escrow returned. Returns the reservation to the incentive balance, subtracts the
 * exact cash need from the ledger, and unpins a mint's boundary ticks, pruning
 * emptied, unpinned, unretained nodes only when `prune` and the market is
 * unsettled. Returns a sell's receipt open, still holding its position, or `none`
 * for a mint's, which it consumes, and the rest of the escrow.
 *
 * Needs no allowlisting and checks only the version floor, so the drain works
 * while the protocol is frozen and after the witness is removed. Keeping an order
 * fee moves market cash, so like a fill it aborts inside the keeper's snapshot
 * stage (`ESnapshotInProgress`). Aborts on another market's receipt
 * (`EWrongMarket`), a receipt not admitted (`EWrongStage`), or `escrow` below
 * `budget + order_fee + subsidy_reserved` (`EEscrowMismatch`).
 */
export function release(options: ReleaseOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, 'u8', 'bool'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'receipt', 'escrow', 'reason', 'prune'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'release',
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
export interface TryPaySettledArguments {
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	receipt: TransactionArgument;
}
export interface TryPaySettledOptions {
	package?: string;
	arguments: TryPaySettledArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Pay an open receipt's settled payout, zero for a loser, to its receive address
 * and consume the receipt. Returns the payout and `none`. When the payout is above
 * market cash or above the settled liability left, or a nonzero payout's receive
 * address is denied (`try_fill`'s reason 9: on USDC's deny list for the current
 * epoch, or USDC globally paused), changes nothing and returns that payout with
 * the receipt, so the companion's payout walk moves on and a later call pays it
 * once the cause clears. Needs no allowlisting and checks only the version floor.
 * Aborts on another market's receipt (`EWrongMarket`), a receipt that is not open
 * (`EWrongStage`), or an unsettled market (`EMarketNotSettled`).
 */
export function tryPaySettled(options: TryPaySettledOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, '0x2::deny_list::DenyList'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'try_pay_settled',
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
