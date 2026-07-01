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
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as expiry_cash from './expiry_cash.js';
import * as balance from './deps/sui/balance.js';
import * as strike_exposure from './strike_exposure.js';
import * as ewma from './ewma.js';
const $moduleName = '@local-pkg/deepbook_predict::expiry_market';
export const ExpiryMarket = new MoveStruct({
	name: `${$moduleName}::ExpiryMarket`,
	fields: {
		id: bcs.Address,
		/** Propbook underlying this market was created for. */
		propbook_underlying_id: bcs.u32(),
		expiry: bcs.u64(),
		/** Terminal settlement price once exact Propbook expiry data has been recorded. */
		settlement_price: bcs.option(bcs.u64()),
		/** DUSDC custody, payout backing, and unresolved rebate reserve basis. */
		cash: expiry_cash.ExpiryCash,
		/** Sponsor-funded DUSDC available to subsidize this market's taker fees. */
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
	},
});
export interface IdArguments {
	market: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [market: RawTransactionArgument<string>];
}
/** Return the expiry market object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return the Propbook underlying this market was created for. */
export function propbookUnderlyingId(options: PropbookUnderlyingIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return the expiry timestamp in milliseconds. */
export function expiry(options: ExpiryOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
export interface CashBalanceArguments {
	market: RawTransactionArgument<string>;
}
export interface CashBalanceOptions {
	package?: string;
	arguments: CashBalanceArguments | [market: RawTransactionArgument<string>];
}
/** Return DUSDC currently held by this expiry. */
export function cashBalance(options: CashBalanceOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
export interface RebateReserveArguments {
	market: RawTransactionArgument<string>;
}
export interface RebateReserveOptions {
	package?: string;
	arguments: RebateReserveArguments | [market: RawTransactionArgument<string>];
}
/** Return DUSDC reserved for unresolved trading loss rebates. */
export function rebateReserve(options: RebateReserveOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'rebate_reserve',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeeIncentiveBalanceArguments {
	market: RawTransactionArgument<string>;
}
export interface FeeIncentiveBalanceOptions {
	package?: string;
	arguments: FeeIncentiveBalanceArguments | [market: RawTransactionArgument<string>];
}
/** Return sponsor-funded DUSDC available to subsidize this market's taker fees. */
export function feeIncentiveBalance(options: FeeIncentiveBalanceOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
export interface TradingLossRebateRateArguments {
	market: RawTransactionArgument<string>;
}
export interface TradingLossRebateRateOptions {
	package?: string;
	arguments: TradingLossRebateRateArguments | [market: RawTransactionArgument<string>];
}
/** Return the trading loss rebate rate snapshotted for this expiry. */
export function tradingLossRebateRate(options: TradingLossRebateRateOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'trading_loss_rebate_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LiquidationLtvArguments {
	market: RawTransactionArgument<string>;
}
export interface LiquidationLtvOptions {
	package?: string;
	arguments: LiquidationLtvArguments | [market: RawTransactionArgument<string>];
}
/** Return the liquidation LTV snapshotted for this expiry. */
export function liquidationLtv(options: LiquidationLtvOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'liquidation_ltv',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxAdmissionLeverageArguments {
	market: RawTransactionArgument<string>;
}
export interface MaxAdmissionLeverageOptions {
	package?: string;
	arguments: MaxAdmissionLeverageArguments | [market: RawTransactionArgument<string>];
}
/** Return the max admission leverage snapshotted for this expiry. */
export function maxAdmissionLeverage(options: MaxAdmissionLeverageOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'max_admission_leverage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BackingBufferLambdaArguments {
	market: RawTransactionArgument<string>;
}
export interface BackingBufferLambdaOptions {
	package?: string;
	arguments: BackingBufferLambdaArguments | [market: RawTransactionArgument<string>];
}
/** Return the backing-buffer lambda snapshotted for this expiry. */
export function backingBufferLambda(options: BackingBufferLambdaOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return the trade-fee ramp window snapshotted for this expiry. */
export function expiryFeeWindowMs(options: ExpiryFeeWindowMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return the trade-fee ramp max multiplier snapshotted for this expiry. */
export function expiryFeeMaxMultiplier(options: ExpiryFeeMaxMultiplierOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
export interface TickSizeArguments {
	market: RawTransactionArgument<string>;
}
export interface TickSizeOptions {
	package?: string;
	arguments: TickSizeArguments | [market: RawTransactionArgument<string>];
}
/**
 * Return the strike tick size snapshotted for this expiry. Raw strikes are derived
 * off-chain / by the SDK as `tick * tick_size`.
 */
export function tickSize(options: TickSizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return the coarser raw-price step that new finite mint boundaries must align to. */
export function admissionTickSize(options: AdmissionTickSizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/**
 * Return the reference fine-grid tick admitted for this expiry, if it has been
 * set.
 */
export function referenceTick(options: ReferenceTickOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return the exact Propbook Pyth source timestamp used to derive `reference_tick`. */
export function referenceTickSourceTimestampMs(options: ReferenceTickSourceTimestampMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/**
 * Return buffered live reserve, or exact remaining settled payout liability once
 * materialized.
 */
export function payoutLiability(options: PayoutLiabilityOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
}
/** Return cash required to cover payout liability plus unresolved rebate reserve. */
export function requiredCash(options: RequiredCashOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsSpot: RawTransactionArgument<string>;
	bsForward: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
}
export interface LoadLivePricerOptions {
	package?: string;
	arguments:
		| LoadLivePricerArguments
		| [
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
				bsSpot: RawTransactionArgument<string>,
				bsForward: RawTransactionArgument<string>,
				bsSvi: RawTransactionArgument<string>,
		  ];
}
/**
 * Load a PTB-local live pricing snapshot for this market.
 *
 * The returned `Pricer` is bound to `market.id()` and can be passed into live
 * mint, redeem, liquidation, and NAV functions in the same transaction.
 */
export function loadLivePricer(options: LoadLivePricerOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'market',
		'config',
		'propbookRegistry',
		'pyth',
		'bsSpot',
		'bsForward',
		'bsSvi',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'load_live_pricer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CurrentNavArguments {
	market: RawTransactionArgument<string>;
	pricer: RawTransactionArgument<string>;
}
export interface CurrentNavOptions {
	package?: string;
	arguments:
		| CurrentNavArguments
		| [market: RawTransactionArgument<string>, pricer: RawTransactionArgument<string>];
}
/**
 * Return this expiry market's exact live NAV: free cash minus the exact per-order
 * live liability, floored at zero. This is structurally the live primitive for a
 * market-bound `Pricer`; an empty or order-free live market returns free cash
 * (zero liability).
 *
 * A pure read with no backing assert: backing is owned by the payout-tree reserve
 * and proven on every trade, and the `max(0, ·)` cash floor marks a degenerate
 * (underwater) market at 0 — the correct per-market limited-recourse value, never
 * negative. `load_live_pricer` binds the propbook feeds to this market's current
 * Propbook registry mapping, rejects a past-expiry market, and gates oracle
 * freshness.
 *
 * A past-expiry market that has not settled cannot produce this pricer. There is
 * no solvency-safe NAV for an unsettled past-expiry market: the flush uses one
 * mark for both supply and withdraw, so the mark must equal the
 * settlement-dependent true value. Flows that branch on settlement call
 * `ensure_settled` first, using Propbook's exact Pyth timestamp at expiry; if no
 * exact spot exists yet, the live-pricing liveness abort remains the correct
 * failure mode.
 */
export function currentNav(options: CurrentNavOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
export interface MintPausedArguments {
	market: RawTransactionArgument<string>;
}
export interface MintPausedOptions {
	package?: string;
	arguments: MintPausedArguments | [market: RawTransactionArgument<string>];
}
/** Return whether minting is currently paused on this expiry market. */
export function mintPaused(options: MintPausedOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
export interface MintExactQuantityArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	leverage: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface MintExactQuantityOptions {
	package?: string;
	arguments:
		| MintExactQuantityArguments
		| [
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				pricer: RawTransactionArgument<string>,
				lowerTick: RawTransactionArgument<number | bigint>,
				higherTick: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				leverage: RawTransactionArgument<number | bigint>,
				maxCost: RawTransactionArgument<number | bigint>,
				maxProbability: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Mint an exact live position quantity against this expiry market.
 *
 * Requires the running package version to be at or above the protocol version
 * watermark, per-market mint pause to be off, trading globally enabled, a valid
 * account owner auth, a market-bound live `Pricer`, and enough expiry cash to back
 * the post-mint max payout and rebate reserve. Leverage is continuous (any
 * `L >= 1`); the derived static barrier `b = floor_shares/quantity` must sit below
 * the at-entry liquidation threshold so the order is not instantly knockable. Mint
 * fees are paid by routing a withdraw through the loaded account. The position's
 * strike range is the tick pair `(lower_tick, higher_tick]` (`lower_tick = 0` is
 * `-inf`, `higher_tick = pos_inf_tick` is `+inf`); the SDK converts raw strikes to
 * ticks. `max_cost` caps the all-in DUSDC withdrawal, while `max_probability` caps
 * the quoted per-contract probability before fees. Callers can pass
 * `std::u64::max_value!()` for either uncapped guard. Returns the minted order ID
 * for future order-scoped flows.
 */
export function mintExactQuantity(options: MintExactQuantityOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
		'u64',
		null,
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
		'leverage',
		'maxCost',
		'maxProbability',
		'root',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintExactAmountArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: RawTransactionArgument<string>;
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	amount: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	leverage: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface MintExactAmountOptions {
	package?: string;
	arguments:
		| MintExactAmountArguments
		| [
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				pricer: RawTransactionArgument<string>,
				lowerTick: RawTransactionArgument<number | bigint>,
				higherTick: RawTransactionArgument<number | bigint>,
				amount: RawTransactionArgument<number | bigint>,
				minQuantity: RawTransactionArgument<number | bigint>,
				leverage: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Mint the largest lot-rounded live position whose net premium fits inside
 * `amount`, aborting if the resulting quantity is below `min_quantity`.
 *
 * Fees, builder fees, and EWMA congestion penalties are charged on top of
 * `amount`. The sizing budget is first capped to the account's available DUSDC
 * after settlement; fees still require additional available DUSDC at payment time.
 * Any unspent premium dust remains in the account because order quantity must be
 * an integer number of `position_lot_size` lots.
 */
export function mintExactAmount(options: MintExactAmountOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
		null,
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
		'amount',
		'minQuantity',
		'leverage',
		'root',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'mint_exact_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemLiveArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RedeemLiveOptions {
	package?: string;
	arguments:
		| RedeemLiveArguments
		| [
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				pricer: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
				closeQuantity: RawTransactionArgument<number | bigint>,
				minProbability: RawTransactionArgument<number | bigint>,
				minProceeds: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Redeem a live order you hold account authority over.
 *
 * A live order is priced and closed (partial or full); a liquidated tombstone is
 * fully closed with zero payout. Settled orders must use `redeem_settled`. Returns
 * `(closed_order_id, replacement_order_id)`; a replacement is present only when a
 * live partial close leaves quantity open.
 *
 * Two close-side slippage floors, the mirror of mint's `max_probability` /
 * `max_cost` pair; pass `0` to disable either. `min_probability` floors the quoted
 * per-contract range probability (same units as mint's `max_probability`).
 * `min_proceeds` floors the all-in net DUSDC credited to the account
 * (`redeem_amount` minus trading fee, builder fee, and EWMA penalty), the mirror
 * of mint's all-in `max_cost`. Both only gate the live-priced path — a liquidated
 * tombstone closes at zero payout regardless, since its value is deterministic,
 * not market-quoted.
 */
export function redeemLive(options: RedeemLiveOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
		null,
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
		'root',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_live',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemSettledArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RedeemSettledOptions {
	package?: string;
	arguments:
		| RedeemSettledArguments
		| [
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
				closeQuantity: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Redeem a settled order you hold account authority over.
 *
 * The market must be settled already; this flow does not run live pricing or new
 * liquidation. Liquidated tombstones clear with zero payout. Requires a full
 * close. This owner-auth path remains available even when Predict app-auth
 * automation is deauthorized in the account registry.
 */
export function redeemSettled(options: RedeemSettledOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u256',
		'u64',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'wrapper',
		'auth',
		'config',
		'propbookRegistry',
		'pyth',
		'orderId',
		'closeQuantity',
		'root',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_settled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemSettledPermissionlessArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RedeemSettledPermissionlessOptions {
	package?: string;
	arguments:
		| RedeemSettledPermissionlessArguments
		| [
				market: RawTransactionArgument<string>,
				accountRegistry: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
				closeQuantity: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Permissionlessly redeem a settled order without account-owner authority.
 *
 * This keeper path uses Predict app-auth from the account registry, so
 * `deauthorize_app<PredictApp>` disables this automation. Owners can still use
 * `redeem_settled` with owner auth to redeem their own settled positions.
 */
export function redeemSettledPermissionless(options: RedeemSettledPermissionlessOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u256',
		'u64',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'market',
		'accountRegistry',
		'wrapper',
		'config',
		'propbookRegistry',
		'pyth',
		'orderId',
		'closeQuantity',
		'root',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'redeem_settled_permissionless',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LiquidateArguments {
	market: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: RawTransactionArgument<string>;
	budget: RawTransactionArgument<number | bigint>;
}
export interface LiquidateOptions {
	package?: string;
	arguments:
		| LiquidateArguments
		| [
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				pricer: RawTransactionArgument<string>,
				budget: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Run one bounded liquidation pass over active leveraged orders.
 *
 * The liquidation book selects up to `budget` candidates and returns the number of
 * orders liquidated. It does not touch accounts; users clear their liquidated
 * position later through `redeem_live` or `redeem_settled`, receiving no payout.
 */
export function liquidate(options: LiquidateOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'pricer', 'budget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'liquidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LiquidateOrderArguments {
	market: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	pricer: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface LiquidateOrderOptions {
	package?: string;
	arguments:
		| LiquidateOrderArguments
		| [
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				pricer: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
		  ];
}
/** Try to liquidate one active leveraged order by ID. */
export function liquidateOrder(options: LiquidateOrderOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'pricer', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'liquidate_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetReferenceTickArguments {
	market: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
}
export interface SetReferenceTickOptions {
	package?: string;
	arguments:
		| SetReferenceTickArguments
		| [
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
		  ];
}
/**
 * Set this expiry's reference fine-grid tick from the exact previous-window
 * Propbook Pyth observation. The source observation must be inserted into the feed
 * at `reference_tick_source_timestamp_ms` before this call, and the normalized
 * spot is floored to the market's `tick_size`.
 */
export function setReferenceTick(options: SetReferenceTickOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'propbookRegistry', 'pyth'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'set_reference_tick',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetMintPausedArguments {
	market: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	paused: RawTransactionArgument<boolean>;
}
export interface SetMintPausedOptions {
	package?: string;
	arguments:
		| SetMintPausedArguments
		| [
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				paused: RawTransactionArgument<boolean>,
		  ];
}
/**
 * Set whether new mints are paused on this expiry market. Admin-only and
 * version-gated. A `PauseCap` holder can force-engage the pause one-way under a
 * version freeze via `registry::pause_expiry_market_mint_pause_cap`.
 */
export function setMintPaused(options: SetMintPausedOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['market', 'config', 'AdminCap', 'paused'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'expiry_market',
			function: 'set_mint_paused',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
