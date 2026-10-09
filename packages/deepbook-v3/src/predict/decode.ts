// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import type { PredictConfig } from './config/index.js';
import { accountEvents } from '../account.js';
import * as builderCodeEvents from '../contracts/deepbook_predict/builder_code_events.js';
import * as configEvents from '../contracts/deepbook_predict/config_events.js';
import * as orderEvents from '../contracts/deepbook_predict/order_events.js';
import * as vaultEvents from '../contracts/deepbook_predict/vault_events.js';
import * as queueEvents from '../contracts/deepbook_predict_orders/queue_events.js';
import { PredictInputError } from './errors.js';
import {
	isMintKind,
	isSellKind,
	orderKindName,
	policyFromBcs,
	refundReason,
	type DelayedExecutionPolicy,
	type HeldPosition,
	type OrderKindName,
	type RefundReasonInfo,
} from './queue.js';
import { fromRaw } from './units.js';

// ============================================================================
// Execution-result decoders.
//
// Every tx.* builder returns a Transaction; after the app executes it (with
// events included), the deployed contracts emit typed events carrying the full
// receipt — order ids, fills, fees, queue indexes, new balances. These pure
// functions turn that result into typed receipts. No network, no client.
//
// Decoding uses each event's BCS bytes, not its `json`: the client typings
// warn the JSON rendering varies across transports (JSON-RPC/gRPC/GraphQL),
// while BCS is canonical. Layouts come from the GENERATED event MoveStructs
// (src/contracts/{deepbook_predict,deepbook_predict_orders,account}/*_events.ts), whose field order
// mirrors the deployed Move — regenerate the bindings if the package changes.
// ============================================================================

/** The slice of an executed/simulated transaction result the decoders need. */
export interface DecodableEvent {
	/** Full type tag `0xpkg::module::Name` (gRPC `eventType`, legacy `type`). */
	eventType?: string;
	type?: string;
	packageId?: string;
	module?: string;
	/** Struct name, when the transport supplies it separately from a full type tag. */
	name?: string;
	/** Canonical BCS payload; some transports deliver it base64-encoded. */
	bcs?: Uint8Array | string;
}

export interface DecodableTransactionResult {
	events?: readonly DecodableEvent[] | null;
}

// --- matching + plumbing ----------------------------------------------------

function eventBytes(e: DecodableEvent): Uint8Array | null {
	if (e.bcs instanceof Uint8Array) return e.bcs;
	if (typeof e.bcs === 'string') return fromBase64(e.bcs);
	return null;
}

// Match by defining package + module + struct name. Events are typed by the
// package version that introduced their struct, not the latest Move-call target.
// The pre-queue events were introduced in v1 (`predictV1`); the Predict events the
// delayed-execution upgrade added in `predictDelayedExecution`; and the queue events
// in the order-flow companion's original ID (`predictOrdersV1 ?? predictOrders`).
function matches(e: DecodableEvent, pkg: string, module: string, name: string): boolean {
	const tag = e.eventType ?? e.type;
	if (tag) {
		const parts = tag.split('::');
		if (parts.length !== 3) return false;
		return (
			normalizeSuiAddress(parts[0]) === normalizeSuiAddress(pkg) &&
			parts[1] === module &&
			parts[2] === name
		);
	}
	// No type tag. Match on what the transport did give us — and on `name` when it is
	// present, because module+package alone matches EVERY struct in the module, so one
	// decoder would happily take another's event and fail deep inside BCS.
	if (e.module !== module || e.packageId == null) return false;
	if (normalizeSuiAddress(e.packageId) !== normalizeSuiAddress(pkg)) return false;
	return e.name == null || e.name === name;
}

function decodeAll<T>(
	result: DecodableTransactionResult,
	pkg: string,
	module: string,
	name: string,
	layout: { parse(bytes: Uint8Array): T },
): T[] {
	const out: T[] = [];
	for (const e of result.events ?? []) {
		if (!matches(e, pkg, module, name)) continue;
		const bytes = eventBytes(e);
		if (!bytes) {
			throw new PredictInputError(
				`${module}::${name} event has no BCS payload — execute/simulate with events included`,
			);
		}
		out.push(layout.parse(bytes));
	}
	return out;
}

function exactlyOne<T>(items: T[], what: string): T {
	if (items.length !== 1) {
		throw new PredictInputError(`expected exactly one ${what} event, found ${items.length}`);
	}
	return items[0];
}

const optId = (v: string | null | undefined): string | null =>
	v == null ? null : normalizeSuiAddress(v);

// --- receipts ---------------------------------------------------------------

export interface MintReceipt {
	marketId: string;
	accountId: string;
	owner: string;
	/** Persist this: required to redeem/claim the position later. */
	orderId: bigint;
	/** Stable across partial-close replacements; equals orderId at mint. */
	positionRootId: bigint;
	lowerTick: bigint;
	higherTick: bigint;
	/** 0..1 range probability quoted at entry (your fill price per $1 payout). */
	entryProbability: number;
	/** Max payout actually minted, in quote units (mintAmount: chain-floored). */
	quantity: number;
	/** Premium paid into LP backing, in quote units. */
	premium: number;
	/**
	 * Fee breakdown. `referral` is the slice of the trader-paid trading fee and
	 * congestion surcharge delivered to the referrer; `inventoryImpact` is the
	 * path-independent inventory-impact charge assessed on the mint.
	 */
	fees: {
		trading: number;
		subsidy: number;
		builder: number;
		penalty: number;
		referral: number;
		inventoryImpact: number;
	};
	builderCodeId: string | null;
	raw: {
		quantity: bigint;
		premium: bigint;
		tradingFee: bigint;
		feeIncentiveSubsidy: bigint;
		builderFee: bigint;
		penaltyFee: bigint;
		referralFee: bigint;
		inventoryImpactCharge: bigint;
		entryProbability: bigint;
	};
}

export interface RedeemReceipt {
	marketId: string;
	accountId: string;
	owner: string;
	orderId: bigint;
	positionRootId: bigint;
	quantityClosed: number;
	remaining: number;
	/**
	 * A partial close RETIRES the old order id and issues this replacement for
	 * the remaining quantity — update your stored id or it goes silently stale.
	 */
	replacementOrderId: bigint | null;
	/** NET quote credited to the account: gross + inventoryImpactRebate − trading −
	 * builder − penalty — the same expression the chain asserts `min_proceeds`
	 * against, and what `settle_live_redeem_payment` actually deposits. */
	proceeds: number;
	/** Gross close value before fees (the event's redeem_amount). */
	gross: number;
	/**
	 * Fee breakdown. `inventoryImpactRebate` is the path-independent
	 * inventory-impact rebate credited back on the close.
	 */
	fees: { trading: number; builder: number; penalty: number; inventoryImpactRebate: number };
	builderCodeId: string | null;
	raw: {
		quantityClosed: bigint;
		remaining: bigint;
		proceeds: bigint;
		gross: bigint;
		tradingFee: bigint;
		builderFee: bigint;
		penaltyFee: bigint;
		inventoryImpactRebate: bigint;
	};
}

export interface ClaimReceipt {
	marketId: string;
	accountId: string;
	owner: string;
	orderId: bigint;
	positionRootId: bigint;
	/** Quote units paid out. A settled claim closes the order in full. */
	payout: number;
	raw: { payout: bigint };
}

export interface CreateManagerReceipt {
	accountId: string;
	wrapperId: string;
	owner: string;
	selfOwned: boolean;
}

export interface BalanceChangeReceipt {
	accountId: string;
	coinType: string;
	/** Display value assuming a 6-decimal coin (quote + PLP both are). */
	amount: number;
	newBalance: number;
	raw: { amount: bigint; newBalance: bigint };
}

export interface PlpRequestReceipt {
	kind: 'supply' | 'withdraw';
	vaultId: string;
	accountId: string;
	recipient: string;
	/** Feed straight into cancelSupplyPlp / cancelWithdrawPlp. */
	index: bigint;
	/** Quote units for supply; PLP shares (6-dec) for withdraw. */
	amount: number;
	raw: { amount: bigint };
}

export interface PlpCancelReceipt {
	vaultId: string;
	accountId: string;
	recipient: string;
	index: bigint;
	isSupply: boolean;
	/** Refund returned to the account (quote for supply, PLP for withdraw). */
	amount: number;
	raw: { amount: bigint };
}

export interface BuilderCodeReceipt {
	accountId: string;
	owner: string;
	/** Null after unsetBuilderCode. */
	builderCodeId: string | null;
}

// --- decoders (plural = all matching events, in event order) ----------------

export function decodeMints(cfg: PredictConfig, result: DecodableTransactionResult): MintReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predictV1 ?? cfg.packages.predict,
		'order_events',
		'OrderMinted',
		orderEvents.OrderMinted,
	).map((e) => ({
		marketId: normalizeSuiAddress(e.expiry_market_id),
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		orderId: e.order_id,
		positionRootId: e.position_root_id,
		lowerTick: e.lower_tick,
		higherTick: e.higher_tick,
		entryProbability: fromRaw(e.entry_probability, 9),
		quantity: fromRaw(e.quantity, 6),
		premium: fromRaw(e.premium, 6),
		fees: {
			trading: fromRaw(e.trading_fee, 6),
			subsidy: fromRaw(e.fee_incentive_subsidy, 6),
			builder: fromRaw(e.builder_fee, 6),
			penalty: fromRaw(e.penalty_fee, 6),
			referral: fromRaw(e.referral_fee, 6),
			inventoryImpact: fromRaw(e.inventory_impact_charge, 6),
		},
		builderCodeId: optId(e.builder_code_id),
		raw: {
			quantity: e.quantity,
			premium: e.premium,
			tradingFee: e.trading_fee,
			feeIncentiveSubsidy: e.fee_incentive_subsidy,
			builderFee: e.builder_fee,
			penaltyFee: e.penalty_fee,
			referralFee: e.referral_fee,
			inventoryImpactCharge: e.inventory_impact_charge,
			entryProbability: e.entry_probability,
		},
	}));
}

export function decodeRedeems(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): RedeemReceipt[] {
	const pkg = cfg.packages.predictV1 ?? cfg.packages.predict;
	const live = decodeAll(
		result,
		pkg,
		'order_events',
		'LiveOrderRedeemed',
		orderEvents.LiveOrderRedeemed,
	).map((e): RedeemReceipt => ({
		marketId: normalizeSuiAddress(e.expiry_market_id),
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		orderId: e.order_id,
		positionRootId: e.position_root_id,
		quantityClosed: fromRaw(e.quantity_closed, 6),
		remaining: fromRaw(e.remaining_quantity, 6),
		replacementOrderId: e.replacement_order_id,
		// Mirrors the deployed close-side accounting exactly (the same expression
		// `min_proceeds` is asserted against): the net credited to the account is
		// redeem_amount PLUS the inventory-impact rebate, minus trading, builder and
		// penalty fees. The event's redeem_amount is GROSS.
		proceeds: fromRaw(
			e.redeem_amount + e.inventory_impact_rebate - e.trading_fee - e.builder_fee - e.penalty_fee,
			6,
		),
		gross: fromRaw(e.redeem_amount, 6),
		fees: {
			trading: fromRaw(e.trading_fee, 6),
			builder: fromRaw(e.builder_fee, 6),
			penalty: fromRaw(e.penalty_fee, 6),
			inventoryImpactRebate: fromRaw(e.inventory_impact_rebate, 6),
		},
		builderCodeId: optId(e.builder_code_id),
		raw: {
			quantityClosed: e.quantity_closed,
			remaining: e.remaining_quantity,
			proceeds:
				e.redeem_amount + e.inventory_impact_rebate - e.trading_fee - e.builder_fee - e.penalty_fee,
			gross: e.redeem_amount,
			tradingFee: e.trading_fee,
			builderFee: e.builder_fee,
			penaltyFee: e.penalty_fee,
			inventoryImpactRebate: e.inventory_impact_rebate,
		},
	}));
	return live;
}

export function decodeClaims(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): ClaimReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predictV1 ?? cfg.packages.predict,
		'order_events',
		'SettledOrderRedeemed',
		orderEvents.SettledOrderRedeemed,
	).map((e) => ({
		marketId: normalizeSuiAddress(e.expiry_market_id),
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		orderId: e.order_id,
		positionRootId: e.position_root_id,
		payout: fromRaw(e.payout_amount, 6),
		raw: { payout: e.payout_amount },
	}));
}

export function decodeAccountsCreated(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): CreateManagerReceipt[] {
	return decodeAll(
		result,
		cfg.packages.account,
		'account_events',
		'AccountCreated',
		accountEvents.AccountCreated,
	).map((e) => ({
		accountId: normalizeSuiAddress(e.account_id),
		wrapperId: normalizeSuiAddress(e.wrapper_id),
		owner: normalizeSuiAddress(e.owner),
		selfOwned: e.self_owned,
	}));
}

function decodeBalanceChanges(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
	name: 'Deposited' | 'Withdrawn',
): BalanceChangeReceipt[] {
	const layout = name === 'Deposited' ? accountEvents.Deposited : accountEvents.Withdrawn;
	return decodeAll(result, cfg.packages.account, 'account_events', name, layout).map((e) => ({
		accountId: normalizeSuiAddress(e.account_id),
		coinType: e.coin_type,
		amount: fromRaw(e.amount, 6),
		newBalance: fromRaw(e.new_balance, 6),
		raw: { amount: e.amount, newBalance: e.new_balance },
	}));
}

export const decodeDeposits = (
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): BalanceChangeReceipt[] => decodeBalanceChanges(cfg, result, 'Deposited');

export const decodeWithdrawals = (
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): BalanceChangeReceipt[] => decodeBalanceChanges(cfg, result, 'Withdrawn');

export function decodePlpRequests(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): PlpRequestReceipt[] {
	const pkg = cfg.packages.predictV1 ?? cfg.packages.predict;
	// Supply/WithdrawRequested differ only in their min-out field (unused here);
	// pick the fields both share so either generated struct's parse feeds `make`.
	type RequestedCommon = Pick<
		(typeof vaultEvents.SupplyRequested)['$inferType'],
		'pool_vault_id' | 'account_id' | 'recipient' | 'index' | 'amount'
	>;
	const make =
		(kind: 'supply' | 'withdraw') =>
		(e: RequestedCommon): PlpRequestReceipt => ({
			kind,
			vaultId: normalizeSuiAddress(e.pool_vault_id),
			accountId: normalizeSuiAddress(e.account_id),
			recipient: normalizeSuiAddress(e.recipient),
			index: e.index,
			amount: fromRaw(e.amount, 6),
			raw: { amount: e.amount },
		});
	return [
		...decodeAll(result, pkg, 'vault_events', 'SupplyRequested', vaultEvents.SupplyRequested).map(
			make('supply'),
		),
		...decodeAll(
			result,
			pkg,
			'vault_events',
			'WithdrawRequested',
			vaultEvents.WithdrawRequested,
		).map(make('withdraw')),
	];
}

export function decodePlpCancels(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): PlpCancelReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predictV1 ?? cfg.packages.predict,
		'vault_events',
		'RequestCancelled',
		vaultEvents.RequestCancelled,
	).map((e) => ({
		vaultId: normalizeSuiAddress(e.pool_vault_id),
		accountId: normalizeSuiAddress(e.account_id),
		recipient: normalizeSuiAddress(e.recipient),
		index: e.index,
		isSupply: e.is_supply,
		amount: fromRaw(e.amount, 6),
		raw: { amount: e.amount },
	}));
}

export function decodeBuilderCodeSets(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): BuilderCodeReceipt[] {
	return decodeAll(
		result,
		cfg.packages.predictV1 ?? cfg.packages.predict,
		'builder_code_events',
		'BuilderCodeSet',
		builderCodeEvents.BuilderCodeSet,
	).map((e) => ({
		accountId: normalizeSuiAddress(e.account_id),
		owner: normalizeSuiAddress(e.owner),
		builderCodeId: optId(e.builder_code_id),
	}));
}

// --- delayed execution (DBU-885) ---------------------------------------------
//
// Delayed execution spans two packages. The queue events and the desk's
// `DelayedExecutionPolicyUpdated` belong to the order-flow companion,
// `deepbook_predict_orders` (`queue_events`), typed by its ORIGINAL ID. A fill also emits
// Predict's `OrderMinted` or `LiveOrderRedeemed` (v1 layouts, `decodeMints`/`decodeRedeems`),
// so match events by type, never by the package a transaction called. The Predict events the
// delayed-execution upgrade added (`ExpiryPnlRealized`, `FlushOperatorUpdated`,
// `OrderFlowUpdated`) are typed by `packages.predictDelayedExecution`.

/**
 * The defining package of the Predict types and events the delayed-execution upgrade added.
 * Throws rather than guessing: matching against the latest package would silently decode nothing
 * once the package is upgraded again.
 */
export function delayedExecutionOrigin(cfg: PredictConfig): string {
	const pkg = cfg.packages.predictDelayedExecution;
	if (!pkg) {
		throw new PredictInputError(
			`delayed execution isn't recorded for ${cfg.network} in this SDK version: pass a ` +
				'`config` whose `packages.predictDelayedExecution` names the package that introduced it',
		);
	}
	return pkg;
}

/**
 * The original ID of the order-flow companion (`deepbook_predict_orders`), which types the queue
 * events. Throws while the config doesn't record the companion.
 */
export function predictOrdersOrigin(cfg: PredictConfig): string {
	const pkg = cfg.packages.predictOrdersV1 ?? cfg.packages.predictOrders;
	if (!pkg) {
		throw new PredictInputError(
			`the order-flow package isn't recorded for ${cfg.network} in this SDK version: pass a ` +
				'`config` whose `packages.predictOrders` names `deepbook_predict_orders`',
		);
	}
	return pkg;
}

function side(kind: number): 'mint' | 'sell' | 'unknown' {
	return isMintKind(kind) ? 'mint' : isSellKind(kind) ? 'sell' : 'unknown';
}

function heldPosition(p: {
	order_id: bigint;
	root_id: bigint;
	opened_at_ms: bigint;
}): HeldPosition | null {
	return p.order_id === 0n
		? null
		: { orderId: p.order_id, rootId: p.root_id, openedAtMs: p.opened_at_ms };
}

/** The market's cash figures after the call, as the queue events report them. */
export interface QueueCashFigures {
	marketCash: bigint;
	requiredCash: bigint;
	waitingCashNeed: bigint;
}

/** `OrderEnqueued`: the trader's own receipt for a queued mint or sell. Drives "Placed". */
export interface EnqueueReceipt {
	type: 'enqueued';
	marketId: string;
	/** The record ID: what `read.order`, `quoteSell` and `enqueueSell` take. Persist it. */
	recordId: bigint;
	accountId: string;
	kind: number;
	kindName: OrderKindName;
	side: 'mint' | 'sell' | 'unknown';
	request: {
		lowerTick: bigint;
		higherTick: bigint;
		quantity: bigint;
		maxPremium: bigint;
		minQuantity: bigint;
		maxCost: bigint;
		maxProbability: bigint;
		minProbability: bigint;
		minProceeds: bigint;
	};
	/** The position a sell moved into the record. Null for a mint. */
	position: HeldPosition | null;
	timing: {
		placedAtMs: bigint;
		earliestPriceMs: bigint;
		tauMs: bigint;
		deadlineMs: bigint;
		cutoffMs: bigint;
		pythChannel: number;
	};
	/** The Open record a sell took its position from. Null for a mint. */
	sourceRecordId: bigint | null;
	builderCodeId: string | null;
	referrerAccountId: string | null;
	/** USDC escrowed for the premium and fees (0 for a sell). */
	budget: number;
	orderFee: number;
	cash: QueueCashFigures;
	/** `onchain_timestamp_ms`: the placement transaction's clock. */
	timestampMs: bigint;
	raw: { budget: bigint; orderFee: bigint; cashNeed: bigint; subsidyBound: bigint };
	/** The volatility snapshot the fill prices with, as the generated layout parses it. */
	vol: (typeof queueEvents.OrderEnqueued)['$inferType']['vol'];
}

/** `CohortCommitted`: a price attached to the records `firstRecordId..=lastRecordId`. Drives "Priced". */
export interface CohortCommitReceipt {
	type: 'cohort-committed';
	marketId: string;
	tauMs: bigint;
	/** The update's envelope: τ, or the backup tick one channel tick later. */
	tickMs: bigint;
	firstRecordId: bigint;
	/** Inclusive. */
	lastRecordId: bigint;
	/** The committed price of the cohort's first order as a float: `spotRaw / 1e9`. */
	price: number;
	/** The committed price, normalized to 1e9. */
	spotRaw: bigint;
	/** That price's own update time, in µs. */
	generationUs: bigint;
	pythSourceId: number;
	pythChannel: number;
	/** Who committed: a keeper, or any third-party filler. */
	sender: string;
	/** `onchain_timestamp_ms`. */
	timestampMs: bigint;
}

/** `QueuedOrderFilled`. Report "Filled" only from this event (or the record). */
export interface QueuedFillReceipt {
	type: 'filled';
	marketId: string;
	recordId: bigint;
	accountId: string;
	kind: number;
	side: 'mint' | 'sell' | 'unknown';
	/** Filled quantity (mint) or closed quantity (sell). */
	quantity: number;
	/** Cost paid (mint) or proceeds before the order fee (sell). */
	amount: number;
	fees: {
		trading: number;
		builder: number;
		referral: number;
		order: number;
		subsidyUsed: number;
		inventoryImpact: number;
	};
	tauMs: bigint;
	tickMs: bigint;
	/** The record's position now: a mint's new position, a partial sell's remainder, or null. */
	position: HeldPosition | null;
	sender: string;
	timestampMs: bigint;
	cash: QueueCashFigures;
	raw: {
		quantity: bigint;
		amount: bigint;
		tradingFee: bigint;
		builderFee: bigint;
		referralFee: bigint;
		orderFee: bigint;
		subsidyUsed: bigint;
		inventoryImpact: bigint;
	};
}

/**
 * `QueuedOrderRefunded`, from whichever path refunded the order: resolve, a deadline refund, an
 * admin refund, or the settlement drain (`settle_step`, reason 5). `sender` is always the
 * transaction's sender.
 */
export interface QueuedRefundReceipt {
	type: 'refunded';
	marketId: string;
	recordId: bigint;
	accountId: string;
	kind: number;
	side: 'mint' | 'sell' | 'unknown';
	reason: RefundReasonInfo;
	escrowReturned: number;
	orderFeeReturned: number;
	subsidyReturned: number;
	/** True when a sell's record went back to Open holding its position. */
	positionReturned: boolean;
	sender: string;
	timestampMs: bigint;
	cash: QueueCashFigures;
	raw: { escrowReturned: bigint; orderFeeReturned: bigint; subsidyReturned: bigint };
}

/**
 * `OpenRecordSettled` (paid, 0 for a loser) or `OpenRecordPayoutSkipped` (stays Open, for a later
 * `pay_open`), from `settle_step`'s payout walk or `pay_open`.
 */
export interface OpenRecordPayoutReceipt {
	type: 'open-record-settled' | 'open-record-payout-skipped';
	marketId: string;
	recordId: bigint;
	accountId: string;
	orderId: bigint;
	payout: number;
	/** True for `OpenRecordPayoutSkipped`: the market couldn't pay it yet. */
	skipped: boolean;
	timestampMs: bigint;
	raw: { payout: bigint };
}

/** `MarketPayoutsCompleted`: the settlement payout walk is done. */
export interface MarketPayoutsCompletedReceipt {
	type: 'market-payouts-completed';
	marketId: string;
	timestampMs: bigint;
}

/**
 * `RecordFundsParked`: a record kept USDC it couldn't send to its receive address (on USDC's deny
 * list, or USDC paused). `RecordFundsClaimed`: `claim_parked` sent a record's parked funds.
 */
export interface RecordFundsReceipt {
	type: 'record-funds-parked' | 'record-funds-claimed';
	marketId: string;
	recordId: bigint;
	accountId: string;
	receiveAddress: string;
	/** Parked: this call's parked change or refund. Claimed: everything the record had parked. */
	amount: number;
	timestampMs: bigint;
	raw: { amount: bigint };
}

/** Queue housekeeping events, for ops and alerts. */
export type QueueOpsReceipt = {
	type: 'queued-orders-cleaned';
	marketId: string;
	recordIds: bigint[];
	timestampMs: bigint;
};

/** Delayed-execution admin events, for the multisig scripts and monitors. */
export type PolicyUpdateReceipt =
	| {
			/**
			 * The companion desk's `DelayedExecutionPolicyUpdated`, from every policy setter with the
			 * full post-state. The desk's `init` at publish emits none: the launch policy is only the
			 * desk's state.
			 */
			type: 'policy-updated';
			deskId: string;
			policy: DelayedExecutionPolicy;
			timestampMs: bigint;
	  }
	| { type: 'flush-operator-updated'; operator: string; added: boolean; timestampMs: bigint }
	| {
			/** Predict's `OrderFlowUpdated`: an order-flow witness allowlisted or removed. */
			type: 'order-flow-updated';
			/** The witness type, as Move's `type_name` renders it (no `0x` prefix). */
			orderFlow: string;
			enabled: boolean;
			timestampMs: bigint;
	  };

/** Every delayed-execution order event, tagged, in chain order. Feed it to `queue.reduceOrderEvents`. */
export type QueueEvent =
	| EnqueueReceipt
	| CohortCommitReceipt
	| QueuedFillReceipt
	| QueuedRefundReceipt
	| OpenRecordPayoutReceipt
	| MarketPayoutsCompletedReceipt
	| RecordFundsReceipt
	| QueueOpsReceipt;

const cashOf = (e: { market_cash: bigint; required_cash: bigint; waiting_cash_need: bigint }) => ({
	marketCash: e.market_cash,
	requiredCash: e.required_cash,
	waitingCashNeed: e.waiting_cash_need,
});

function enqueueReceipt(e: (typeof queueEvents.OrderEnqueued)['$inferType']): EnqueueReceipt {
	return {
		type: 'enqueued',
		marketId: normalizeSuiAddress(e.expiry_market_id),
		recordId: e.record_id,
		accountId: normalizeSuiAddress(e.account_id),
		kind: e.kind,
		kindName: orderKindName(e.kind),
		side: side(e.kind),
		request: {
			lowerTick: e.request.lower_tick,
			higherTick: e.request.higher_tick,
			quantity: e.request.quantity,
			maxPremium: e.request.max_premium,
			minQuantity: e.request.min_quantity,
			maxCost: e.request.max_cost,
			maxProbability: e.request.max_probability,
			minProbability: e.request.min_probability,
			minProceeds: e.request.min_proceeds,
		},
		position: heldPosition(e.position),
		timing: {
			placedAtMs: e.timing.placed_at_ms,
			earliestPriceMs: e.timing.earliest_price_ms,
			tauMs: e.timing.tau_ms,
			deadlineMs: e.timing.deadline_ms,
			cutoffMs: e.timing.cutoff_ms,
			pythChannel: e.timing.pyth_channel,
		},
		sourceRecordId: e.source_record_id ?? null,
		builderCodeId: optId(e.builder_code_id),
		referrerAccountId: optId(e.referrer_account_id),
		budget: fromRaw(e.budget, 6),
		orderFee: fromRaw(e.order_fee, 6),
		cash: cashOf(e),
		timestampMs: e.onchain_timestamp_ms,
		raw: {
			budget: e.budget,
			orderFee: e.order_fee,
			cashNeed: e.cash_need,
			subsidyBound: e.subsidy_bound,
		},
		vol: e.vol,
	};
}

function cohortCommitReceipt(
	e: (typeof queueEvents.CohortCommitted)['$inferType'],
): CohortCommitReceipt {
	return {
		type: 'cohort-committed',
		marketId: normalizeSuiAddress(e.expiry_market_id),
		tauMs: e.tau_ms,
		tickMs: e.tick_ms,
		firstRecordId: e.first_record_id,
		lastRecordId: e.last_record_id,
		price: fromRaw(e.spot, 9),
		spotRaw: e.spot,
		generationUs: e.generation_us,
		pythSourceId: e.pyth_source_id,
		pythChannel: e.pyth_channel,
		sender: normalizeSuiAddress(e.sender),
		timestampMs: e.onchain_timestamp_ms,
	};
}

function fillReceipt(e: (typeof queueEvents.QueuedOrderFilled)['$inferType']): QueuedFillReceipt {
	return {
		type: 'filled',
		marketId: normalizeSuiAddress(e.expiry_market_id),
		recordId: e.record_id,
		accountId: normalizeSuiAddress(e.account_id),
		kind: e.kind,
		side: side(e.kind),
		quantity: fromRaw(e.quantity, 6),
		amount: fromRaw(e.amount, 6),
		fees: {
			trading: fromRaw(e.trading_fee, 6),
			builder: fromRaw(e.builder_fee, 6),
			referral: fromRaw(e.referral_fee, 6),
			order: fromRaw(e.order_fee, 6),
			subsidyUsed: fromRaw(e.subsidy_used, 6),
			inventoryImpact: fromRaw(e.inventory_impact, 6),
		},
		tauMs: e.tau_ms,
		tickMs: e.tick_ms,
		position: heldPosition(e.position),
		sender: normalizeSuiAddress(e.sender),
		timestampMs: e.onchain_timestamp_ms,
		cash: cashOf(e),
		raw: {
			quantity: e.quantity,
			amount: e.amount,
			tradingFee: e.trading_fee,
			builderFee: e.builder_fee,
			referralFee: e.referral_fee,
			orderFee: e.order_fee,
			subsidyUsed: e.subsidy_used,
			inventoryImpact: e.inventory_impact,
		},
	};
}

function refundReceipt(
	e: (typeof queueEvents.QueuedOrderRefunded)['$inferType'],
): QueuedRefundReceipt {
	return {
		type: 'refunded',
		marketId: normalizeSuiAddress(e.expiry_market_id),
		recordId: e.record_id,
		accountId: normalizeSuiAddress(e.account_id),
		kind: e.kind,
		side: side(e.kind),
		reason: refundReason(e.reason),
		escrowReturned: fromRaw(e.escrow_returned, 6),
		orderFeeReturned: fromRaw(e.order_fee_returned, 6),
		subsidyReturned: fromRaw(e.subsidy_returned, 6),
		positionReturned: e.position_returned,
		sender: normalizeSuiAddress(e.sender),
		timestampMs: e.onchain_timestamp_ms,
		cash: cashOf(e),
		raw: {
			escrowReturned: e.escrow_returned,
			orderFeeReturned: e.order_fee_returned,
			subsidyReturned: e.subsidy_returned,
		},
	};
}

function payoutReceipt(
	skipped: boolean,
): (e: (typeof queueEvents.OpenRecordSettled)['$inferType']) => OpenRecordPayoutReceipt {
	return (e) => ({
		type: skipped ? 'open-record-payout-skipped' : 'open-record-settled',
		marketId: normalizeSuiAddress(e.expiry_market_id),
		recordId: e.record_id,
		accountId: normalizeSuiAddress(e.account_id),
		orderId: e.order_id,
		payout: fromRaw(e.payout, 6),
		skipped,
		timestampMs: e.onchain_timestamp_ms,
		raw: { payout: e.payout },
	});
}

function recordFundsReceipt(
	type: RecordFundsReceipt['type'],
): (e: (typeof queueEvents.RecordFundsParked)['$inferType']) => RecordFundsReceipt {
	return (e) => ({
		type,
		marketId: normalizeSuiAddress(e.expiry_market_id),
		recordId: e.record_id,
		accountId: normalizeSuiAddress(e.account_id),
		receiveAddress: normalizeSuiAddress(e.receive_address),
		amount: fromRaw(e.amount, 6),
		timestampMs: e.onchain_timestamp_ms,
		raw: { amount: e.amount },
	});
}

// Each order event the queue emits: its struct name, generated layout and receipt mapping.
// One table drives both the per-type decoders and `decodeQueueEvents`, so they can't disagree.
const QUEUE_EVENT_DECODERS: readonly {
	name: string;
	layout: { parse(bytes: Uint8Array): unknown };
	map: (e: never) => QueueEvent;
}[] = [
	{ name: 'OrderEnqueued', layout: queueEvents.OrderEnqueued, map: enqueueReceipt },
	{ name: 'CohortCommitted', layout: queueEvents.CohortCommitted, map: cohortCommitReceipt },
	{ name: 'QueuedOrderFilled', layout: queueEvents.QueuedOrderFilled, map: fillReceipt },
	{ name: 'QueuedOrderRefunded', layout: queueEvents.QueuedOrderRefunded, map: refundReceipt },
	{ name: 'OpenRecordSettled', layout: queueEvents.OpenRecordSettled, map: payoutReceipt(false) },
	{
		name: 'OpenRecordPayoutSkipped',
		layout: queueEvents.OpenRecordPayoutSkipped,
		map: payoutReceipt(true),
	},
	{
		name: 'MarketPayoutsCompleted',
		layout: queueEvents.MarketPayoutsCompleted,
		map: (e: (typeof queueEvents.MarketPayoutsCompleted)['$inferType']) => ({
			type: 'market-payouts-completed',
			marketId: normalizeSuiAddress(e.expiry_market_id),
			timestampMs: e.onchain_timestamp_ms,
		}),
	},
	{
		name: 'RecordFundsParked',
		layout: queueEvents.RecordFundsParked,
		map: recordFundsReceipt('record-funds-parked'),
	},
	{
		name: 'RecordFundsClaimed',
		layout: queueEvents.RecordFundsClaimed,
		map: recordFundsReceipt('record-funds-claimed'),
	},
	{
		name: 'QueuedOrdersCleaned',
		layout: queueEvents.QueuedOrdersCleaned,
		map: (e: (typeof queueEvents.QueuedOrdersCleaned)['$inferType']) => ({
			type: 'queued-orders-cleaned',
			marketId: normalizeSuiAddress(e.expiry_market_id),
			recordIds: [...e.record_ids],
			timestampMs: e.onchain_timestamp_ms,
		}),
	},
];

function eventPayload(e: DecodableEvent, module: string, name: string): Uint8Array {
	const bytes = eventBytes(e);
	if (!bytes) {
		throw new PredictInputError(
			`${module}::${name} event has no BCS payload — execute/simulate with events included`,
		);
	}
	return bytes;
}

/**
 * Every delayed-execution order event in a result, tagged with `type`, in event order: the
 * companion's `queue_events`, matched against its original ID. The app's single entry point for
 * the queue: pass the list to `queue.reduceOrderEvents`.
 */
export function decodeQueueEvents(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): QueueEvent[] {
	const pkg = predictOrdersOrigin(cfg);
	const out: QueueEvent[] = [];
	for (const e of result.events ?? []) {
		for (const d of QUEUE_EVENT_DECODERS) {
			if (!matches(e, pkg, 'queue_events', d.name)) continue;
			out.push(d.map(d.layout.parse(eventPayload(e, 'queue_events', d.name)) as never));
			break;
		}
	}
	return out;
}

function ofType<T extends QueueEvent['type']>(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
	...types: T[]
): Extract<QueueEvent, { type: T }>[] {
	return decodeQueueEvents(cfg, result).filter((e): e is Extract<QueueEvent, { type: T }> =>
		(types as string[]).includes(e.type),
	);
}

export const decodeEnqueues = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'enqueued');
export const decodeCohortCommits = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'cohort-committed');
export const decodeQueuedFills = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'filled');
export const decodeQueuedRefunds = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'refunded');
export const decodeOpenRecordPayouts = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'open-record-settled', 'open-record-payout-skipped');
export const decodeMarketPayoutsCompleted = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'market-payouts-completed');
export const decodeRecordFunds = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'record-funds-parked', 'record-funds-claimed');
export const decodeQueueOps = (cfg: PredictConfig, r: DecodableTransactionResult) =>
	ofType(cfg, r, 'queued-orders-cleaned');

/**
 * The delayed-execution admin events, in event order: the companion desk's
 * `DelayedExecutionPolicyUpdated` (matched against the companion's original ID) and Predict's
 * `FlushOperatorUpdated` and `OrderFlowUpdated` (matched against `predictDelayedExecution`).
 * Throws while the config records neither package.
 */
export function decodePolicyUpdates(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): PolicyUpdateReceipt[] {
	const orders = predictOrdersOrigin(cfg);
	const predict = delayedExecutionOrigin(cfg);
	const out: PolicyUpdateReceipt[] = [];
	for (const e of result.events ?? []) {
		if (matches(e, orders, 'queue_events', 'DelayedExecutionPolicyUpdated')) {
			const p = queueEvents.DelayedExecutionPolicyUpdated.parse(
				eventPayload(e, 'queue_events', 'DelayedExecutionPolicyUpdated'),
			);
			out.push({
				type: 'policy-updated',
				deskId: normalizeSuiAddress(p.desk_id),
				policy: policyFromBcs(p.policy),
				timestampMs: p.onchain_timestamp_ms,
			});
		} else if (matches(e, predict, 'config_events', 'FlushOperatorUpdated')) {
			const f = configEvents.FlushOperatorUpdated.parse(
				eventPayload(e, 'config_events', 'FlushOperatorUpdated'),
			);
			out.push({
				type: 'flush-operator-updated',
				operator: normalizeSuiAddress(f.operator),
				added: f.added,
				timestampMs: f.onchain_timestamp_ms,
			});
		} else if (matches(e, predict, 'config_events', 'OrderFlowUpdated')) {
			const o = configEvents.OrderFlowUpdated.parse(
				eventPayload(e, 'config_events', 'OrderFlowUpdated'),
			);
			out.push({
				type: 'order-flow-updated',
				orderFlow: o.order_flow.name,
				enabled: o.enabled,
				timestampMs: o.onchain_timestamp_ms,
			});
		}
	}
	return out;
}

/**
 * `vault_events::ExpiryPnlRealized`: the change in the pool's gross realized result on one expiry
 * since that expiry's previous emission, emitted with every `ExpiryPnl`. An expiry's first
 * emission (its first settled sweep) carries the lifetime result, which can be a loss. A later
 * one carries the extra cash a later sweep returned, always a profit. Gross: before the
 * protocol/LP split, and including the sponsor fee subsidies mints moved into expiry cash.
 */
export interface ExpiryPnlRealizedReceipt {
	vaultId: string;
	marketId: string;
	propbookUnderlyingId: number;
	expiryMs: bigint;
	/** The settlement price, 1e9-scaled. */
	settlementPriceRaw: bigint;
	/** False only for a loss, which only an expiry's first emission reports. */
	inProfit: boolean;
	/** The change's magnitude, in USDC. */
	amount: number;
	/** The change with its sign: `+amount` for a profit, `−amount` for a loss. */
	signedAmountRaw: bigint;
	raw: { amount: bigint };
}

/** Every `ExpiryPnlRealized` in a result, in event order. Introduced with delayed execution. */
export function decodeExpiryPnlRealized(
	cfg: PredictConfig,
	result: DecodableTransactionResult,
): ExpiryPnlRealizedReceipt[] {
	return decodeAll(
		result,
		delayedExecutionOrigin(cfg),
		'vault_events',
		'ExpiryPnlRealized',
		vaultEvents.ExpiryPnlRealized,
	).map((e) => ({
		vaultId: normalizeSuiAddress(e.pool_vault_id),
		marketId: normalizeSuiAddress(e.expiry_market_id),
		propbookUnderlyingId: e.propbook_underlying_id,
		expiryMs: e.expiry,
		settlementPriceRaw: e.settlement_price,
		inProfit: e.in_profit,
		amount: fromRaw(e.amount, 6),
		signedAmountRaw: e.in_profit ? e.amount : -e.amount,
		raw: { amount: e.amount },
	}));
}

/**
 * The pool's gross realized P&L in raw USDC: the signed sum of `ExpiryPnlRealized` changes. Over
 * every emission of every expiry it equals the sum of each expiry's latest `ExpiryPnl`, with no
 * per-expiry dedup. Subtract the `OrderMinted.fee_incentive_subsidy` totals to isolate the
 * trading result.
 */
export function realizedPnlRaw(
	receipts: readonly Pick<ExpiryPnlRealizedReceipt, 'signedAmountRaw'>[],
): bigint {
	return receipts.reduce((sum, r) => sum + r.signedAmountRaw, 0n);
}

export { exactlyOne };
