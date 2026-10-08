/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Per-market queue of delayed-execution orders: queued mints and early sells that
 * fill at Pyth's signed price for their τ, or are refunded.
 *
 * One `OrderBook` lives under each `ExpiryMarket` UID once its first order is
 * placed. This module owns the book and its records (`QueuedOrder` and its parts),
 * the status, kind, and refund-reason codes, τ and deadline planning, the stuck
 * check, the counters and cohort spans, the escrowed USDC, the payout-tree pins,
 * the cash-need formulas, the one refund routine every finishing path shares, and
 * the walker primitives.
 *
 * It emits no events: `order_events` imports this module's types, so the
 * `expiry_market` caller emits from the facts these functions return. Pricing,
 * fills, and every flow gate stay in `expiry_market`.
 */

import { MoveStruct, MoveTuple, normalizeMoveArguments } from '../utils/index.js';
import { U64, U256 } from '../../bcs/integers.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
import * as vec_map from './deps/sui/vec_map.js';
import * as balance from './deps/sui/balance.js';
import * as pricing from './pricing.js';
const $moduleName = '@local-pkg/deepbook_predict::order_queue';
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
export const HeldPosition = new MoveStruct({
	name: `${$moduleName}::HeldPosition`,
	fields: {
		order_id: U256,
		root_id: U256,
		opened_at_ms: U64,
	},
});
export const OrderTiming = new MoveStruct({
	name: `${$moduleName}::OrderTiming`,
	fields: {
		/** t₀, the Sui clock of the enqueue transaction. */
		placed_at_ms: U64,
		/** τ itself: a price generated before it never commits the order. */
		earliest_price_ms: U64,
		/** The channel tick the order is priced on. */
		tau_ms: U64,
		/** At or past it the order is refunded, never filled. */
		deadline_ms: U64,
		/**
		 * `expiry - max(no_trade_window_ms, stall_timeout_ms + 5_000)`; enqueue requires τ
		 * below it.
		 */
		cutoff_ms: U64,
		/** The policy channel at enqueue. Commit accepts only updates on it. */
		pyth_channel: bcs.u8(),
	},
});
export const OrderBookKey = new MoveTuple({
	name: `${$moduleName}::OrderBookKey`,
	fields: [bcs.bool()],
});
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
		 * Where the next `try_settle` payout call resumes after settlement. Only moves
		 * forward, and never past `next_id`.
		 */
		payout_cursor: U64,
		/**
		 * One span per cohort (orders sharing one τ) that still has an unfinished order,
		 * in τ order. Inline, so `value_expiry` loads no extra object.
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
		 * Waiting orders per payout-tree tick (tick -> count). A pinned node is never
		 * pruned, so a resolve fill never creates one.
		 */
		pins: vec_map.VecMap(U64, U64),
		/**
		 * Unfinished orders per account. A row is created by the account's first enqueue
		 * in this market and never deleted.
		 */
		per_account: table.Table,
		/** Unfinished mints and sells, against the policy capacities. */
		pending_mints: U64,
		pending_sells: U64,
		/**
		 * Sum of unfinished orders' cash needs. `rebalance_expiry_cash` funds a live
		 * market to at least required cash plus this, and never sweeps below it.
		 */
		waiting_cash_need: U64,
		/**
		 * Every unfinished order's budget, order fee, and reserved subsidy. Outside market
		 * cash, NAV, and backing.
		 */
		escrow: balance.Balance,
	},
});
export const OrderParties = new MoveStruct({
	name: `${$moduleName}::OrderParties`,
	fields: {
		account_id: bcs.Address,
		owner: bcs.Address,
		/**
		 * The wrapper's address. Refunds, sell proceeds, and settled payouts go here
		 * through `balance::send_funds`.
		 */
		receive_address: bcs.Address,
		referrer_account_id: bcs.option(bcs.Address),
		referrer_receive_address: bcs.option(bcs.Address),
		builder_code_id: bcs.option(bcs.Address),
	},
});
export const OrderEscrow = new MoveStruct({
	name: `${$moduleName}::OrderEscrow`,
	fields: {
		/** USDC locked for the premium and fees. Sells lock none. */
		budget: U64,
		/** Flat fee charged at enqueue. */
		order_fee: U64,
		/**
		 * The t₀ quote's pre-subsidy trading fee, capped at what the budget could pay.
		 * Bounds the subsidy commit reserves.
		 */
		subsidy_bound: U64,
		/** Set at commit; the reserved amount sits in the book's escrow. */
		subsidy_rate: U64,
		subsidy_reserved: U64,
		/** Worst-case cash the market could add from its own cash to fill the order. */
		cash_need: U64,
	},
});
export const CommittedPrice = new MoveStruct({
	name: `${$moduleName}::CommittedPrice`,
	fields: {
		/** Pyth price normalized to 1e9. */
		spot: U64,
		/** The update's envelope in ms: τ, or a later backup tick. Resolve prices at it. */
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
		 * A `STATUS_*` code. Only moves forward, except that a refunded sell returns to
		 * Open holding its position.
		 */
		status: bcs.u8(),
		/** A `KIND_*` code. */
		kind: bcs.u8(),
		request: OrderRequest,
		parties: OrderParties,
		timing: OrderTiming,
		vol: pricing.VolSnapshot,
		escrow: OrderEscrow,
		/**
		 * The position the record holds: a sell's position from enqueue, or a filled
		 * mint's new position. Zero otherwise.
		 */
		position: HeldPosition,
		price: CommittedPrice,
		result: OrderResult,
	},
});
export const RefundOutcome = new MoveStruct({
	name: `${$moduleName}::RefundOutcome`,
	fields: {
		escrow_returned: U64,
		order_fee_returned: U64,
		subsidy_returned: U64,
		position_returned: bcs.bool(),
		owed: U64,
		shortfall: U64,
	},
});
export interface StatusPendingOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictPackageId?: string;
	};
}
export function statusPending(options: StatusPendingOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function statusCommitted(options: StatusCommittedOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function statusOpen(options: StatusOpenOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function statusRefunded(options: StatusRefundedOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function statusClosed(options: StatusClosedOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function statusRefundDue(options: StatusRefundDueOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function kindExactQuantity(options: KindExactQuantityOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function kindExactAmount(options: KindExactAmountOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function kindExactCost(options: KindExactCostOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function kindRedeemLive(options: KindRedeemLiveOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function kindRedeemOpen(options: KindRedeemOpenOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonLimits(options: ReasonLimitsOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonAdmission(options: ReasonAdmissionOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonNoPrice(options: ReasonNoPriceOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonMissingNode(options: ReasonMissingNodeOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonDeadline(options: ReasonDeadlineOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonFreeze(options: ReasonFreezeOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonAdmin(options: ReasonAdminOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reasonNoCash(options: ReasonNoCashOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'reason_no_cash',
		});
}
export interface StatusArguments {
	order: TransactionArgument;
}
export interface StatusOptions {
	package?: string;
	arguments: StatusArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function status(options: StatusOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'status',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface KindArguments {
	order: TransactionArgument;
}
export interface KindOptions {
	package?: string;
	arguments: KindArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function kind(options: KindOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'kind',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestArguments {
	order: TransactionArgument;
}
export interface RequestOptions {
	package?: string;
	arguments: RequestArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function request(options: RequestOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PartiesArguments {
	order: TransactionArgument;
}
export interface PartiesOptions {
	package?: string;
	arguments: PartiesArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function parties(options: PartiesOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'parties',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TimingArguments {
	order: TransactionArgument;
}
export interface TimingOptions {
	package?: string;
	arguments: TimingArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function timing(options: TimingOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'timing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VolArguments {
	order: TransactionArgument;
}
export interface VolOptions {
	package?: string;
	arguments: VolArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function vol(options: VolOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'vol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EscrowArguments {
	order: TransactionArgument;
}
export interface EscrowOptions {
	package?: string;
	arguments: EscrowArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function escrow(options: EscrowOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'escrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PositionArguments {
	order: TransactionArgument;
}
export interface PositionOptions {
	package?: string;
	arguments: PositionArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function position(options: PositionOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'position',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PriceArguments {
	order: TransactionArgument;
}
export interface PriceOptions {
	package?: string;
	arguments: PriceArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function price(options: PriceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ResultArguments {
	order: TransactionArgument;
}
export interface ResultOptions {
	package?: string;
	arguments: ResultArguments | [order: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function result(options: ResultOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['order'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'result',
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
		predictPackageId?: string;
	};
}
export function lowerTick(options: LowerTickOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function higherTick(options: HigherTickOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function quantity(options: QuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function maxPremium(options: MaxPremiumOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function minQuantity(options: MinQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function maxCost(options: MaxCostOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function maxProbability(options: MaxProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function minProbability(options: MinProbabilityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function minProceeds(options: MinProceedsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
export interface AccountIdArguments {
	parties: TransactionArgument;
}
export interface AccountIdOptions {
	package?: string;
	arguments: AccountIdArguments | [parties: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function accountId(options: AccountIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['parties'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	parties: TransactionArgument;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [parties: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function owner(options: OwnerOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['parties'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiveAddressArguments {
	parties: TransactionArgument;
}
export interface ReceiveAddressOptions {
	package?: string;
	arguments: ReceiveAddressArguments | [parties: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function receiveAddress(options: ReceiveAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['parties'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'receive_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferrerAccountIdArguments {
	parties: TransactionArgument;
}
export interface ReferrerAccountIdOptions {
	package?: string;
	arguments: ReferrerAccountIdArguments | [parties: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function referrerAccountId(options: ReferrerAccountIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['parties'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'referrer_account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferrerReceiveAddressArguments {
	parties: TransactionArgument;
}
export interface ReferrerReceiveAddressOptions {
	package?: string;
	arguments: ReferrerReceiveAddressArguments | [parties: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function referrerReceiveAddress(options: ReferrerReceiveAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['parties'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'referrer_receive_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BuilderCodeIdArguments {
	parties: TransactionArgument;
}
export interface BuilderCodeIdOptions {
	package?: string;
	arguments: BuilderCodeIdArguments | [parties: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function builderCodeId(options: BuilderCodeIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['parties'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'builder_code_id',
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
		predictPackageId?: string;
	};
}
export function placedAtMs(options: PlacedAtMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function earliestPriceMs(options: EarliestPriceMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function tauMs(options: TauMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function deadlineMs(options: DeadlineMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function cutoffMs(options: CutoffMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function pythChannel(options: PythChannelOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function budget(options: BudgetOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function orderFee(options: OrderFeeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function subsidyBound(options: SubsidyBoundOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
export interface SubsidyRateArguments {
	escrow: TransactionArgument;
}
export interface SubsidyRateOptions {
	package?: string;
	arguments: SubsidyRateArguments | [escrow: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
export function subsidyRate(options: SubsidyRateOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['escrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_queue',
			function: 'subsidy_rate',
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
		predictPackageId?: string;
	};
}
export function subsidyReserved(options: SubsidyReservedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function cashNeed(options: CashNeedOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function orderId(options: OrderIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function rootId(options: RootIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function openedAtMs(options: OpenedAtMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function spot(options: SpotOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function tickMs(options: TickMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function generationUs(options: GenerationUsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function reason(options: ReasonOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function resultQuantity(options: ResultQuantityOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function resultAmount(options: ResultAmountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		predictPackageId?: string;
	};
}
export function finishedAtMs(options: FinishedAtMsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
