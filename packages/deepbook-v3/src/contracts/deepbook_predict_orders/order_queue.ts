/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * One market's queue of delayed-execution orders: queued mints and early sells
 * that fill at Pyth's signed price for their τ, or are refunded.
 *
 * This module owns the `OrderBook` a `MarketQueue` holds and its records
 * (`QueuedOrder` and its parts): the status, kind, and refund-reason codes, τ and
 * deadline planning, the stuck check, the counters and cohort spans, and the
 * walker primitives. A record holds Predict's `OrderReceipt` for its order and
 * that order's own escrow `Balance<USDC>` in one table row, so a refund pays
 * exactly that record's escrow and a record that still holds a receipt cannot be
 * deleted. Predict owns the payout-tree pins and the waiting cash need. The
 * `queue` module owns the flow gates, every Predict call, and every queue event.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { U64, U256 } from '../../bcs/integers.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
import * as expiry_market from './deps/deepbook_predict/expiry_market.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/deepbook_predict_orders::order_queue';
export const CohortSpan = new MoveStruct({
	name: `${$moduleName}::CohortSpan`,
	fields: {
		tau_ms: U64,
		deadline_ms: U64,
		/**
		 * Lower bound on the cohort's first unfinished record. A walker that stops inside
		 * the span moves it to the first record it did not visit.
		 */
		first_id: U64,
		/** Exclusive. */
		end_id: U64,
		pyth_channel: bcs.u8(),
		/** Set once commit attaches the cohort's price. A committed span never grows. */
		committed: bcs.bool(),
		/** Pending, Committed, and RefundDue orders left in the cohort. */
		unfinished: U64,
	},
});
export const OrderBook = new MoveStruct({
	name: `${$moduleName}::OrderBook`,
	fields: {
		/**
		 * One record per order, keyed by a sequential record ID. Records stay after they
		 * finish until `cleanup` deletes them.
		 */
		orders: table.Table,
		next_id: U64,
		/**
		 * Lower bound on the first unfinished record: the first span's `first_id`, or
		 * `next_id` when no span remains.
		 */
		resolve_head: U64,
		/**
		 * Where the next settlement payout call resumes. Only moves forward, and never
		 * past `next_id`.
		 */
		payout_cursor: U64,
		/**
		 * One span per cohort (orders sharing one τ) that still has an unfinished order,
		 * in τ order. Inline, so a walk loads no extra object to find them.
		 */
		cohorts: bcs.vector(CohortSpan),
		/** Keep τ and the deadline non-decreasing along record IDs. */
		last_tau_ms: U64,
		/**
		 * Newest τ any commit has priced. Never decreases; no new order gets a τ at or
		 * below it.
		 */
		last_committed_tau_ms: U64,
		last_deadline_ms: U64,
		/**
		 * The newest order's Pyth channel. A channel change forces the next τ strictly
		 * past `last_tau_ms`, so one cohort never mixes channels.
		 */
		last_channel: bcs.u8(),
		/**
		 * Unfinished orders per account. A row is created by the account's first placement
		 * in this market and never deleted.
		 */
		per_account: table.Table,
		/** Unfinished mints and sells, against the policy capacities. */
		pending_mints: U64,
		pending_sells: U64,
	},
});
export const OrderRequest = new MoveStruct({
	name: `${$moduleName}::OrderRequest`,
	fields: {
		lower_tick: U64,
		higher_tick: U64,
		quantity: U64,
		max_premium: U64,
		min_quantity: U64,
		max_cost: U64,
		max_probability: U64,
		min_probability: U64,
		min_proceeds: U64,
	},
});
export const OrderTiming = new MoveStruct({
	name: `${$moduleName}::OrderTiming`,
	fields: {
		/** t₀, the Sui clock of the placement transaction. */
		placed_at_ms: U64,
		/** τ itself: a price generated before it never commits the order. */
		earliest_price_ms: U64,
		/** The channel tick the order is priced on. */
		tau_ms: U64,
		/** At or past it the order is refunded, never filled. */
		deadline_ms: U64,
		/**
		 * `expiry - max(no_trade_window_ms, stall_timeout_ms + 5_000)`; placement requires
		 * τ below it.
		 */
		cutoff_ms: U64,
		/** The policy channel at placement. Commit accepts only updates on it. */
		pyth_channel: bcs.u8(),
	},
});
export const OrderEscrow = new MoveStruct({
	name: `${$moduleName}::OrderEscrow`,
	fields: {
		/**
		 * USDC locked for the premium and fees, and the fill's all-in cost cap. Sells lock
		 * none.
		 */
		budget: U64,
		/** Flat fee charged at placement. */
		order_fee: U64,
		/**
		 * The admission dry run's pre-subsidy trading fee, capped at the budget. Bounds
		 * the subsidy commit reserves.
		 */
		subsidy_bound: U64,
		/** The incentives commit reserved for the order, held with its escrow. */
		subsidy_reserved: U64,
		/**
		 * Worst-case market cash the fill can consume, counted in Predict's waiting cash
		 * need while the order waits.
		 */
		cash_need: U64,
	},
});
export const HeldPosition = new MoveStruct({
	name: `${$moduleName}::HeldPosition`,
	fields: {
		order_id: U256,
		root_id: U256,
		opened_at_ms: U64,
	},
});
export const CommittedPrice = new MoveStruct({
	name: `${$moduleName}::CommittedPrice`,
	fields: {
		/** Pyth price normalized to 1e9. */
		spot: U64,
		/** The update's envelope in ms: τ, or a later backup tick. The fill prices at it. */
		tick_ms: U64,
		/** The feed's own update time, in µs. */
		generation_us: U64,
	},
});
export const OrderResult = new MoveStruct({
	name: `${$moduleName}::OrderResult`,
	fields: {
		/** `0` for a fill, or a `REASON_*` code. */
		reason: bcs.u8(),
		/** Filled quantity (mint) or closed quantity (sell). */
		quantity: U64,
		/** Cost paid (mint) or proceeds (sell). Zero on a refund. */
		amount: U64,
		/** Sui clock of the finishing transaction. */
		finished_at_ms: U64,
	},
});
export const QueuedOrder = new MoveStruct({
	name: `${$moduleName}::QueuedOrder`,
	fields: {
		/**
		 * A `STATUS_*` code. Only moves forward, except that a refunded or partly filled
		 * sell returns to Open holding its position.
		 */
		status: bcs.u8(),
		/** A `KIND_*` code. */
		kind: bcs.u8(),
		request: OrderRequest,
		account_id: bcs.Address,
		/** The account's receive address. Refunds and returned escrow go here. */
		receive_address: bcs.Address,
		timing: OrderTiming,
		escrow: OrderEscrow,
		/**
		 * The position the record holds: a sell's position from placement, or a filled
		 * mint's new position. Zero otherwise.
		 */
		position: HeldPosition,
		price: CommittedPrice,
		result: OrderResult,
		/**
		 * Predict's receipt: admitted while the order waits, open while the record holds a
		 * position, `none` once the order is refunded or fully closed.
		 */
		receipt: bcs.option(expiry_market.OrderReceipt),
		/**
		 * The order's escrow: its budget, order fee, and reserved subsidy while it waits,
		 * zero once it finishes.
		 */
		funds: balance.Balance,
	},
});
export const OrderView = new MoveStruct({
	name: `${$moduleName}::OrderView`,
	fields: {
		status: bcs.u8(),
		kind: bcs.u8(),
		request: OrderRequest,
		account_id: bcs.Address,
		receive_address: bcs.Address,
		timing: OrderTiming,
		escrow: OrderEscrow,
		position: HeldPosition,
		price: CommittedPrice,
		result: OrderResult,
		/**
		 * The receipt's Predict stage (`constants::receipt_stage_*`), `0` when the record
		 * holds none.
		 */
		receipt_stage: bcs.u8(),
		/** USDC the record escrows now. */
		funds: U64,
	},
});
export interface StatusPendingOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function statusPending(options: StatusPendingOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status_pending',
		});
}
export interface StatusCommittedOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function statusCommitted(options: StatusCommittedOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status_committed',
		});
}
export interface StatusOpenOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function statusOpen(options: StatusOpenOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status_open',
		});
}
export interface StatusRefundedOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function statusRefunded(options: StatusRefundedOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status_refunded',
		});
}
export interface StatusClosedOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function statusClosed(options: StatusClosedOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status_closed',
		});
}
export interface StatusRefundDueOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function statusRefundDue(options: StatusRefundDueOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status_refund_due',
		});
}
export interface KindExactQuantityOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function kindExactQuantity(options: KindExactQuantityOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind_exact_quantity',
		});
}
export interface KindExactAmountOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function kindExactAmount(options: KindExactAmountOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind_exact_amount',
		});
}
export interface KindExactCostOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function kindExactCost(options: KindExactCostOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind_exact_cost',
		});
}
export interface KindRedeemLiveOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function kindRedeemLive(options: KindRedeemLiveOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind_redeem_live',
		});
}
export interface KindRedeemOpenOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function kindRedeemOpen(options: KindRedeemOpenOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind_redeem_open',
		});
}
export interface ReasonLimitsOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonLimits(options: ReasonLimitsOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_limits',
		});
}
export interface ReasonAdmissionOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonAdmission(options: ReasonAdmissionOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_admission',
		});
}
export interface ReasonNoPriceOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonNoPrice(options: ReasonNoPriceOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_no_price',
		});
}
export interface ReasonMissingNodeOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonMissingNode(options: ReasonMissingNodeOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_missing_node',
		});
}
export interface ReasonDeadlineOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonDeadline(options: ReasonDeadlineOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_deadline',
		});
}
export interface ReasonFreezeOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonFreeze(options: ReasonFreezeOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_freeze',
		});
}
export interface ReasonAdminOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonAdmin(options: ReasonAdminOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_admin',
		});
}
export interface ReasonNoCashOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reasonNoCash(options: ReasonNoCashOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_no_cash',
		});
}
export interface StatusArguments {
	view: TransactionArgument;
}
export interface StatusOptions {
	package?: string;
	arguments: StatusArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function status(options: StatusOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface KindArguments {
	view: TransactionArgument;
}
export interface KindOptions {
	package?: string;
	arguments: KindArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function kind(options: KindOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestArguments {
	view: TransactionArgument;
}
export interface RequestOptions {
	package?: string;
	arguments: RequestArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function request(options: RequestOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AccountIdArguments {
	view: TransactionArgument;
}
export interface AccountIdOptions {
	package?: string;
	arguments: AccountIdArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function accountId(options: AccountIdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiveAddressArguments {
	view: TransactionArgument;
}
export interface ReceiveAddressOptions {
	package?: string;
	arguments: ReceiveAddressArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function receiveAddress(options: ReceiveAddressOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'receive_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TimingArguments {
	view: TransactionArgument;
}
export interface TimingOptions {
	package?: string;
	arguments: TimingArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function timing(options: TimingOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'timing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EscrowArguments {
	view: TransactionArgument;
}
export interface EscrowOptions {
	package?: string;
	arguments: EscrowArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function escrow(options: EscrowOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'escrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PositionArguments {
	view: TransactionArgument;
}
export interface PositionOptions {
	package?: string;
	arguments: PositionArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function position(options: PositionOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'position',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PriceArguments {
	view: TransactionArgument;
}
export interface PriceOptions {
	package?: string;
	arguments: PriceArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function price(options: PriceOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ResultArguments {
	view: TransactionArgument;
}
export interface ResultOptions {
	package?: string;
	arguments: ResultArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function result(options: ResultOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'result',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiptStageArguments {
	view: TransactionArgument;
}
export interface ReceiptStageOptions {
	package?: string;
	arguments: ReceiptStageArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function receiptStage(options: ReceiptStageOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'receipt_stage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FundsArguments {
	view: TransactionArgument;
}
export interface FundsOptions {
	package?: string;
	arguments: FundsArguments | [view: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function funds(options: FundsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['view'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LowerTickArguments {
	request: TransactionArgument;
}
export interface LowerTickOptions {
	package?: string;
	arguments: LowerTickArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function lowerTick(options: LowerTickOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'lower_tick',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HigherTickArguments {
	request: TransactionArgument;
}
export interface HigherTickOptions {
	package?: string;
	arguments: HigherTickArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function higherTick(options: HigherTickOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'higher_tick',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuantityArguments {
	request: TransactionArgument;
}
export interface QuantityOptions {
	package?: string;
	arguments: QuantityArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function quantity(options: QuantityOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxPremiumArguments {
	request: TransactionArgument;
}
export interface MaxPremiumOptions {
	package?: string;
	arguments: MaxPremiumArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function maxPremium(options: MaxPremiumOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'max_premium',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinQuantityArguments {
	request: TransactionArgument;
}
export interface MinQuantityOptions {
	package?: string;
	arguments: MinQuantityArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function minQuantity(options: MinQuantityOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'min_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxCostArguments {
	request: TransactionArgument;
}
export interface MaxCostOptions {
	package?: string;
	arguments: MaxCostArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function maxCost(options: MaxCostOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'max_cost',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxProbabilityArguments {
	request: TransactionArgument;
}
export interface MaxProbabilityOptions {
	package?: string;
	arguments: MaxProbabilityArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function maxProbability(options: MaxProbabilityOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'max_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinProbabilityArguments {
	request: TransactionArgument;
}
export interface MinProbabilityOptions {
	package?: string;
	arguments: MinProbabilityArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function minProbability(options: MinProbabilityOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'min_probability',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinProceedsArguments {
	request: TransactionArgument;
}
export interface MinProceedsOptions {
	package?: string;
	arguments: MinProceedsArguments | [request: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function minProceeds(options: MinProceedsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'min_proceeds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PlacedAtMsArguments {
	timing: TransactionArgument;
}
export interface PlacedAtMsOptions {
	package?: string;
	arguments: PlacedAtMsArguments | [timing: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function placedAtMs(options: PlacedAtMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['timing'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'placed_at_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EarliestPriceMsArguments {
	timing: TransactionArgument;
}
export interface EarliestPriceMsOptions {
	package?: string;
	arguments: EarliestPriceMsArguments | [timing: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function earliestPriceMs(options: EarliestPriceMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['timing'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'earliest_price_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TauMsArguments {
	timing: TransactionArgument;
}
export interface TauMsOptions {
	package?: string;
	arguments: TauMsArguments | [timing: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function tauMs(options: TauMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['timing'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'tau_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeadlineMsArguments {
	timing: TransactionArgument;
}
export interface DeadlineMsOptions {
	package?: string;
	arguments: DeadlineMsArguments | [timing: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function deadlineMs(options: DeadlineMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['timing'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'deadline_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CutoffMsArguments {
	timing: TransactionArgument;
}
export interface CutoffMsOptions {
	package?: string;
	arguments: CutoffMsArguments | [timing: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function cutoffMs(options: CutoffMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['timing'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'cutoff_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PythChannelArguments {
	timing: TransactionArgument;
}
export interface PythChannelOptions {
	package?: string;
	arguments: PythChannelArguments | [timing: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function pythChannel(options: PythChannelOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['timing'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'pyth_channel',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BudgetArguments {
	escrow: TransactionArgument;
}
export interface BudgetOptions {
	package?: string;
	arguments: BudgetArguments | [escrow: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function budget(options: BudgetOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'budget',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderFeeArguments {
	escrow: TransactionArgument;
}
export interface OrderFeeOptions {
	package?: string;
	arguments: OrderFeeArguments | [escrow: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function orderFee(options: OrderFeeOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'order_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubsidyBoundArguments {
	escrow: TransactionArgument;
}
export interface SubsidyBoundOptions {
	package?: string;
	arguments: SubsidyBoundArguments | [escrow: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function subsidyBound(options: SubsidyBoundOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'subsidy_bound',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubsidyReservedArguments {
	escrow: TransactionArgument;
}
export interface SubsidyReservedOptions {
	package?: string;
	arguments: SubsidyReservedArguments | [escrow: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function subsidyReserved(options: SubsidyReservedOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'subsidy_reserved',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CashNeedArguments {
	escrow: TransactionArgument;
}
export interface CashNeedOptions {
	package?: string;
	arguments: CashNeedArguments | [escrow: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function cashNeed(options: CashNeedOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'cash_need',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderIdArguments {
	position: TransactionArgument;
}
export interface OrderIdOptions {
	package?: string;
	arguments: OrderIdArguments | [position: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function orderId(options: OrderIdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['position'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RootIdArguments {
	position: TransactionArgument;
}
export interface RootIdOptions {
	package?: string;
	arguments: RootIdArguments | [position: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function rootId(options: RootIdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['position'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'root_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OpenedAtMsArguments {
	position: TransactionArgument;
}
export interface OpenedAtMsOptions {
	package?: string;
	arguments: OpenedAtMsArguments | [position: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function openedAtMs(options: OpenedAtMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['position'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'opened_at_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotArguments {
	price: TransactionArgument;
}
export interface SpotOptions {
	package?: string;
	arguments: SpotArguments | [price: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function spot(options: SpotOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TickMsArguments {
	price: TransactionArgument;
}
export interface TickMsOptions {
	package?: string;
	arguments: TickMsArguments | [price: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function tickMs(options: TickMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'tick_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerationUsArguments {
	price: TransactionArgument;
}
export interface GenerationUsOptions {
	package?: string;
	arguments: GenerationUsArguments | [price: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function generationUs(options: GenerationUsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'generation_us',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReasonArguments {
	result: TransactionArgument;
}
export interface ReasonOptions {
	package?: string;
	arguments: ReasonArguments | [result: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function reason(options: ReasonOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['result'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ResultQuantityArguments {
	result: TransactionArgument;
}
export interface ResultQuantityOptions {
	package?: string;
	arguments: ResultQuantityArguments | [result: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function resultQuantity(options: ResultQuantityOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['result'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'result_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ResultAmountArguments {
	result: TransactionArgument;
}
export interface ResultAmountOptions {
	package?: string;
	arguments: ResultAmountArguments | [result: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function resultAmount(options: ResultAmountOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['result'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'result_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FinishedAtMsArguments {
	result: TransactionArgument;
}
export interface FinishedAtMsOptions {
	package?: string;
	arguments: FinishedAtMsArguments | [result: TransactionArgument];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function finishedAtMs(options: FinishedAtMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['result'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'finished_at_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
