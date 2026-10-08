/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Admin-tunable policy for delayed execution: the timing, capacity, fee, and
 * settlement-batch settings that queued mints and early sells run under.
 *
 * A leaf module, so `config_events` can embed the policy and `protocol_config` can
 * store it under its own UID without an import cycle. It owns the struct, its
 * defaults, the field getters, the package setters with their single-value bounds,
 * and the Pyth Lazer channel helpers. Relational checks between fields live in the
 * `protocol_config` setters, which see every field at once.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { U64 } from '../../bcs/integers.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::delayed_execution_config';
export const DelayedExecutionPolicy = new MoveStruct({
	name: `${$moduleName}::DelayedExecutionPolicy`,
	fields: {
		/**
		 * Latest τ may fall after placement. τ rounds down to the policy channel's tick at
		 * or before `t₀ + delay_ms`.
		 */
		delay_ms: U64,
		/**
		 * Sets each order's deadline:
		 * `max(min(τ + stall_timeout_ms, expiry), last  deadline)`. At or past it the
		 * order is refunded, never filled.
		 */
		stall_timeout_ms: U64,
		/**
		 * Enqueue refuses new orders while an uncommitted cohort is this far past its τ
		 * with nothing newer committed, or while two or more uncommitted cohorts are each
		 * this far past their τ.
		 */
		stuck_threshold_ms: U64,
		/** Commit accepts a backup tick for a cohort only once now is this far past its τ. */
		gap_wait_ms: U64,
		/**
		 * Switches the backup tick on or off. `0` accepts only the update stamped exactly
		 * τ. Above `0`, once now is `gap_wait_ms` past τ, a cohort also accepts its single
		 * backup: the update stamped one tick of its own stored channel after τ. The value
		 * is not a window. The setter keeps it at `0` or one tick of the policy channel.
		 */
		pyth_price_buffer_ms: U64,
		/**
		 * Pyth Lazer channel new orders are priced on: `2` (`fixed_rate@50ms`) or `3`
		 * (`fixed_rate@200ms`). Its tick period is τ's grid. Each order stores the channel
		 * it was placed under.
		 */
		pyth_channel: bcs.u8(),
		/** Oldest Block Scholes SVI an enqueue accepts into an order's volatility snapshot. */
		svi_max_age_ms: U64,
		/** Most unfinished queued mints per market. */
		mint_capacity: U64,
		/** Most unfinished queued sells per market. */
		sell_capacity: U64,
		/** Most unfinished queued orders per account per market. */
		per_account_cap: U64,
		/**
		 * Flat fee charged at enqueue. Kept on a fill and on limit or admission refunds;
		 * returned on every other refund.
		 */
		order_fee: U64,
		/** Smallest early-sell close quantity. */
		min_sell_quantity: U64,
		/** Most records one `try_settle` call visits while refunding leftover orders. */
		settle_refund_batch: U64,
		/** Most records one `try_settle` call visits while paying Open records. */
		settle_payout_batch: U64,
	},
});
export interface DelayMsArguments {
	policy: TransactionArgument;
}
export interface DelayMsOptions {
	package?: string;
	arguments: DelayMsArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function delayMs(options: DelayMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'delay_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StallTimeoutMsArguments {
	policy: TransactionArgument;
}
export interface StallTimeoutMsOptions {
	package?: string;
	arguments: StallTimeoutMsArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function stallTimeoutMs(options: StallTimeoutMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'stall_timeout_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StuckThresholdMsArguments {
	policy: TransactionArgument;
}
export interface StuckThresholdMsOptions {
	package?: string;
	arguments: StuckThresholdMsArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function stuckThresholdMs(options: StuckThresholdMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'stuck_threshold_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GapWaitMsArguments {
	policy: TransactionArgument;
}
export interface GapWaitMsOptions {
	package?: string;
	arguments: GapWaitMsArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function gapWaitMs(options: GapWaitMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'gap_wait_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PythPriceBufferMsArguments {
	policy: TransactionArgument;
}
export interface PythPriceBufferMsOptions {
	package?: string;
	arguments: PythPriceBufferMsArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function pythPriceBufferMs(options: PythPriceBufferMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'pyth_price_buffer_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PythChannelArguments {
	policy: TransactionArgument;
}
export interface PythChannelOptions {
	package?: string;
	arguments: PythChannelArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function pythChannel(options: PythChannelOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'pyth_channel',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviMaxAgeMsArguments {
	policy: TransactionArgument;
}
export interface SviMaxAgeMsOptions {
	package?: string;
	arguments: SviMaxAgeMsArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sviMaxAgeMs(options: SviMaxAgeMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'svi_max_age_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintCapacityArguments {
	policy: TransactionArgument;
}
export interface MintCapacityOptions {
	package?: string;
	arguments: MintCapacityArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function mintCapacity(options: MintCapacityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'mint_capacity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SellCapacityArguments {
	policy: TransactionArgument;
}
export interface SellCapacityOptions {
	package?: string;
	arguments: SellCapacityArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function sellCapacity(options: SellCapacityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'sell_capacity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PerAccountCapArguments {
	policy: TransactionArgument;
}
export interface PerAccountCapOptions {
	package?: string;
	arguments: PerAccountCapArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function perAccountCap(options: PerAccountCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'per_account_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderFeeArguments {
	policy: TransactionArgument;
}
export interface OrderFeeOptions {
	package?: string;
	arguments: OrderFeeArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function orderFee(options: OrderFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'order_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinSellQuantityArguments {
	policy: TransactionArgument;
}
export interface MinSellQuantityOptions {
	package?: string;
	arguments: MinSellQuantityArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function minSellQuantity(options: MinSellQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'min_sell_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SettleRefundBatchArguments {
	policy: TransactionArgument;
}
export interface SettleRefundBatchOptions {
	package?: string;
	arguments: SettleRefundBatchArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function settleRefundBatch(options: SettleRefundBatchOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'settle_refund_batch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SettlePayoutBatchArguments {
	policy: TransactionArgument;
}
export interface SettlePayoutBatchOptions {
	package?: string;
	arguments: SettlePayoutBatchArguments | [policy: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function settlePayoutBatch(options: SettlePayoutBatchOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'delayed_execution_config',
			function: 'settle_payout_batch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
