/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Protocol-wide configuration and flow gates for Predict.
 *
 * This shared object owns the admin-tunable config structs, the fee-incentive
 * subsidy, live-target, and lifetime-cap rates, the delayed-execution policy, the
 * trading pause gate, the protocol-wide emergency freeze, the version watermark
 * (reaching `current_version!()` is also the delayed-execution cutover), the
 * allowlists of keepers that may redeem settled orders without owner auth and of
 * operators that may finish an LP flush, and the full-pool valuation in-flight
 * state (flag + flush ordinal, held across the transactions a flush spans;
 * keeper/config flows gate on it, trading flows read it only to discard stale
 * stamps lazily). Flow modules decide which gates apply before they mutate expiry,
 * oracle, pool, or account state.
 */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as pricing_config from './pricing_config.js';
import * as strike_exposure_config from './strike_exposure_config.js';
import * as ewma_config from './ewma_config.js';
const $moduleName = '@local-pkg/deepbook_predict::protocol_config';
export const ProtocolConfig = new MoveStruct({
	name: `${$moduleName}::ProtocolConfig`,
	fields: {
		id: bcs.Address,
		pricing_config: pricing_config.PricingConfig,
		/**
		 * Merged protocol + insurance reserve share of materialized terminal profit, in
		 * FLOAT_SCALING. The complement accrues to LPs.
		 */
		protocol_reserve_profit_share: U64,
		/**
		 * Portion of a referred mint's trader-paid trading fee and congestion surcharge
		 * routed to the referrer, in FLOAT_SCALING.
		 */
		referral_fee_rate: U64,
		/**
		 * Fee charged on an executed PLP supply fill, in FLOAT_SCALING, deducted from the
		 * USDC taken in before shares are priced. Ships at zero — a deposit dilutes the
		 * pool's risk per dollar rather than concentrating it, so it is not taxed; the
		 * knob exists to keep that reversible.
		 */
		plp_supply_fee_rate: U64,
		/**
		 * Fee charged on an executed PLP withdraw fill, in FLOAT_SCALING, withheld from
		 * the marked payout. Retained by the pool, so it accrues to the holders who stay.
		 * Both rates are read once per flush into the frozen mark, so every fill in one
		 * flush is charged the same pair.
		 */
		plp_withdraw_fee_rate: U64,
		/**
		 * Frozen-mark attempts a queued LP supply/withdraw request gets before the
		 * protocol cancels and refunds it. `1` (the default) is fill-or-kill; above that a
		 * missing request rests at the queue head and stops that queue for the flush, so
		 * this is an LP-queue liveness knob (RP-12).
		 */
		lp_request_limit_flush_attempts: U64,
		/**
		 * Ceiling on LP-attributable pool value that queued supplies may raise the pool
		 * to, enforced at the flush against the frozen mark. Defaults to 500,000 USDC
		 * (RP-23).
		 */
		max_lp_pool_value: U64,
		/**
		 * Hard staleness bound: `finish_flush` refuses to complete a flush in flight
		 * longer than this, so no LP request fills at a mark older than the window; past
		 * it the operator starts a fresh flush (which discards the stale one). A stalled
		 * flush blocks only LP queue fills and the flush-set markets' settlement — trading
		 * continues — so this also bounds LP-fill latency and is tuned alongside flush
		 * cadence (RP-29).
		 */
		max_valuation_window_ms: U64,
		/**
		 * Window before a market's expiry in which live quotes, mints, and live redeems
		 * abort. Read live at trade time rather than snapshotted per market, so it can be
		 * widened on markets already trading. `0` disables.
		 */
		no_trade_window_ms: U64,
		strike_exposure_template_config: strike_exposure_config.StrikeExposureConfig,
		ewma_config: ewma_config.EwmaConfig,
		/**
		 * Minimum package version permitted to run version-gated flows. Monotonic;
		 * `bump_version_watermark` advances it to the running `current_version!()`,
		 * retiring older versions. A running version below this floor is dead
		 * (`assert_version`). `current_version!()` stays the upgrade-required code
		 * constant; this is the runtime floor.
		 */
		version_watermark: U64,
		/** Blocks new risk creation while true. */
		trading_paused: bcs.bool(),
		/**
		 * Emergency hard stop. While true, `assert_version` aborts, halting every
		 * version-gated flow (mint, redeem, settlement, valuation, LP supply/withdraw,
		 * admin config) — the same blast radius as a version-disable, but reversible
		 * without a package upgrade. Force-on via `PauseCap`; cleared by `AdminCap`.
		 * Account-package custody withdrawals and builder-fee claims are ungated and stay
		 * available (already-earned funds).
		 */
		frozen: bcs.bool(),
		/**
		 * True for the whole duration of a full-pool valuation, across every transaction
		 * it spans. Keeper cash flows, market lifecycle, and config mutations gate on it;
		 * trading flows do NOT — they read it (with `flush_seq`) only to discard a stale
		 * valuation stamp lazily; a pending market's snapshot state is captured, never
		 * recorded per trade (see `plp`).
		 */
		valuation_in_progress: bcs.bool(),
		/**
		 * True ONLY while the atomic snapshot stage is open — set by `begin_snapshot` at
		 * `start_pool_valuation` and cleared by `end_snapshot` at
		 * `seal_valuation_snapshot`. Both live in one PTB (the `SnapshotStage` hot potato
		 * forces it), so this can never be observed across transactions: it blocks only a
		 * trade the keeper composes INTO its own snapshot PTB, where a mid-stamp cash move
		 * would skew the figures the seal freezes. The resumable valuation stage after the
		 * seal leaves it false, so trading stays live.
		 */
		snapshot_in_progress: bcs.bool(),
		/**
		 * Monotonic flush ordinal, bumped by `begin_valuation`. A market's valuation stamp
		 * names the flush that made it; a stamp whose ordinal is not the current one — or
		 * held while no valuation is in flight — is stale and is lazily discarded by the
		 * next trade, so aborting a flush never has to visit its stamped markets.
		 */
		flush_seq: U64,
	},
});
export const SettledRedeemKeepersKey = new MoveTuple({
	name: `${$moduleName}::SettledRedeemKeepersKey`,
	fields: [bcs.bool()],
});
export const FeeIncentiveSubsidyRateKey = new MoveTuple({
	name: `${$moduleName}::FeeIncentiveSubsidyRateKey`,
	fields: [bcs.bool()],
});
export const FeeIncentiveLiveTargetRateKey = new MoveTuple({
	name: `${$moduleName}::FeeIncentiveLiveTargetRateKey`,
	fields: [bcs.bool()],
});
export const FeeIncentiveLifetimeCapRateKey = new MoveTuple({
	name: `${$moduleName}::FeeIncentiveLifetimeCapRateKey`,
	fields: [bcs.bool()],
});
export const DelayedExecutionPolicyKey = new MoveTuple({
	name: `${$moduleName}::DelayedExecutionPolicyKey`,
	fields: [bcs.bool()],
});
export const FlushOperatorsKey = new MoveTuple({
	name: `${$moduleName}::FlushOperatorsKey`,
	fields: [bcs.bool()],
});
export interface IdArguments {
	config?: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments?: IdArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return the protocol config object ID for external discovery and PTB
 * construction.
 */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'id',
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
export interface TradingPausedArguments {
	config?: RawTransactionArgument<string>;
}
export interface TradingPausedOptions {
	package?: string;
	arguments?: TradingPausedArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the global trading-pause state for SDK and devInspect reads. */
export function tradingPaused(options: TradingPausedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'trading_paused',
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
export interface FrozenArguments {
	config?: RawTransactionArgument<string>;
}
export interface FrozenOptions {
	package?: string;
	arguments?: FrozenArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the global protocol-freeze state for SDK and devInspect reads. */
export function frozen(options: FrozenOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'frozen',
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
export interface ValuationInProgressArguments {
	config?: RawTransactionArgument<string>;
}
export interface ValuationInProgressOptions {
	package?: string;
	arguments?: ValuationInProgressArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return whether a full-pool valuation is in flight, for SDK and devInspect reads.
 * The flush spans transactions, so "in flight" is an observable state: a keeper
 * reads it to notice a flush it must finish or discard, and an integrator reads it
 * to explain a gated keeper/config transaction. Trading is not gated on it.
 */
export function valuationInProgress(options: ValuationInProgressOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'valuation_in_progress',
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
export interface ReferralFeeRateArguments {
	config?: RawTransactionArgument<string>;
}
export interface ReferralFeeRateOptions {
	package?: string;
	arguments?: ReferralFeeRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the live referral fee rate for SDK and devInspect reads. */
export function referralFeeRate(options: ReferralFeeRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'referral_fee_rate',
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
export interface FeeIncentiveSubsidyRateArguments {
	config?: RawTransactionArgument<string>;
}
export interface FeeIncentiveSubsidyRateOptions {
	package?: string;
	arguments?: FeeIncentiveSubsidyRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return the live fee-incentive subsidy rate: the fraction of each mint's trading
 * fee paid from the market's sponsor-funded fee-incentive balance, in
 * FLOAT_SCALING. `public` for SDK and devInspect reads: the quote already reports
 * the subsidy it applied, but a client needs the rate to explain it.
 */
export function feeIncentiveSubsidyRate(options: FeeIncentiveSubsidyRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'fee_incentive_subsidy_rate',
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
export interface FeeIncentiveLiveTargetRateArguments {
	config?: RawTransactionArgument<string>;
}
export interface FeeIncentiveLiveTargetRateOptions {
	package?: string;
	arguments?: FeeIncentiveLiveTargetRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return the live fee-incentive target rate: the share of an expiry's allocation
 * cap each live rebalance tops its sponsor-funded balance up to, in FLOAT_SCALING.
 * `public` for SDK and devInspect reads, so a client can tell how much a market
 * can hold before reading its balance.
 */
export function feeIncentiveLiveTargetRate(options: FeeIncentiveLiveTargetRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'fee_incentive_live_target_rate',
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
export interface FeeIncentiveLifetimeCapRateArguments {
	config?: RawTransactionArgument<string>;
}
export interface FeeIncentiveLifetimeCapRateOptions {
	package?: string;
	arguments?: FeeIncentiveLifetimeCapRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return the fee-incentive lifetime cap rate that newly created expiry markets
 * snapshot: the share of an expiry's allocation cap it may receive in
 * sponsor-funded incentives over its life, in FLOAT_SCALING. `public` for SDK and
 * devInspect reads.
 */
export function feeIncentiveLifetimeCapRate(options: FeeIncentiveLifetimeCapRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'fee_incentive_lifetime_cap_rate',
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
export interface NoTradeWindowMsArguments {
	config?: RawTransactionArgument<string>;
}
export interface NoTradeWindowMsOptions {
	package?: string;
	arguments?: NoTradeWindowMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Window before expiry in which live quotes, mints, and live redeems abort.
 * `public` for SDK and devInspect reads: a client that cannot see this value can
 * only learn the window closed by decoding `ETradeWindowClosed` from a failed
 * quote.
 */
export function noTradeWindowMs(options: NoTradeWindowMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'no_trade_window_ms',
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
export interface DelayedExecutionPolicyArguments {
	config?: RawTransactionArgument<string>;
}
export interface DelayedExecutionPolicyOptions {
	package?: string;
	arguments?: DelayedExecutionPolicyArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return the delayed-execution policy, or `none` before
 * `init_delayed_execution_policy` runs. For SDK and devInspect reads.
 */
export function delayedExecutionPolicy(options: DelayedExecutionPolicyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'delayed_execution_policy',
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
export interface IsFlushOperatorArguments {
	config?: RawTransactionArgument<string>;
	operator: RawTransactionArgument<string>;
}
export interface IsFlushOperatorOptions {
	package?: string;
	arguments: IsFlushOperatorArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Whether `operator` may call `plp::finish_flush`. For SDK, keeper, and devInspect
 * reads; `finish_flush` gates through `assert_flush_operator`.
 */
export function isFlushOperator(options: IsFlushOperatorOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['config', 'operator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'is_flush_operator',
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
export interface VersionWatermarkArguments {
	config?: RawTransactionArgument<string>;
}
export interface VersionWatermarkOptions {
	package?: string;
	arguments?: VersionWatermarkArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return the runtime version floor. For SDK, keeper, and devInspect reads: the
 * delayed-execution cutover is reached once it equals `current_version!()`.
 */
export function versionWatermark(options: VersionWatermarkOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'version_watermark',
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
export interface SetTemplateBaseFeeArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	fee: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateBaseFeeOptions {
	package?: string;
	arguments: SetTemplateBaseFeeArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the base fee multiplier snapshotted by newly created expiry markets. */
export function setTemplateBaseFee(options: SetTemplateBaseFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'fee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_base_fee',
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
export interface SetTemplateMinFeeArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	fee: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMinFeeOptions {
	package?: string;
	arguments: SetTemplateMinFeeArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the minimum fee floor snapshotted by newly created expiry markets. */
export function setTemplateMinFee(options: SetTemplateMinFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'fee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_min_fee',
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
export interface SetTemplateExpiryFeeWindowMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateExpiryFeeWindowMsOptions {
	package?: string;
	arguments: SetTemplateExpiryFeeWindowMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the expiry-fee ramp window snapshotted by newly created expiry markets. */
export function setTemplateExpiryFeeWindowMs(options: SetTemplateExpiryFeeWindowMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_expiry_fee_window_ms',
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
export interface SetTemplateExpiryFeeMaxMultiplierArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateExpiryFeeMaxMultiplierOptions {
	package?: string;
	arguments: SetTemplateExpiryFeeMaxMultiplierArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the expiry-fee max multiplier snapshotted by newly created expiry markets. */
export function setTemplateExpiryFeeMaxMultiplier(
	options: SetTemplateExpiryFeeMaxMultiplierOptions,
) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_expiry_fee_max_multiplier',
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
export interface SetTemplateBackingBufferLambdaArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateBackingBufferLambdaOptions {
	package?: string;
	arguments: SetTemplateBackingBufferLambdaArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the backing-buffer lambda snapshotted by newly created expiry markets. */
export function setTemplateBackingBufferLambda(options: SetTemplateBackingBufferLambdaOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_backing_buffer_lambda',
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
export interface SetTemplateInventoryImpactMaxRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateInventoryImpactMaxRateOptions {
	package?: string;
	arguments: SetTemplateInventoryImpactMaxRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the maximum marginal inventory-impact rate snapshotted by newly created
 * expiry markets. `0` (the default) disables both charges and rebates.
 */
export function setTemplateInventoryImpactMaxRate(
	options: SetTemplateInventoryImpactMaxRateOptions,
) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_inventory_impact_max_rate',
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
export interface SetTemplateMinEntryProbabilityArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMinEntryProbabilityOptions {
	package?: string;
	arguments: SetTemplateMinEntryProbabilityArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the minimum raw entry probability snapshotted by newly created expiry
 * markets.
 */
export function setTemplateMinEntryProbability(options: SetTemplateMinEntryProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_min_entry_probability',
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
export interface SetTemplateMaxEntryProbabilityArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMaxEntryProbabilityOptions {
	package?: string;
	arguments: SetTemplateMaxEntryProbabilityArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the maximum raw entry probability snapshotted by newly created expiry
 * markets.
 */
export function setTemplateMaxEntryProbability(options: SetTemplateMaxEntryProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_max_entry_probability',
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
export interface SetUsePythSpotForForwardArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	enabled: RawTransactionArgument<boolean>;
}
export interface SetUsePythSpotForForwardOptions {
	package?: string;
	arguments: SetUsePythSpotForForwardArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Select which source the live forward is built from: `true` carries the Block
 * Scholes basis on a fresh Pyth spot, `false` uses the Block Scholes forward
 * directly. Locked during valuation so one flush marks every market on one
 * formula. Clearing it also lifts the live-trade Pyth freshness requirement
 * (`pricing::assert_pyth_spot_fresh`), which is the way to keep mints and live
 * redeems open through a Pyth outage once no valuation is in flight.
 */
export function setUsePythSpotForForward(options: SetUsePythSpotForForwardOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'enabled'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_use_pyth_spot_for_forward',
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
export interface SetPythSpotFreshnessMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetPythSpotFreshnessMsOptions {
	package?: string;
	arguments: SetPythSpotFreshnessMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the live Pyth spot freshness threshold. While `use_pyth_spot_for_forward` is
 * set, a Pyth spot older than this makes valuation price off the Block Scholes
 * forward and makes every mint, mint quote, and live redeem abort
 * `pricing::EPythSpotStale`, so tightening it rejects more live trades and
 * widening it admits older Pyth spots. A window shorter than the time a Pyth
 * update takes to land halts live trading. Locked during valuation, like the
 * source selector.
 */
export function setPythSpotFreshnessMs(options: SetPythSpotFreshnessMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_pyth_spot_freshness_ms',
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
export interface SetBlockScholesPriceFreshnessMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetBlockScholesPriceFreshnessMsOptions {
	package?: string;
	arguments: SetBlockScholesPriceFreshnessMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the live Block Scholes spot/forward freshness threshold. */
export function setBlockScholesPriceFreshnessMs(options: SetBlockScholesPriceFreshnessMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_block_scholes_price_freshness_ms',
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
export interface SetBlockScholesSviFreshnessMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetBlockScholesSviFreshnessMsOptions {
	package?: string;
	arguments: SetBlockScholesSviFreshnessMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the live Block Scholes SVI freshness threshold. */
export function setBlockScholesSviFreshnessMs(options: SetBlockScholesSviFreshnessMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_block_scholes_svi_freshness_ms',
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
export interface SetLpRequestLimitFlushAttemptsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	attempts: RawTransactionArgument<number | bigint>;
}
export interface SetLpRequestLimitFlushAttemptsOptions {
	package?: string;
	arguments: SetLpRequestLimitFlushAttemptsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set how many frozen-mark attempts a queued LP request gets before it is
 * cancelled and refunded. `1` is fill-or-kill. Raising it lets a request rest at
 * the head across flushes, which stops that queue each time it misses — see RP-12
 * for the liveness cost that buys.
 */
export function setLpRequestLimitFlushAttempts(options: SetLpRequestLimitFlushAttemptsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'attempts'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_lp_request_limit_flush_attempts',
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
export interface SetMaxValuationWindowMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	windowMs: RawTransactionArgument<number | bigint>;
}
export interface SetMaxValuationWindowMsOptions {
	package?: string;
	arguments: SetMaxValuationWindowMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set how long a started full-pool valuation may stay in flight before anyone may
 * discard it. A stalled flush costs LP-fill latency (and settlement latency for
 * its own market set), not a trading pause, so this is an operator liveness knob:
 * too short and a legitimate long flush can be discarded from under the keeper,
 * too long and an abandoned one delays queued LP fills for that duration. See
 * RP-29.
 */
export function setMaxValuationWindowMs(options: SetMaxValuationWindowMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'windowMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_max_valuation_window_ms',
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
export interface SetMaxLpPoolValueArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	maxPoolValue: RawTransactionArgument<number | bigint>;
}
export interface SetMaxLpPoolValueOptions {
	package?: string;
	arguments: SetMaxLpPoolValueArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the ceiling on LP-attributable pool value that queued supplies may raise the
 * pool to. A supply that would carry the pool past it is filled up to the cap at
 * the flush and its remainder stays queued; withdrawals and already-issued PLP are
 * unaffected, so lowering this below current pool value closes the pool to new
 * capital rather than forcing anyone out.
 */
export function setMaxLpPoolValue(options: SetMaxLpPoolValueOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'maxPoolValue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_max_lp_pool_value',
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
export interface SetEwmaParamsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	alpha: RawTransactionArgument<number | bigint>;
	zScoreThreshold: RawTransactionArgument<number | bigint>;
	penaltyRate: RawTransactionArgument<number | bigint>;
}
export interface SetEwmaParamsOptions {
	package?: string;
	arguments: SetEwmaParamsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the EWMA gas-price penalty parameters. */
export function setEwmaParams(options: SetEwmaParamsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', 'u64', 'u64', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['config', 'AdminCap', 'alpha', 'zScoreThreshold', 'penaltyRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_ewma_params',
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
export interface SetEwmaEnabledArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	enabled: RawTransactionArgument<boolean>;
}
export interface SetEwmaEnabledOptions {
	package?: string;
	arguments: SetEwmaEnabledArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Enable or disable the EWMA gas-price penalty. */
export function setEwmaEnabled(options: SetEwmaEnabledOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'enabled'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_ewma_enabled',
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
export interface SetNoTradeWindowMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetNoTradeWindowMsOptions {
	package?: string;
	arguments: SetNoTradeWindowMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the window before expiry in which live quotes, mints, and live redeems
 * abort. `0` disables the block. Read live at trade time, so a change applies to
 * markets already trading and stays available as an incident control.
 *
 * Deliberately not gated on `assert_not_valuation_in_progress`, matching
 * `set_trading_paused`: a stalled flush must not be able to trap a safety control.
 * Nothing in the flush reads this value, so a mid-valuation change cannot skew a
 * frozen mark.
 */
export function setNoTradeWindowMs(options: SetNoTradeWindowMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_no_trade_window_ms',
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
export interface SetTradingPausedArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	paused: RawTransactionArgument<boolean>;
}
export interface SetTradingPausedOptions {
	package?: string;
	arguments: SetTradingPausedArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set whether trading is paused. */
export function setTradingPaused(options: SetTradingPausedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'paused'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_trading_paused',
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
export interface SetFrozenArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	frozen: RawTransactionArgument<boolean>;
}
export interface SetFrozenOptions {
	package?: string;
	arguments: SetFrozenArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the protocol-wide emergency freeze.
 *
 * Intentionally NOT version-gated, unlike every other admin setter: the freeze
 * gate lives inside `assert_version`, so routing this through it would make an
 * engaged freeze unclearable without a package upgrade — defeating the point.
 */
export function setFrozen(options: SetFrozenOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'frozen'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_frozen',
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
export interface AddSettledRedeemKeeperArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	keeper: RawTransactionArgument<string>;
}
export interface AddSettledRedeemKeeperOptions {
	package?: string;
	arguments: AddSettledRedeemKeeperArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Allow `keeper` to call `expiry_market::redeem_settled_permissionless`.
 * Admin-only and version-gated. Aborts if `keeper` is already allowed.
 */
export function addSettledRedeemKeeper(options: AddSettledRedeemKeeperOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'keeper'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'add_settled_redeem_keeper',
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
export interface RemoveSettledRedeemKeeperArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	keeper: RawTransactionArgument<string>;
}
export interface RemoveSettledRedeemKeeperOptions {
	package?: string;
	arguments: RemoveSettledRedeemKeeperArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Revoke `keeper`'s access to `expiry_market::redeem_settled_permissionless`.
 * Admin-only. Bypasses the version gate, like the registry's cap revocations, so
 * revocation stays available under the emergency freeze and from a package version
 * below the runtime floor. Aborts if `keeper` is not allowed.
 */
export function removeSettledRedeemKeeper(options: RemoveSettledRedeemKeeperOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'keeper'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'remove_settled_redeem_keeper',
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
export interface InitDelayedExecutionPolicyArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface InitDelayedExecutionPolicyOptions {
	package?: string;
	arguments: InitDelayedExecutionPolicyArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Write the delayed-execution policy with its compiled defaults. Admin-only and
 * version-gated; aborts if the policy already exists. Not gated on an open LP
 * valuation, so a stalled flush cannot block it. Until it runs, enqueue, commit,
 * and resolve abort `EPolicyNotInitialized`.
 */
export function initDelayedExecutionPolicy(options: InitDelayedExecutionPolicyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'init_delayed_execution_policy',
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
export interface SetDelayedExecutionTimingArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	delayMs: RawTransactionArgument<number | bigint>;
	stallTimeoutMs: RawTransactionArgument<number | bigint>;
	stuckThresholdMs: RawTransactionArgument<number | bigint>;
	gapWaitMs: RawTransactionArgument<number | bigint>;
	pythPriceBufferMs: RawTransactionArgument<number | bigint>;
	pythChannel: RawTransactionArgument<number>;
	sviMaxAgeMs: RawTransactionArgument<number | bigint>;
}
export interface SetDelayedExecutionTimingOptions {
	package?: string;
	arguments: SetDelayedExecutionTimingArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set every delayed-execution timing field and the Pyth channel in one call, so
 * the relational order
 * `pyth_price_buffer_ms < stuck_threshold_ms <=  gap_wait_ms < stall_timeout_ms`
 * is checked on the final state and an admin never passes through an invalid
 * intermediate one. Each value must also sit in its `config_constants` bound, the
 * channel must be a fixed-rate Lazer channel (`EUnsupportedPythChannel`), the
 * buffer must be `0` or exactly one tick of it, and the stuck threshold at least
 * one tick (`EInvalidDelayedExecutionTiming`).
 *
 * Waiting orders keep the τ, deadline, and channel stored at enqueue, so a new
 * delay, stall timeout, or channel only reaches new orders. Commit reads the
 * buffer and gap wait when it runs, so they also apply to waiting cohorts.
 * Admin-only and version-gated; not gated on an open LP valuation.
 */
export function setDelayedExecutionTiming(options: SetDelayedExecutionTimingOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u8',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'config',
		'AdminCap',
		'delayMs',
		'stallTimeoutMs',
		'stuckThresholdMs',
		'gapWaitMs',
		'pythPriceBufferMs',
		'pythChannel',
		'sviMaxAgeMs',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_delayed_execution_timing',
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
export interface SetDelayedExecutionLimitsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	mintCapacity: RawTransactionArgument<number | bigint>;
	sellCapacity: RawTransactionArgument<number | bigint>;
	perAccountCap: RawTransactionArgument<number | bigint>;
	minSellQuantity: RawTransactionArgument<number | bigint>;
	settleRefundBatch: RawTransactionArgument<number | bigint>;
	settlePayoutBatch: RawTransactionArgument<number | bigint>;
}
export interface SetDelayedExecutionLimitsOptions {
	package?: string;
	arguments: SetDelayedExecutionLimitsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the queue capacities, the per-account cap, the minimum early sell, and the
 * two `try_settle` batch sizes. Each value must sit in its `config_constants`
 * bound, and the per-account cap may not exceed the smaller capacity
 * (`EInvalidDelayedExecutionLimits`). Lowering a capacity below the current
 * pending count only blocks new orders. Admin-only and version-gated; not gated on
 * an open LP valuation.
 */
export function setDelayedExecutionLimits(options: SetDelayedExecutionLimitsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'config',
		'AdminCap',
		'mintCapacity',
		'sellCapacity',
		'perAccountCap',
		'minSellQuantity',
		'settleRefundBatch',
		'settlePayoutBatch',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_delayed_execution_limits',
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
export interface SetOrderFeeArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	orderFee: RawTransactionArgument<number | bigint>;
}
export interface SetOrderFeeOptions {
	package?: string;
	arguments: SetOrderFeeArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the flat fee charged per queued order, in USDC base units, up to the
 * `config_constants` cap of 1 USDC. Applies to orders placed after the call;
 * waiting orders keep the fee they paid. Admin-only and version-gated; not gated
 * on an open LP valuation.
 */
export function setOrderFee(options: SetOrderFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'orderFee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_order_fee',
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
export interface AddFlushOperatorArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	operator: RawTransactionArgument<string>;
}
export interface AddFlushOperatorOptions {
	package?: string;
	arguments: AddFlushOperatorArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Allow `operator` to call `plp::finish_flush`. Admin-only and version-gated;
 * aborts if `operator` is already allowed. Not gated on an open LP valuation, so
 * an admin can always add an operator to finish a stuck flush.
 */
export function addFlushOperator(options: AddFlushOperatorOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'address', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'operator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'add_flush_operator',
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
export interface RemoveFlushOperatorArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	operator: RawTransactionArgument<string>;
}
export interface RemoveFlushOperatorOptions {
	package?: string;
	arguments: RemoveFlushOperatorArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Revoke `operator`'s access to `plp::finish_flush`. Admin-only. Bypasses the
 * version gate, like `remove_settled_redeem_keeper`, so revocation stays available
 * under the emergency freeze and from a package version below the runtime floor.
 * Aborts if `operator` is not allowed.
 */
export function removeFlushOperator(options: RemoveFlushOperatorOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'address', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'operator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'remove_flush_operator',
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
export interface BumpVersionWatermarkArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface BumpVersionWatermarkOptions {
	package?: string;
	arguments: BumpVersionWatermarkArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Advance the version floor to this package's compiled-in `current_version!()`.
 *
 * The floor cannot be set above the executing package's version. This function is
 * ungated so an upgraded package can retire older versions; it aborts unless the
 * executing version is strictly greater than the existing floor.
 */
export function bumpVersionWatermark(options: BumpVersionWatermarkOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'bump_version_watermark',
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
export interface SetProtocolReserveProfitShareArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	protocolReserveProfitShare: RawTransactionArgument<number | bigint>;
}
export interface SetProtocolReserveProfitShareOptions {
	package?: string;
	arguments: SetProtocolReserveProfitShareArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the protocol reserve profit share used when materializing aggregate expiry
 * profit. Admin-gated; validated against its config-constants envelope.
 */
export function setProtocolReserveProfitShare(options: SetProtocolReserveProfitShareOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'protocolReserveProfitShare'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_protocol_reserve_profit_share',
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
export interface SetReferralFeeRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	rate: RawTransactionArgument<number | bigint>;
}
export interface SetReferralFeeRateOptions {
	package?: string;
	arguments: SetReferralFeeRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the portion of referred mint fees routed to the referrer. The new rate
 * applies to subsequent mints without changing their all-in account withdrawal.
 */
export function setReferralFeeRate(options: SetReferralFeeRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'rate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_referral_fee_rate',
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
export interface SetFeeIncentiveSubsidyRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	rate: RawTransactionArgument<number | bigint>;
}
export interface SetFeeIncentiveSubsidyRateOptions {
	package?: string;
	arguments: SetFeeIncentiveSubsidyRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the fraction of each mint's trading fee paid from the market's
 * sponsor-funded fee-incentive balance. Read live at mint time, so the new rate
 * applies to the next mint on every market, including markets already trading; `0`
 * stops incentives from being spent without moving them. The subsidy never changes
 * the trading fee charged, only how much of it the trader pays; on a referred mint
 * the referral is computed on the trader-paid part, so a higher rate also shrinks
 * the referral.
 *
 * Binds every mint only once the version watermark has retired package versions
 * older than 4: those compiled in a fixed 20% and never read this rate, so until
 * then a mint routed through one still draws 20% from the market's balance. A zero
 * rate does not stop `rebalance_expiry_cash` allocating the pool reserve into
 * markets; to wind incentives down, also withdraw the reserve
 * (`plp::withdraw_fee_incentives`), or, once the watermark has retired versions
 * older than 4, set the live target rate to zero, which keeps the reserve in the
 * pool.
 *
 * Not gated on the valuation flag, matching `set_referral_fee_rate`: nothing in
 * the flush reads this rate, and a mint that consumes a subsidy mid-flush lands
 * after the snapshot captured that market's cash, so it cannot reach the frozen
 * mark.
 */
export function setFeeIncentiveSubsidyRate(options: SetFeeIncentiveSubsidyRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'rate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_fee_incentive_subsidy_rate',
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
export interface SetFeeIncentiveLiveTargetRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	rate: RawTransactionArgument<number | bigint>;
}
export interface SetFeeIncentiveLiveTargetRateOptions {
	package?: string;
	arguments: SetFeeIncentiveLiveTargetRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the share of an expiry's allocation cap each live rebalance tops its
 * sponsor-funded fee-incentive balance up to. Read at every rebalance, so it
 * applies to markets already trading. Lowering it never claws back a balance
 * already allocated: a market above the new target receives nothing more until it
 * spends below it. `0` stops the pool reserve being allocated to markets, so it
 * stays in the pool and withdrawable. It may exceed a market's lifetime cap: the
 * cap still bounds what the market receives, so the target is not checked against
 * the lifetime cap rate.
 *
 * Binds every rebalance only once the version watermark has retired package
 * versions older than 4: `rebalance_expiry_cash` is permissionless, and those
 * versions top a market up to a fixed 2% whatever this is set to. Not gated on the
 * valuation flag: the flush never reads it, and the reserve and market incentive
 * balances it moves between are outside PLP NAV.
 */
export function setFeeIncentiveLiveTargetRate(options: SetFeeIncentiveLiveTargetRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'rate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_fee_incentive_live_target_rate',
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
export interface SetTemplateFeeIncentiveLifetimeCapRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	rate: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateFeeIncentiveLifetimeCapRateOptions {
	package?: string;
	arguments: SetTemplateFeeIncentiveLifetimeCapRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the share of an expiry's allocation cap it may receive in sponsor-funded fee
 * incentives over its life. Snapshotted into each expiry's pool accounting row
 * when the market is created, so markets already created keep the cap they were
 * created with, and `vault_events::FeeIncentiveLifetimeCapSnapshotted` reports
 * each market's cap.
 *
 * Binds market creation only once the version watermark has retired package
 * versions older than 4, which snapshot a fixed 10% whatever this is set to. Not
 * gated on the valuation flag, for the same reason as the live target rate.
 */
export function setTemplateFeeIncentiveLifetimeCapRate(
	options: SetTemplateFeeIncentiveLifetimeCapRateOptions,
) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'rate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_fee_incentive_lifetime_cap_rate',
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
export interface SetPlpSupplyFeeRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	rate: RawTransactionArgument<number | bigint>;
}
export interface SetPlpSupplyFeeRateOptions {
	package?: string;
	arguments: SetPlpSupplyFeeRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the fee charged on executed PLP supply fills. Admin-gated and validated
 * against its config-constants envelope. Locked during valuation so the rate a
 * flush froze into its mark cannot change midway through that flush.
 */
export function setPlpSupplyFeeRate(options: SetPlpSupplyFeeRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'rate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_plp_supply_fee_rate',
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
export interface SetPlpWithdrawFeeRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	rate: RawTransactionArgument<number | bigint>;
}
export interface SetPlpWithdrawFeeRateOptions {
	package?: string;
	arguments: SetPlpWithdrawFeeRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the fee charged on executed PLP withdraw fills. Same gating as the supply
 * leg; the two are independent so the exit charge can move without taxing entry.
 */
export function setPlpWithdrawFeeRate(options: SetPlpWithdrawFeeRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'rate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_plp_withdraw_fee_rate',
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
