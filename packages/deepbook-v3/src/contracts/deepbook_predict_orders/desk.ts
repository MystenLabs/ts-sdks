/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The order-flow companion's shared `OrderDesk`: the delayed-execution policy
 * every market queue runs under, and the companion's version floor.
 *
 * One desk per deployment: `init` creates and shares it when the package is
 * published, and nothing else builds one. Each market's `MarketQueue` sits at an
 * ID derived from the desk and the market (`queue::create_and_share`), so a single
 * desk gives each market exactly one queue, and with it one per-account cap, stuck
 * gate, policy, and version floor. The desk exists before Predict allowlists this
 * package's witness; until `protocol_config::set_order_flow` does, Predict's
 * admission, commit, and fill primitives refuse the companion.
 *
 * Predict's `AdminCap` administers the desk. Its setters check the desk floor and
 * refuse while Predict is frozen, through the public `protocol_config::frozen`;
 * the policy cannot move funds, and every Predict invariant holds inside Predict's
 * primitives whatever it says. Only queue creation takes the desk mutably, so
 * trading never serializes on it.
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
import * as delayed_execution_config from './delayed_execution_config.js';
const $moduleName = '@local-pkg/deepbook_predict_orders::desk';
export const OrderDesk = new MoveStruct({
	name: `${$moduleName}::OrderDesk`,
	fields: {
		id: bcs.Address,
		policy: delayed_execution_config.DelayedExecutionPolicy,
		/**
		 * Minimum companion version permitted to run. Monotonic; `bump_version_watermark`
		 * advances it to the running `current_version!()`, retiring older companion code.
		 */
		version_watermark: U64,
	},
});
export interface IdArguments {
	desk?: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments?: IdArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/** Return the desk object ID for external discovery and PTB construction. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['desk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'desk',
			function: 'id',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface PolicyArguments {
	desk?: RawTransactionArgument<string>;
}
export interface PolicyOptions {
	package?: string;
	arguments?: PolicyArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/** Return the policy, for SDK and devInspect reads. */
export function policy(options: PolicyOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['desk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'desk',
			function: 'policy',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface VersionWatermarkArguments {
	desk?: RawTransactionArgument<string>;
}
export interface VersionWatermarkOptions {
	package?: string;
	arguments?: VersionWatermarkArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/** Return the desk's version floor, for SDK and devInspect reads. */
export function versionWatermark(options: VersionWatermarkOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['desk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'desk',
			function: 'version_watermark',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetTimingArguments {
	desk?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	delayMs: RawTransactionArgument<number | bigint>;
	stallTimeoutMs: RawTransactionArgument<number | bigint>;
	stuckThresholdMs: RawTransactionArgument<number | bigint>;
	gapWaitMs: RawTransactionArgument<number | bigint>;
	pythPriceBufferMs: RawTransactionArgument<number | bigint>;
	pythChannel: RawTransactionArgument<number>;
	sviMaxAgeMs: RawTransactionArgument<number | bigint>;
}
export interface SetTimingOptions {
	package?: string;
	arguments: SetTimingArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Set every timing field and the Pyth channel in one call, so the relational rules
 * hold on the final state (`delayed_execution_config::set_timing`). Waiting orders
 * keep the τ, deadline, and channel they were placed with, so a new delay, stall
 * timeout, or channel reaches only new orders. Commit reads the buffer and gap
 * wait when it runs, so those also apply to waiting cohorts.
 */
export function setTiming(options: SetTimingOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
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
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'desk',
		'AdminCap',
		'config',
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
			module: 'desk',
			function: 'set_timing',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetLimitsArguments {
	desk?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	mintCapacity: RawTransactionArgument<number | bigint>;
	sellCapacity: RawTransactionArgument<number | bigint>;
	perAccountCap: RawTransactionArgument<number | bigint>;
	minSellQuantity: RawTransactionArgument<number | bigint>;
	settleRefundBatch: RawTransactionArgument<number | bigint>;
	settlePayoutBatch: RawTransactionArgument<number | bigint>;
}
export interface SetLimitsOptions {
	package?: string;
	arguments: SetLimitsArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Set the queue capacities, the per-account cap, the minimum early sell, and the
 * two `settle_step` batch sizes. Lowering a capacity below the current pending
 * count only blocks new orders.
 */
export function setLimits(options: SetLimitsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
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
		'desk',
		'AdminCap',
		'config',
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
			module: 'desk',
			function: 'set_limits',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetOrderFeeArguments {
	desk?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	orderFee: RawTransactionArgument<number | bigint>;
}
export interface SetOrderFeeOptions {
	package?: string;
	arguments: SetOrderFeeArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Set the flat fee charged per queued order, in USDC base units. Applies to orders
 * placed after the call; waiting orders keep the fee they paid.
 */
export function setOrderFee(options: SetOrderFeeOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['desk', 'AdminCap', 'config', 'orderFee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'desk',
			function: 'set_order_fee',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface BumpVersionWatermarkArguments {
	desk?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface BumpVersionWatermarkOptions {
	package?: string;
	arguments: BumpVersionWatermarkArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Advance the desk floor to this package's compiled `current_version!()`, retiring
 * older companion code. Aborts unless the executing version is above the floor.
 */
export function bumpVersionWatermark(options: BumpVersionWatermarkOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['desk', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'desk',
			function: 'bump_version_watermark',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
