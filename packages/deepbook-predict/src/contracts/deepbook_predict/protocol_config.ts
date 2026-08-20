/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Protocol-wide configuration and flow gates for Predict.
 *
 * This shared object owns the admin-tunable config structs, the trading pause
 * gate, the protocol-wide emergency freeze, and the transaction-local full-pool
 * valuation lock. Flow modules decide which gates apply before they mutate expiry,
 * oracle, pool, or account state.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as pricing_config from './pricing_config.js';
import * as expiry_cash_config from './expiry_cash_config.js';
import * as strike_exposure_config from './strike_exposure_config.js';
import * as stake_config from './stake_config.js';
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
		 * Fee charged on an executed PLP supply fill, in FLOAT_SCALING, deducted from the
		 * DUSDC taken in before shares are priced. Ships at zero — a deposit dilutes the
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
		/** Total liquidation candidates checked before mint and redeem flows. */
		trade_liquidation_budget: U64,
		/**
		 * Frozen-mark attempts a queued LP supply/withdraw request gets before the
		 * protocol cancels and refunds it. `1` (the default) is fill-or-kill; above that a
		 * missing request rests at the queue head and stops that queue for the flush, so
		 * this is an LP-queue liveness knob (RP-12).
		 */
		lp_request_limit_flush_attempts: U64,
		/**
		 * Ceiling on LP-attributable pool value that queued supplies may raise the pool
		 * to, enforced at the flush against the frozen mark. Defaults to `u64::MAX`, so
		 * the pool is uncapped until an operator sets a figure (RP-23).
		 */
		max_lp_pool_value: U64,
		expiry_cash_template_config: expiry_cash_config.ExpiryCashConfig,
		strike_exposure_template_config: strike_exposure_config.StrikeExposureConfig,
		stake_config: stake_config.StakeConfig,
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
		 * Transaction-local lock held while a full-pool valuation is assembled, so no
		 * NAV-changing op can interleave between per-market value steps in the PTB.
		 */
		valuation_in_progress: bcs.bool(),
	},
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
export interface SetTemplateNoLeverageWindowMsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	windowMs: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateNoLeverageWindowMsOptions {
	package?: string;
	arguments: SetTemplateNoLeverageWindowMsArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the near-expiry no-leverage window snapshotted by newly created expiry
 * markets.
 */
export function setTemplateNoLeverageWindowMs(options: SetTemplateNoLeverageWindowMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'windowMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_no_leverage_window_ms',
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
export interface SetTemplateLiquidationLtvArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateLiquidationLtvOptions {
	package?: string;
	arguments: SetTemplateLiquidationLtvArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the liquidation LTV snapshotted by newly created expiry markets. */
export function setTemplateLiquidationLtv(options: SetTemplateLiquidationLtvOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_liquidation_ltv',
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
export interface SetTemplateMaxAdmissionLeverageArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMaxAdmissionLeverageOptions {
	package?: string;
	arguments: SetTemplateMaxAdmissionLeverageArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the max admission leverage snapshotted by newly created expiry markets. */
export function setTemplateMaxAdmissionLeverage(options: SetTemplateMaxAdmissionLeverageOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_max_admission_leverage',
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
export interface SetTemplateMaxBenefitRatioArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMaxBenefitRatioOptions {
	package?: string;
	arguments: SetTemplateMaxBenefitRatioArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set how much of the DEEP-stake benefit programme newly created expiry markets
 * run, from `0` (nothing) to `float_scaling` (full strength). Ships at 0, so
 * markets charge undiscounted fees and pay no stake-scaled loss rebate until this
 * is raised. Existing markets keep the value they snapshotted.
 */
export function setTemplateMaxBenefitRatio(options: SetTemplateMaxBenefitRatioOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_max_benefit_ratio',
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
export interface SetTemplateBenefitPowersArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	lower: RawTransactionArgument<number | bigint>;
	upper: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateBenefitPowersOptions {
	package?: string;
	arguments: SetTemplateBenefitPowersArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set the staking benefit thresholds snapshotted by newly created expiry markets:
 * `lower` (half of max benefits) and `upper` (full benefits). Validated as a pair
 * (`upper > 2 * lower`). Existing markets keep the curve they snapshotted.
 */
export function setTemplateBenefitPowers(options: SetTemplateBenefitPowersOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'lower', 'upper'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_benefit_powers',
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
 * formula.
 */
export function setUsePythSpotForForward(options: SetUsePythSpotForForwardOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
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
/** Set the live Pyth spot freshness threshold. */
export function setPythSpotFreshnessMs(options: SetPythSpotFreshnessMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
export interface SetTemplateTradingLossRebateRateArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateTradingLossRebateRateOptions {
	package?: string;
	arguments: SetTemplateTradingLossRebateRateArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the trading loss rebate rate snapshotted by newly created expiry markets. */
export function setTemplateTradingLossRebateRate(options: SetTemplateTradingLossRebateRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_trading_loss_rebate_rate',
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
export interface SetTradeLiquidationBudgetArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	budget: RawTransactionArgument<number | bigint>;
}
export interface SetTradeLiquidationBudgetOptions {
	package?: string;
	arguments: SetTradeLiquidationBudgetArguments;
	config?: {
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Set the total liquidation candidate budget used before mint and redeem flows. */
export function setTradeLiquidationBudget(options: SetTradeLiquidationBudgetOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'budget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_trade_liquidation_budget',
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
	const argumentsTypes = [null, null, 'u64', 'u64', 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
