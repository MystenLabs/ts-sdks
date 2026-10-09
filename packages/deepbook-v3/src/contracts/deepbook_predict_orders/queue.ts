/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * One expiry market's delayed-execution queue, `MarketQueue`, and its flows:
 * placement of queued mints and early sells, commit of verified Pyth Lazer prices,
 * resolve at the committed tick, the deadline and admin refunds, the settlement
 * drain and payout walk, cleanup, and the queue reads.
 *
 * Every money-moving step runs inside one of Predict's order-flow primitives,
 * which check their own gates and bindings when they run: admission (`admit_mint`,
 * `admit_sell`), `commit`, `try_fill`, `release`, and `try_pay_settled`. The queue
 * owns what Predict leaves to the companion: τ and the deadline, the stuck gate,
 * capacities and per-account caps, cohort order, the exact-or-backup tick choice,
 * escrow custody, refund routing, and the queue events. Each record holds
 * Predict's receipt for its order and that order's own escrow, so a refund pays
 * exactly that record's escrow.
 *
 * A queued fill never enters the account: it stays an Open record until
 * `enqueue_redeem_open` sells it or the settlement payout walk or `pay_open` pays
 * it.
 *
 * Mainnet USDC is a regulated coin: Sui aborts a transaction that sends it to an
 * address on its deny list for the current epoch, or to anyone while it is
 * globally paused. Every walker restarts at the same head record, so one such send
 * would block the market's fills, refunds, and payouts for good. So nothing here,
 * and nothing in Predict's primitives, sends to a denied address. Predict refuses
 * a fill for a denied receive address (reason 9), keeps a denied builder's or
 * referrer's fee in market cash, and skips a denied winner's payout. The queue
 * parks change and refunds it cannot send in the record, which finishes as usual
 * with the funds kept (`RecordFundsParked`). `claim_parked` sends them, and
 * `pay_open` pays a skipped Open record, once the address is clear. While USDC is
 * globally paused every address counts as denied: fills refuse, refunds park, and
 * payouts skip until the pause lifts.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as order_queue from './order_queue.js';
const $moduleName = '@local-pkg/deepbook_predict_orders::queue';
export const MarketQueue = new MoveStruct({
	name: `${$moduleName}::MarketQueue`,
	fields: {
		id: bcs.Address,
		desk_id: bcs.Address,
		expiry_market_id: bcs.Address,
		book: order_queue.OrderBook,
		/** Set by the `settle_step` call that emits `MarketPayoutsCompleted`. */
		payouts_completed: bcs.bool(),
	},
});
export interface PhaseDrainOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function phaseDrain(options: PhaseDrainOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'phase_drain',
		});
}
export interface PhasePayOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function phasePay(options: PhasePayOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'phase_pay',
		});
}
export interface PhaseDoneOptions {
	package?: string;
	arguments?: [];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function phaseDone(options: PhaseDoneOptions = {}) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'phase_done',
		});
}
export interface QueueIdArguments {
	registryId: RawTransactionArgument<string>;
	expiryMarketId: RawTransactionArgument<string>;
}
export interface QueueIdOptions {
	package?: string;
	arguments:
		| QueueIdArguments
		| [registryId: RawTransactionArgument<string>, expiryMarketId: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Return the ID of `expiry_market_id`'s queue under the queue registry
 * `registry_id`, whether or not it exists yet. For PTB construction.
 */
export function queueId(options: QueueIdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = ['0x2::object::ID', '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registryId', 'expiryMarketId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'queue_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdArguments {
	queue: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function id(options: IdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeskIdArguments {
	queue: RawTransactionArgument<string>;
}
export interface DeskIdOptions {
	package?: string;
	arguments: DeskIdArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function deskId(options: DeskIdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'desk_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryMarketIdArguments {
	queue: RawTransactionArgument<string>;
}
export interface ExpiryMarketIdOptions {
	package?: string;
	arguments: ExpiryMarketIdArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
export function expiryMarketId(options: ExpiryMarketIdOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'expiry_market_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderArguments {
	queue: RawTransactionArgument<string>;
	recordId: RawTransactionArgument<number | bigint>;
}
export interface OrderOptions {
	package?: string;
	arguments:
		| OrderArguments
		| [queue: RawTransactionArgument<string>, recordId: RawTransactionArgument<number | bigint>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/** Return one record, or `none` for a missing or deleted record ID. */
export function order(options: OrderOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['queue', 'recordId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QueueHeadsArguments {
	queue: RawTransactionArgument<string>;
}
export interface QueueHeadsOptions {
	package?: string;
	arguments: QueueHeadsArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Return `(resolve_head, next_id, last_tau_ms, last_committed_tau_ms)`.
 * `resolve_head` is a lower bound on the first unfinished record.
 */
export function queueHeads(options: QueueHeadsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'queue_heads',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PayoutProgressArguments {
	queue: RawTransactionArgument<string>;
}
export interface PayoutProgressOptions {
	package?: string;
	arguments: PayoutProgressArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Return `(payout_cursor, next_id, payouts_completed)`. The settlement payout walk
 * is finished once `payouts_completed` is set.
 */
export function payoutProgress(options: PayoutProgressOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'payout_progress',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WaitingCohortsArguments {
	queue: RawTransactionArgument<string>;
}
export interface WaitingCohortsOptions {
	package?: string;
	arguments: WaitingCohortsArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Return
 * `(cohort count, oldest uncommitted τ, oldest uncommitted τ above  last_committed_tau_ms)`.
 * The third value is the cohort the stuck gate's first rule watches.
 */
export function waitingCohorts(options: WaitingCohortsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'waiting_cohorts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QueueStuckArguments {
	queue: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
}
export interface QueueStuckOptions {
	package?: string;
	arguments: QueueStuckArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Whether placement would refuse a new order as stuck right now (both rules of the
 * stuck gate). Drives the app's "pricing delayed" banner.
 */
export function queueStuck(options: QueueStuckOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['queue', 'desk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'queue_stuck',
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
export interface PendingCountsArguments {
	queue: RawTransactionArgument<string>;
}
export interface PendingCountsOptions {
	package?: string;
	arguments: PendingCountsArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Return `(pending_mints, pending_sells)`, the unfinished orders counted against
 * the policy capacities.
 */
export function pendingCounts(options: PendingCountsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'pending_counts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WaitingOrdersArguments {
	queue: RawTransactionArgument<string>;
	accountId: RawTransactionArgument<string>;
}
export interface WaitingOrdersOptions {
	package?: string;
	arguments:
		| WaitingOrdersArguments
		| [queue: RawTransactionArgument<string>, accountId: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Return the unfinished queued orders `account_id` holds in this queue, the count
 * the per-account cap checks. The settlement drain (`settle_step`) refunds without
 * lowering it, since no placement reads it once the market has expired, so after
 * expiry it can overstate what the account still has waiting. Read `order` for
 * each record's status instead.
 */
export function waitingOrders(options: WaitingOrdersOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['queue', 'accountId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'waiting_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OldestUnfinishedTauMsArguments {
	queue: RawTransactionArgument<string>;
}
export interface OldestUnfinishedTauMsOptions {
	package?: string;
	arguments: OldestUnfinishedTauMsArguments | [queue: RawTransactionArgument<string>];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/** Return τ of the oldest cohort with an unfinished order, for monitoring. */
export function oldestUnfinishedTauMs(options: OldestUnfinishedTauMsOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['queue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'oldest_unfinished_tau_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuoteRedeemOpenArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	recordId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
}
export interface QuoteRedeemOpenOptions {
	package?: string;
	arguments:
		| QuoteRedeemOpenArguments
		| [
				queue: RawTransactionArgument<string>,
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				pricer: TransactionArgument,
				recordId: RawTransactionArgument<number | bigint>,
				closeQuantity: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		predictOrdersPackageId?: string;
	};
}
/**
 * Quote an early sell of `close_quantity` from the Open record `record_id` at a
 * live `Pricer`, with the wrapper account's builder code, through Predict's
 * `quote_close`: the close a queued sell fills, with the trading fee at the clock
 * instead of a committed tick. `proceeds` is before the order fee. Changes
 * nothing. Aborts `ERecordNotOpen` for a missing or non-Open record, and otherwise
 * as `quote_close` does. Does not check that the account owns the record. For SDK
 * and devInspect pricing before `enqueue_redeem_open`.
 */
export function quoteRedeemOpen(options: QuoteRedeemOpenOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null, null, null, 'u64', 'u64', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['queue', 'market', 'wrapper', 'pricer', 'recordId', 'closeQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'quote_redeem_open',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAndShareArguments {
	registry?: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
}
export interface CreateAndShareOptions {
	package?: string;
	arguments: CreateAndShareArguments;
	config?: {
		queueRegistry: ConfigValue;
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Create and share `market`'s queue under `desk`. Permissionless; the caller pays
 * its storage. The queue's ID is derived from the desk's registry and the market,
 * so a second call for the same market aborts. Writes only the registry, which no
 * trading call reads, so creation never contends with trading on the desk. Aborts
 * `EWrongDesk` for another desk's registry.
 */
export function createAndShare(options: CreateAndShareOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'desk', 'market'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'create_and_share',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.queueRegistry,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueExactQuantityArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	desk?: RawTransactionArgument<string>;
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
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Place a queued mint for an exact quantity, priced later at Pyth's signed price
 * for its τ. `max_cost` caps the all-in withdrawal and is mandatory;
 * `max_probability` caps the entry probability at τ. Escrows the budget,
 * `min(max_cost, quantity, available - order_fee)`, and the order fee, and returns
 * the new record ID.
 *
 * Aborts, charging nothing, when the queue refuses the order: the desk floor,
 * another desk's or market's queue (`EWrongDesk`, `EWrongMarket`), a stuck or full
 * queue (`EQueueStuck`, `EQueueFull`, `EAccountOrderCap`), τ at or past the cutoff
 * (`EPastCutoff`), an unlimited or zero `max_cost` (`EMintCostCapRequired`), or a
 * balance not above the order fee (`EFeeNotCovered`). Then Predict's `admit_mint`
 * applies its gates, the order's own limits at the clock, and the market's spare
 * cash.
 */
export function enqueueExactQuantity(options: EnqueueExactQuantityOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
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
		'queue',
		'market',
		'wrapper',
		'auth',
		'desk',
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
			module: 'queue',
			function: 'enqueue_exact_quantity',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueExactAmountArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	desk?: RawTransactionArgument<string>;
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
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictOrdersPackageId?: string;
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
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
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
		'queue',
		'market',
		'wrapper',
		'auth',
		'desk',
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
			module: 'queue',
			function: 'enqueue_exact_amount',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueExactCostArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	desk?: RawTransactionArgument<string>;
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
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictOrdersPackageId?: string;
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
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
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
		'queue',
		'market',
		'wrapper',
		'auth',
		'desk',
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
			module: 'queue',
			function: 'enqueue_exact_cost',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EnqueueRedeemOpenArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	desk?: RawTransactionArgument<string>;
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
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Place a queued early sell of `close_quantity` of an Open record's position.
 * `record_id` is the record's queue ID, not the position's order ID. The source
 * record must belong to this account (`ENotRecordOwner`) and be Open
 * (`ERecordNotOpen`, also for a missing ID). It is marked Closed and its receipt
 * and whole position move into the new record until the sell fills or refunds.
 * `min_probability` and `min_proceeds` are the close-side floors at τ. Returns the
 * new record ID.
 *
 * Escrows only the order fee, so a balance equal to it is enough. Refuses a sell
 * below `min_sell_quantity` or one leaving a remainder below it (`EBelowMinSell`),
 * and otherwise like `enqueue_exact_quantity`. Predict's `admit_sell` is open
 * during the trading pause and a market mint pause and has no spare-cash check:
 * the keeper funds the market before τ, and resolve refunds a sell the market
 * still cannot cover.
 */
export function enqueueRedeemOpen(options: EnqueueRedeemOpenOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
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
		'queue',
		'market',
		'wrapper',
		'auth',
		'desk',
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
			module: 'queue',
			function: 'enqueue_redeem_open',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					desk: options.arguments?.desk ?? options.config?.orderDesk,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CommitArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	updates: TransactionArgument;
}
export interface CommitOptions {
	package?: string;
	arguments: CommitArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Attach verified Pyth Lazer prices to the waiting cohorts whose τ they match.
 * Permissionless. Each update must come from the Pyth Lazer verifier earlier in
 * the same PTB; their order in `updates` does not matter. An update that matches
 * no waiting cohort is skipped.
 *
 * Matching reads only the inline cohort list and picks at most one update per
 * waiting cohort before its deadline: the one stamped exactly its τ on its
 * channel, or else, once the price buffer is above zero and now is at least
 * `gap_wait_ms` past τ, the one stamped one tick of the cohort's own channel
 * later. Each matched cohort then commits whole or not at all: one price per feed
 * is decoded through `lazer_price::from_update`, every Pending order is checked
 * against it before any is written, and an empty price, a price generated before
 * τ, or an envelope after now leaves the cohort for a later commit or its deadline
 * refund. The decode aborts on an update that lacks an order's feed or one of its
 * properties, because the caller passed the wrong update. Each committed mint
 * escrows the subsidy Predict reserves for it.
 *
 * Uses Lazer's v1 `Update`, which Pyth marked deprecated on Mainnet but still
 * serves; v2 arrives with a later library constructor.
 */
export function commit(options: CommitOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null, null, null, 'vector<null>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['queue', 'market', 'desk', 'config', 'updates'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'commit',
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
export interface ResolveArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	maxOrders: RawTransactionArgument<number | bigint>;
}
export interface ResolveOptions {
	package?: string;
	arguments: ResolveArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Fill or refund committed orders in τ order, visiting at most `max_orders`
 * records, and never more than 450 (each emits up to two events, and Sui caps a
 * transaction at 1,024). Permissionless. Returns how many orders it finished.
 *
 * Walks the cohorts in τ order and loads only committed or overdue ones; a cohort
 * still waiting for its price is skipped without loading a record. Every record
 * visited counts against `max_orders`, finished or missing ones included. The 450
 * cap bounds events, not loaded objects (`MAX_ORDERS_PER_CALL`), so the caller
 * sizes `max_orders` to stay inside Sui's per-transaction object limit. An order
 * at or past its deadline is refunded (reason 5), never filled. A committed order
 * goes to Predict's `try_fill`, which fills it or returns the refund reason (1, 2,
 * 4, 8, or 9); the queue returns the escrow Predict hands back to the trader, or
 * parks it in the record when the receive address is denied. Returns 0 on a
 * settled market, whose waiting orders the settlement drain refunds.
 */
export function resolve(options: ResolveOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['queue', 'market', 'desk', 'config', 'maxOrders'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'resolve',
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
export interface RefundArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	maxOrders: RawTransactionArgument<number | bigint>;
}
export interface RefundOptions {
	package?: string;
	arguments: RefundArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Refund waiting orders at or past their deadline (reason 5), visiting at most
 * `max_orders` records, refunded or not, and never more than 450, as `resolve`
 * does. It walks the cohorts in τ order and stops at the first one not yet due,
 * since deadlines never decrease along the queue. Permissionless, and available
 * while Predict is frozen or this companion's witness is disabled: Predict's
 * `release` checks only its version floor. A refund the receive address cannot
 * take is parked in its record. Returns how many orders it refunded: `0`, without
 * aborting, when none is due.
 */
export function refund(options: RefundOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['queue', 'market', 'desk', 'config', 'maxOrders'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'refund',
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
export interface AdminRefundArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	recordIds: RawTransactionArgument<Array<number | bigint>>;
}
export interface AdminRefundOptions {
	package?: string;
	arguments: AdminRefundArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Refund the listed waiting orders at once (reason 7), wherever they sit in the
 * queue. Predict's `AdminCap` only, and available while Predict is frozen. Missing
 * and finished IDs are skipped, and a refund the receive address cannot take is
 * parked in its record.
 */
export function adminRefund(options: AdminRefundOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'vector<u64>',
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['queue', 'market', 'AdminCap', 'desk', 'config', 'recordIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'admin_refund',
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
export interface CleanupArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	recordIds: RawTransactionArgument<Array<number | bigint>>;
}
export interface CleanupOptions {
	package?: string;
	arguments: CleanupArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Delete Refunded and Closed records of a settled market. Permissionless; the
 * storage rebate goes to the caller. Missing IDs, other statuses, and records
 * still holding a receipt or funds (parked funds included, until `claim_parked`)
 * are skipped; `QueuedOrdersCleaned` is emitted only when a record was deleted.
 * Takes `&Clock` only to stamp the event.
 */
export function cleanup(options: CleanupOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [null, null, null, 'vector<u64>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['queue', 'market', 'desk', 'recordIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'cleanup',
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
export interface SettleStepArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
}
export interface SettleStepOptions {
	package?: string;
	arguments: SettleStepArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Run one bounded settlement phase on this queue and return the phase the queue is
 * in afterwards, which the next call runs (`phase_drain`, `phase_pay`, or
 * `phase_done`). Permissionless; aborts `EMarketNotExpired` before expiry.
 *
 * - DRAIN, while unfinished orders remain: refund them in τ order with reason 5,
 *   visiting at most the policy's `settle_refund_batch` records, refunded or not.
 *   No pruning and no account rows, so each refund loads its record alone. A
 *   refund the receive address cannot take is parked in its record. Runs before
 *   and after Predict settles, and while Predict is frozen.
 * - PAY, once nothing is unfinished and Predict has settled the market: from the
 *   payout cursor, visit at most `settle_payout_batch` records. Each Open record
 *   is paid its settled payout through `try_pay_settled` (zero for a loser),
 *   marked Closed, and reported with `OpenRecordSettled`. A record the market
 *   cannot pay, or whose receive address is denied, stays Open with
 *   `OpenRecordPayoutSkipped`, and `pay_open` pays it later. Before Predict
 *   settles, a PAY call changes nothing.
 * - DONE: the call whose walk reaches the last record emits
 *   `MarketPayoutsCompleted`; later calls change nothing. Skipped records are
 *   still paid through `pay_open`.
 *
 * The keeper sends one call per transaction until it returns `phase_done()`.
 */
export function settleStep(options: SettleStepOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['queue', 'market', 'desk', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'settle_step',
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
export interface PayOpenArguments {
	queue: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	recordId: RawTransactionArgument<number | bigint>;
}
export interface PayOpenOptions {
	package?: string;
	arguments: PayOpenArguments;
	config?: {
		orderDesk: ConfigValue;
		protocolConfig: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Pay one Open record of a settled market its settled payout through Predict's
 * `try_pay_settled`, at any time after settlement, before or after `settle_step`
 * completes: the record the payout walk skipped because the market was short of
 * cash or its receive address was denied. Permissionless. Emits
 * `OpenRecordSettled` and closes the record, or emits `OpenRecordPayoutSkipped`
 * and leaves it Open if the cause persists. A missing or non-Open record is left
 * alone. Aborts `EMarketNotSettled` before Predict settles the market.
 */
export function payOpen(options: PayOpenOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['queue', 'market', 'desk', 'config', 'recordId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'pay_open',
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
export interface ClaimParkedArguments {
	queue: RawTransactionArgument<string>;
	desk?: RawTransactionArgument<string>;
	recordId: RawTransactionArgument<number | bigint>;
}
export interface ClaimParkedOptions {
	package?: string;
	arguments: ClaimParkedArguments;
	config?: {
		orderDesk: ConfigValue;
		predictOrdersPackageId?: string;
	};
}
/**
 * Send a finished record's parked funds, change or a refund its receive address
 * could not take, to that address once a send would go through (`denied` is
 * false). Permissionless: the funds go only to the record's own receive address.
 * Emits `RecordFundsClaimed` and returns the amount sent, or returns `0` and
 * changes nothing for a missing or unfinished record, one with nothing parked, or
 * an address still denied.
 */
export function claimParked(options: ClaimParkedOptions) {
	const packageAddress =
		options.package ??
		options.config?.predictOrdersPackageId ??
		'@local-pkg/deepbook_predict_orders';
	const argumentsTypes = [
		null,
		null,
		'u64',
		'0x2::deny_list::DenyList',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['queue', 'desk', 'recordId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'queue',
			function: 'claim_parked',
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
