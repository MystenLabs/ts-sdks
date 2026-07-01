/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Protocol-wide configuration and flow gates for Predict.
 *
 * This shared object owns the admin-tunable config structs, the trading pause
 * gate, and the transaction-local full-pool valuation lock. Flow modules decide
 * which gates apply before they mutate expiry, oracle, pool, or account state.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
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
		protocol_reserve_profit_share: bcs.u64(),
		/** Total liquidation candidates checked before mint and redeem flows. */
		trade_liquidation_budget: bcs.u64(),
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
		version_watermark: bcs.u64(),
		/** Blocks new risk creation while true. */
		trading_paused: bcs.bool(),
		/**
		 * Transaction-local lock held while a full-pool valuation is assembled, so no
		 * NAV-changing op can interleave between per-market value steps in the PTB.
		 */
		valuation_in_progress: bcs.bool(),
	},
});
export interface IdArguments {
	config: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [config: RawTransactionArgument<string>];
}
/** Return the protocol config object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TradingPausedArguments {
	config: RawTransactionArgument<string>;
}
export interface TradingPausedOptions {
	package?: string;
	arguments: TradingPausedArguments | [config: RawTransactionArgument<string>];
}
/** Return whether trading is currently paused. */
export function tradingPaused(options: TradingPausedOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'trading_paused',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateBaseFeeArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	fee: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateBaseFeeOptions {
	package?: string;
	arguments:
		| SetTemplateBaseFeeArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				fee: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the base fee multiplier snapshotted by future expiry markets. */
export function setTemplateBaseFee(options: SetTemplateBaseFeeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'fee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_base_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateMinFeeArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	fee: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMinFeeOptions {
	package?: string;
	arguments:
		| SetTemplateMinFeeArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				fee: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the minimum fee floor snapshotted by future expiry markets. */
export function setTemplateMinFee(options: SetTemplateMinFeeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'fee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_min_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateExpiryFeeWindowMsArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateExpiryFeeWindowMsOptions {
	package?: string;
	arguments:
		| SetTemplateExpiryFeeWindowMsArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the expiry-fee ramp window snapshotted by future expiry markets. */
export function setTemplateExpiryFeeWindowMs(options: SetTemplateExpiryFeeWindowMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_expiry_fee_window_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateExpiryFeeMaxMultiplierArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateExpiryFeeMaxMultiplierOptions {
	package?: string;
	arguments:
		| SetTemplateExpiryFeeMaxMultiplierArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the expiry-fee max multiplier snapshotted by future expiry markets. */
export function setTemplateExpiryFeeMaxMultiplier(
	options: SetTemplateExpiryFeeMaxMultiplierOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_expiry_fee_max_multiplier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateLiquidationLtvArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateLiquidationLtvOptions {
	package?: string;
	arguments:
		| SetTemplateLiquidationLtvArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the liquidation LTV snapshotted by future expiry markets. */
export function setTemplateLiquidationLtv(options: SetTemplateLiquidationLtvOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_liquidation_ltv',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateMaxAdmissionLeverageArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMaxAdmissionLeverageOptions {
	package?: string;
	arguments:
		| SetTemplateMaxAdmissionLeverageArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the max admission leverage snapshotted by future expiry markets. */
export function setTemplateMaxAdmissionLeverage(options: SetTemplateMaxAdmissionLeverageOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_max_admission_leverage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateBackingBufferLambdaArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateBackingBufferLambdaOptions {
	package?: string;
	arguments:
		| SetTemplateBackingBufferLambdaArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the backing-buffer lambda snapshotted by future expiry markets. */
export function setTemplateBackingBufferLambda(options: SetTemplateBackingBufferLambdaOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_backing_buffer_lambda',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetBenefitPowersArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	lower: RawTransactionArgument<number | bigint>;
	upper: RawTransactionArgument<number | bigint>;
}
export interface SetBenefitPowersOptions {
	package?: string;
	arguments:
		| SetBenefitPowersArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				lower: RawTransactionArgument<number | bigint>,
				upper: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Set the staking benefit thresholds: `lower` (half of max benefits) and `upper`
 * (full benefits). Validated as a pair (`upper > 2 * lower`).
 */
export function setBenefitPowers(options: SetBenefitPowersOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'lower', 'upper'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_benefit_powers',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateMinEntryProbabilityArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMinEntryProbabilityOptions {
	package?: string;
	arguments:
		| SetTemplateMinEntryProbabilityArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the minimum raw entry probability snapshotted by future expiry markets. */
export function setTemplateMinEntryProbability(options: SetTemplateMinEntryProbabilityOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_min_entry_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateMaxEntryProbabilityArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateMaxEntryProbabilityOptions {
	package?: string;
	arguments:
		| SetTemplateMaxEntryProbabilityArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the maximum raw entry probability snapshotted by future expiry markets. */
export function setTemplateMaxEntryProbability(options: SetTemplateMaxEntryProbabilityOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_max_entry_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetPythSpotFreshnessMsArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetPythSpotFreshnessMsOptions {
	package?: string;
	arguments:
		| SetPythSpotFreshnessMsArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the live Pyth spot freshness threshold. */
export function setPythSpotFreshnessMs(options: SetPythSpotFreshnessMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_pyth_spot_freshness_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetBlockScholesPriceFreshnessMsArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetBlockScholesPriceFreshnessMsOptions {
	package?: string;
	arguments:
		| SetBlockScholesPriceFreshnessMsArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the live Block Scholes spot/forward freshness threshold. */
export function setBlockScholesPriceFreshnessMs(options: SetBlockScholesPriceFreshnessMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_block_scholes_price_freshness_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetBlockScholesSviFreshnessMsArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetBlockScholesSviFreshnessMsOptions {
	package?: string;
	arguments:
		| SetBlockScholesSviFreshnessMsArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the live Block Scholes SVI freshness threshold. */
export function setBlockScholesSviFreshnessMs(options: SetBlockScholesSviFreshnessMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_block_scholes_svi_freshness_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTemplateTradingLossRebateRateArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateTradingLossRebateRateOptions {
	package?: string;
	arguments:
		| SetTemplateTradingLossRebateRateArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				value: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the trading loss rebate rate template used by future expiry markets. */
export function setTemplateTradingLossRebateRate(options: SetTemplateTradingLossRebateRateOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_template_trading_loss_rebate_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTradeLiquidationBudgetArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	budget: RawTransactionArgument<number | bigint>;
}
export interface SetTradeLiquidationBudgetOptions {
	package?: string;
	arguments:
		| SetTradeLiquidationBudgetArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				budget: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the total liquidation candidate budget used before mint and redeem flows. */
export function setTradeLiquidationBudget(options: SetTradeLiquidationBudgetOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'budget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_trade_liquidation_budget',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetEwmaParamsArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	alpha: RawTransactionArgument<number | bigint>;
	zScoreThreshold: RawTransactionArgument<number | bigint>;
	penaltyRate: RawTransactionArgument<number | bigint>;
}
export interface SetEwmaParamsOptions {
	package?: string;
	arguments:
		| SetEwmaParamsArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				alpha: RawTransactionArgument<number | bigint>,
				zScoreThreshold: RawTransactionArgument<number | bigint>,
				penaltyRate: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the EWMA gas-price penalty parameters. */
export function setEwmaParams(options: SetEwmaParamsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'alpha', 'zScoreThreshold', 'penaltyRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_ewma_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetEwmaEnabledArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	enabled: RawTransactionArgument<boolean>;
}
export interface SetEwmaEnabledOptions {
	package?: string;
	arguments:
		| SetEwmaEnabledArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				enabled: RawTransactionArgument<boolean>,
		  ];
}
/** Enable or disable the EWMA gas-price penalty. */
export function setEwmaEnabled(options: SetEwmaEnabledOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'enabled'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_ewma_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTradingPausedArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	paused: RawTransactionArgument<boolean>;
}
export interface SetTradingPausedOptions {
	package?: string;
	arguments:
		| SetTradingPausedArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				paused: RawTransactionArgument<boolean>,
		  ];
}
/** Set whether trading is paused. */
export function setTradingPaused(options: SetTradingPausedOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'paused'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_trading_paused',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BumpVersionWatermarkArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface BumpVersionWatermarkOptions {
	package?: string;
	arguments:
		| BumpVersionWatermarkArguments
		| [config: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
}
/**
 * Advance the version watermark to this package's compiled-in
 * `current_version!()`, retiring every older version (a running version below the
 * floor is dead — see `assert_version`).
 *
 * Takes no target: the floor can only ever move to a version a published binary
 * actually embeds, so admin can never set it above the running package and brick
 * it. Raising the floor therefore requires executing this against the upgraded
 * package, where `current_version!()` is higher. Aborts if the running version
 * does not exceed the current watermark (nothing to retire). Ungated so it stays
 * callable across an upgrade.
 */
export function bumpVersionWatermark(options: BumpVersionWatermarkOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'bump_version_watermark',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetProtocolReserveProfitShareArguments {
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	protocolReserveProfitShare: RawTransactionArgument<number | bigint>;
}
export interface SetProtocolReserveProfitShareOptions {
	package?: string;
	arguments:
		| SetProtocolReserveProfitShareArguments
		| [
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				protocolReserveProfitShare: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Set the protocol reserve profit share used when materializing aggregate expiry
 * profit. Admin-gated; validated against its config-constants envelope.
 */
export function setProtocolReserveProfitShare(options: SetProtocolReserveProfitShareOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'protocolReserveProfitShare'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'protocol_config',
			function: 'set_protocol_reserve_profit_share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
