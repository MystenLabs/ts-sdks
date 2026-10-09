// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): chain reads for the order queue. A market's queue is a
// `MarketQueue` in the order-flow companion (`deepbook_predict_orders`), at an ID derived from the
// companion's `OrderDesk` and the market, so these reads take `OrdersGeneratedConfig` and the
// facade gates them on the config recording the companion. The market's cash figures stay
// Predict reads. A market whose queue doesn't exist yet can't be read: the facade checks that
// first.
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
import { Transaction, type TransactionResult } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { GeneratedConfig, OrdersGeneratedConfig } from '../config/generated.js';
import {
	DELAYED_EXECUTION_VERSION,
	policyFromBcs,
	type DelayedExecutionPolicy,
	type QueueHeads,
	type QueuedOrder,
} from '../queue.js';
import { deriveAccountIdFrom, deriveAccountWrapperIdFrom } from '../tx/common.js';
import { queueIdOf, type QueueTarget } from '../tx/queue.js';
import { loadLivePricer, type MarketFeeds } from '../tx/trade.js';
import { accountMoveCalls as account } from '../../account.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import * as protocolConfig from '../../contracts/deepbook_predict/protocol_config.js';
import { DelayedExecutionPolicy as DelayedExecutionPolicyBcs } from '../../contracts/deepbook_predict_orders/delayed_execution_config.js';
import * as desk from '../../contracts/deepbook_predict_orders/desk.js';
import { OrderView as OrderViewBcs } from '../../contracts/deepbook_predict_orders/order_queue.js';
import * as queue from '../../contracts/deepbook_predict_orders/queue.js';
import { inspectReturns, type ReadClient } from './inspect.js';
import { parseOptionalU64, parseU64LE } from './parse.js';

const parseBool = (bytes: Uint8Array): boolean => (bytes[0] ?? 0) !== 0;
const OptionalOrderView = bcs.option(OrderViewBcs);

/** The companion's `order_flow::OrderFlow` witness type, which Predict's allowlist names. */
export function orderFlowWitnessType(
	config: Pick<OrdersGeneratedConfig, 'predictOrdersPackageIdV1'>,
) {
	return `${config.predictOrdersPackageIdV1}::order_flow::OrderFlow`;
}

/** Everything the queued-order preflight and the app's queue view read, from one simulate. */
export interface MarketQueueState {
	marketId: string;
	/** The market's `MarketQueue`. */
	queueId: string;
	expiryMs: bigint;
	mintPaused: boolean;
	cashBalance: bigint;
	requiredCash: bigint;
	/**
	 * Cash above required cash, 0 when below: the largest cash need a new queued mint may have
	 * now (Predict's admission refuses a larger one).
	 */
	spareCash: bigint;
	/** Summed cash need of the admitted orders; `rebalance_expiry_cash` funds it. */
	waitingCashNeed: bigint;
	/** 1e9-scaled. The mint cash-need formulas take it. */
	minEntryProbability: bigint;
	/** 1e9-scaled λ. The sell cash-need formula takes it. */
	backingBufferLambda: bigint;
	/** Sizes a filler's resolve batch. */
	payoutTreeNodeCount: bigint;
	/** `queue_stuck`: enqueue would refuse as stuck right now ("pricing delayed"). */
	stuck: boolean;
	cohorts: {
		count: bigint;
		oldestUncommittedTauMs: bigint | null;
		/** The cohort the stuck gate's first rule watches. */
		oldestUncommittedTauAboveCommittedMs: bigint | null;
	};
	heads: QueueHeads;
	/** Unfinished mints and sells, against the policy capacities. */
	pending: { mints: bigint; sells: bigint };
	/**
	 * The settlement payout walk (`settle_step`): it resumes at `cursor`, and `completed` is set
	 * by the call that emits `MarketPayoutsCompleted`.
	 */
	payout: { cursor: bigint; nextId: bigint; completed: boolean };
	/** The companion's `OrderDesk`: the policy every queue runs under, and its version floor. */
	desk: {
		id: string;
		policy: DelayedExecutionPolicy;
		versionWatermark: bigint;
	};
	protocol: {
		noTradeWindowMs: bigint;
		/** The admin-set mint fee subsidy rate, 1e9-scaled (20% when unset). */
		feeIncentiveSubsidyRate: bigint;
		tradingPaused: boolean;
		frozen: boolean;
		/** Predict's version floor. Enqueue needs it at `DELAYED_EXECUTION_VERSION`. */
		versionWatermark: bigint;
		/**
		 * Whether Predict allowlists this companion's `OrderFlow` witness
		 * (`protocol_config::set_order_flow`). Predict's admission, commit and fill refuse it until
		 * then (`EOrderFlowNotAllowed`).
		 */
		orderFlowEnabled: boolean;
	};
	/** Present when an owner was given. */
	account: {
		accountId: string;
		/**
		 * Unfinished orders the account holds in this market, against `per_account_cap`. Stale
		 * after expiry: the settlement drain refunds without lowering it.
		 */
		waitingOrders: bigint;
		/** `account::balance<USDC>`, unsettled accumulator funds included. */
		availableRaw: bigint;
	} | null;
	/** One entry per requested record ID: the record, or `null` when missing or deleted. */
	records: (QueuedOrder | null)[];
}

/**
 * Read a market's queue state in one simulate: Predict's cash figures and gates, the queue's
 * stuck gate, cohorts, heads and counters, and the desk's policy. With `owner`, also the
 * account's waiting-order count and USDC balance (the owner must have an account: loading a
 * missing wrapper aborts the read). With `recordIds`, also those records. The queue must exist.
 */
export async function marketQueueState(
	client: ReadClient,
	config: OrdersGeneratedConfig,
	marketId: string,
	opts: {
		owner?: string;
		quoteCoinType?: string;
		recordIds?: readonly bigint[];
		queueId?: string;
	} = {},
): Promise<MarketQueueState> {
	const queueId = queueIdOf(config, { expiryMarketId: marketId, queueId: opts.queueId });
	const tx = new Transaction();
	let next = 0;
	const results: TransactionResult[] = [];
	const add = (command: (tx: Transaction) => TransactionResult): number => {
		results.push(tx.add(command));
		return next++;
	};
	const market = { market: marketId };
	const onQueue = { queue: queueId };
	const i = {
		expiry: add(expiryMarket.expiry({ config, arguments: market })),
		mintPaused: add(expiryMarket.mintPaused({ config, arguments: market })),
		cashBalance: add(expiryMarket.cashBalance({ config, arguments: market })),
		requiredCash: add(expiryMarket.requiredCash({ config, arguments: market })),
		backingBufferLambda: add(expiryMarket.backingBufferLambda({ config, arguments: market })),
		orderFlow: add(expiryMarket.orderFlowState({ config, arguments: market })),
		stuck: add(queue.queueStuck({ config, arguments: onQueue })),
		cohorts: add(queue.waitingCohorts({ config, arguments: onQueue })),
		heads: add(queue.queueHeads({ config, arguments: onQueue })),
		pending: add(queue.pendingCounts({ config, arguments: onQueue })),
		payout: add(queue.payoutProgress({ config, arguments: onQueue })),
		policy: add(desk.policy({ config })),
		deskWatermark: add(desk.versionWatermark({ config })),
		noTradeWindowMs: add(protocolConfig.noTradeWindowMs({ config })),
		subsidyRate: add(protocolConfig.feeIncentiveSubsidyRate({ config })),
		tradingPaused: add(protocolConfig.tradingPaused({ config })),
		frozen: add(protocolConfig.frozen({ config })),
		watermark: add(protocolConfig.versionWatermark({ config })),
		orderFlowEnabled: add(
			protocolConfig.isOrderFlow({ config, typeArguments: [orderFlowWitnessType(config)] }),
		),
	};
	let accountIdx: { waiting: number; balance: number; accountId: string } | null = null;
	if (opts.owner) {
		if (!opts.quoteCoinType) throw new Error('marketQueueState: owner reads need quoteCoinType');
		const accountId = deriveAccountIdFrom(config, opts.owner);
		const waiting = add(queue.waitingOrders({ config, arguments: { ...onQueue, accountId } }));
		const loaded = add(
			account.loadAccount({
				config,
				arguments: { self: deriveAccountWrapperIdFrom(config, opts.owner) },
			}),
		);
		const balance = add(
			account.balance({
				config,
				typeArguments: [opts.quoteCoinType],
				arguments: { self: results[loaded] },
			}),
		);
		accountIdx = { waiting, balance, accountId };
	}
	const recordIdx = (opts.recordIds ?? []).map((recordId) =>
		add(queue.order({ config, arguments: { ...onQueue, recordId } })),
	);

	const cmds = await inspectReturns(client, tx);
	const u64 = (idx: number, value = 0) => parseU64LE(cmds[idx][value]);
	const cashBalance = u64(i.cashBalance);
	const requiredCash = u64(i.requiredCash);
	return {
		marketId: normalizeSuiAddress(marketId),
		queueId: normalizeSuiAddress(queueId),
		expiryMs: u64(i.expiry),
		mintPaused: parseBool(cmds[i.mintPaused][0]),
		cashBalance,
		requiredCash,
		spareCash: cashBalance > requiredCash ? cashBalance - requiredCash : 0n,
		waitingCashNeed: u64(i.orderFlow, 0),
		payoutTreeNodeCount: u64(i.orderFlow, 1),
		minEntryProbability: u64(i.orderFlow, 2),
		backingBufferLambda: u64(i.backingBufferLambda),
		stuck: parseBool(cmds[i.stuck][0]),
		cohorts: {
			count: u64(i.cohorts, 0),
			oldestUncommittedTauMs: parseOptionalU64(cmds[i.cohorts][1]),
			oldestUncommittedTauAboveCommittedMs: parseOptionalU64(cmds[i.cohorts][2]),
		},
		heads: {
			resolveHead: u64(i.heads, 0),
			nextId: u64(i.heads, 1),
			lastTauMs: u64(i.heads, 2),
			lastCommittedTauMs: u64(i.heads, 3),
		},
		pending: { mints: u64(i.pending, 0), sells: u64(i.pending, 1) },
		payout: {
			cursor: u64(i.payout, 0),
			nextId: u64(i.payout, 1),
			completed: parseBool(cmds[i.payout][2]),
		},
		desk: {
			id: normalizeSuiAddress(config.orderDesk),
			policy: policyFromBcs(DelayedExecutionPolicyBcs.parse(cmds[i.policy][0])),
			versionWatermark: u64(i.deskWatermark),
		},
		protocol: {
			noTradeWindowMs: u64(i.noTradeWindowMs),
			feeIncentiveSubsidyRate: u64(i.subsidyRate),
			tradingPaused: parseBool(cmds[i.tradingPaused][0]),
			frozen: parseBool(cmds[i.frozen][0]),
			versionWatermark: u64(i.watermark),
			orderFlowEnabled: parseBool(cmds[i.orderFlowEnabled][0]),
		},
		account: accountIdx
			? {
					accountId: accountIdx.accountId,
					waitingOrders: u64(accountIdx.waiting),
					availableRaw: u64(accountIdx.balance),
				}
			: null,
		records: recordIdx.map((idx) => OptionalOrderView.parse(cmds[idx][0]) ?? null),
	};
}

/** Queue records by record ID (`queue::order`), `null` for a missing or cleaned-up one. One simulate. */
export async function queuedOrders(
	client: ReadClient,
	config: OrdersGeneratedConfig,
	target: QueueTarget,
	recordIds: readonly bigint[],
): Promise<(QueuedOrder | null)[]> {
	if (recordIds.length === 0) return [];
	const queueId = queueIdOf(config, target);
	const tx = new Transaction();
	for (const recordId of recordIds) {
		tx.add(queue.order({ config, arguments: { queue: queueId, recordId } }));
	}
	const cmds = await inspectReturns(client, tx);
	return cmds.map((rv) => OptionalOrderView.parse(rv[0]) ?? null);
}

/**
 * `ProtocolConfig.version_watermark`, read from the object's own BCS rather than a getter, so it
 * works against any package version: the getter only exists from the delayed-execution package
 * on, while the struct layout is frozen since v1.
 */
export async function versionWatermark(
	client: ClientWithCoreApi,
	protocolConfigId: string,
): Promise<bigint> {
	const { object } = await client.core.getObject({
		objectId: protocolConfigId,
		include: { content: true },
	});
	if (!object.content) throw new Error(`ProtocolConfig ${protocolConfigId} returned no content`);
	return protocolConfig.ProtocolConfig.parse(object.content).version_watermark;
}

/**
 * Which trade path a network is on:
 * - `'immediate'`: the watermark isn't raised and this SDK has no delayed-execution record, so
 *   its call target is a pre-v4 Predict package. Use the immediate `mint*` / `redeem` builders.
 * - `'awaiting-cutover'`: the config records delayed execution but the watermark isn't raised.
 *   Nothing trades: enqueue aborts `ECutoverNotReached`, and the immediate builders abort in the
 *   v4 package the config calls (`EDelayedExecutionRequired`). Trading stays paused through the
 *   cutover.
 * - `'delayed'`: the watermark is raised. Use the `enqueue*` builders; the immediate ones abort
 *   `EDelayedExecutionRequired`.
 * - `'unsupported'`: the watermark is raised but this SDK's config has no delayed-execution
 *   record for the network. Upgrade the SDK, or pass a config that records it.
 */
export type ExecutionMode = 'immediate' | 'awaiting-cutover' | 'delayed' | 'unsupported';

/**
 * The {@link ExecutionMode} for a watermark and what the config records.
 * `recordsDelayedExecution`: the Predict upgrade, the order-flow companion and its desk, which
 * queued orders need. `recordsPredictUpgrade`: the Predict upgrade alone
 * (`packages.predictDelayedExecution`), which makes the config's Predict call target the package
 * that retired the immediate trades. It defaults to `recordsDelayedExecution`.
 */
export function executionModeFor(
	watermark: bigint,
	recordsDelayedExecution: boolean,
	recordsPredictUpgrade: boolean = recordsDelayedExecution,
): ExecutionMode {
	if (watermark >= DELAYED_EXECUTION_VERSION) {
		return recordsDelayedExecution ? 'delayed' : 'unsupported';
	}
	return recordsDelayedExecution || recordsPredictUpgrade ? 'awaiting-cutover' : 'immediate';
}

/**
 * USDC sent to an account's wrapper address with `send_funds` that the account hasn't settled
 * yet: refunds, sell proceeds and settled payouts land here. `account::balance` already counts
 * them, so this is for display ("pending funds"), not for sizing.
 */
export async function pendingFunds(
	client: ClientWithCoreApi,
	wrapperId: string,
	coinType: string,
): Promise<bigint> {
	const { balance } = await client.core.getBalance({ owner: wrapperId, coinType });
	return BigInt(balance.addressBalance);
}

// The prefix of `pyth_lazer::state::State` up to the upgrade cap, identical in the testnet and
// mainnet vendored sources. Parsing a prefix ignores the trailing `governance` field.
const LazerStatePrefix = bcs.struct('State', {
	id: bcs.Address,
	trusted_signers: bcs.vector(
		bcs.struct('TrustedSignerInfo', { public_key: bcs.vector(bcs.u8()), expires_at: bcs.u64() }),
	),
	upgrade_cap: bcs.struct('UpgradeCap', {
		id: bcs.Address,
		package: bcs.Address,
		version: bcs.u64(),
		policy: bcs.u8(),
	}),
});

/**
 * The current Pyth Lazer package (from `State.upgrade_cap.package`) and the original ID that
 * types `update::Update` (from the State's own type). Read it per filler batch and never cache
 * it: a Lazer upgrade retires the old package at once.
 */
export async function lazerPackages(
	client: ClientWithCoreApi,
	stateId: string,
): Promise<{ stateId: string; packageId: string; originalId: string }> {
	const { object } = await client.core.getObject({ objectId: stateId, include: { content: true } });
	if (!object.content) throw new Error(`Lazer State ${stateId} returned no content`);
	const [originalId, module, name] = object.type.split('::');
	if (module !== 'state' || name !== 'State') {
		throw new Error(`${stateId} is a ${object.type}, not a Pyth Lazer State`);
	}
	return {
		stateId: normalizeSuiAddress(stateId),
		packageId: normalizeSuiAddress(LazerStatePrefix.parse(object.content).upgrade_cap.package),
		originalId: normalizeSuiAddress(originalId),
	};
}

/** `expiry_market::RedeemQuote` with camelCase keys. `proceeds` is before the order fee. */
export interface RedeemOpenQuoteRaw {
	closeQuantity: bigint;
	probability: bigint;
	proceeds: bigint;
	tradingFee: bigint;
	builderFee: bigint;
	inventoryImpactRebate: bigint;
}

/**
 * Quote an early sell of an Open record at a fresh live pricer (`load_live_pricer`, then the
 * queue's `quote_redeem_open`, which prices through Predict's `quote_close`), and read the desk's
 * policy for the order fee. `proceeds` is before the order fee, with no congestion penalty.
 * Aborts `ERecordNotOpen` when the record isn't Open. It doesn't check that the wrapper's account
 * owns the record: the wrapper only supplies the builder code.
 */
export async function quoteRedeemOpen(
	client: ReadClient,
	config: OrdersGeneratedConfig,
	args: QueueTarget & {
		wrapperId: string;
		recordId: bigint;
		closeQuantityRaw: bigint;
	} & MarketFeeds,
): Promise<{ quote: RedeemOpenQuoteRaw; policy: DelayedExecutionPolicy }> {
	const tx = new Transaction();
	const pricer = tx.add(loadLivePricer(config, args));
	tx.add(
		queue.quoteRedeemOpen({
			config,
			arguments: {
				queue: queueIdOf(config, args),
				market: args.expiryMarketId,
				wrapper: args.wrapperId,
				pricer,
				recordId: args.recordId,
				closeQuantity: args.closeQuantityRaw,
			},
		}),
	);
	tx.add(desk.policy({ config }));
	const cmds = await inspectReturns(client, tx);
	const q = expiryMarket.RedeemQuote.parse(cmds[1][0]);
	return {
		quote: {
			closeQuantity: q.close_quantity,
			probability: q.probability,
			proceeds: q.proceeds,
			tradingFee: q.trading_fee,
			builderFee: q.builder_fee,
			inventoryImpactRebate: q.inventory_impact_rebate,
		},
		policy: policyFromBcs(DelayedExecutionPolicyBcs.parse(cmds[2][0])),
	};
}

/**
 * `expiry_market::MintQuote` with camelCase keys. `allInCost` includes `penaltyFee`, which the
 * delayed-execution package always quotes as 0: its quotes price like a queued fill.
 */
export interface MintQuoteRaw {
	quantity: bigint;
	entryProbability: bigint;
	premium: bigint;
	tradingFee: bigint;
	feeIncentiveSubsidy: bigint;
	builderFee: bigint;
	penaltyFee: bigint;
	inventoryImpactCharge: bigint;
	allInCost: bigint;
}

/** What to quote: an exact quantity, a premium budget, or an all-in budget. */
export type MintQuoteRequest =
	| { shape: 'exact-quantity'; quantityRaw: bigint }
	| { shape: 'exact-amount'; maxPremiumRaw: bigint; minQuantityRaw: bigint }
	| { shape: 'exact-cost'; maxCostRaw: bigint; minQuantityRaw: bigint };

/**
 * Quote a mint for one account without placing it: Predict's `quote_mint_for_account` (exact
 * quantity and premium budget) or `quote_mint_exact_cost_for_account` (all-in budget), at a fresh
 * live pricer. Both read the account's builder code and cap a budget at its balance. From the
 * delayed-execution package on they price like a queued fill at the clock: no congestion penalty,
 * and no trade-window or Pyth-staleness abort. They abort `EOrderFailsLimits` when the mint would
 * be refused at the clock. With `ordersConfig`, also reads the order desk's policy.
 */
export async function quoteMintForAccount(
	client: ReadClient,
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		lowerTick: bigint;
		higherTick: bigint;
		request: MintQuoteRequest;
		/** Also read the order desk's policy, in the same simulate. */
		ordersConfig?: OrdersGeneratedConfig;
	} & MarketFeeds,
): Promise<{ quote: MintQuoteRaw; policy: DelayedExecutionPolicy | null }> {
	const tx = new Transaction();
	const pricer = tx.add(loadLivePricer(config, args));
	const base = {
		market: args.expiryMarketId,
		wrapper: args.wrapperId,
		pricer,
		lowerTick: args.lowerTick,
		higherTick: args.higherTick,
	};
	const r = args.request;
	if (r.shape === 'exact-cost') {
		tx.add(
			expiryMarket.quoteMintExactCostForAccount({
				config,
				arguments: { ...base, maxCost: r.maxCostRaw, minQuantity: r.minQuantityRaw },
			}),
		);
	} else {
		tx.add(
			expiryMarket.quoteMintForAccount({
				config,
				arguments:
					r.shape === 'exact-quantity'
						? { ...base, maxPremium: 0n, minQuantity: r.quantityRaw, exactQuantity: true }
						: {
								...base,
								maxPremium: r.maxPremiumRaw,
								minQuantity: r.minQuantityRaw,
								exactQuantity: false,
							},
			}),
		);
	}
	if (args.ordersConfig) tx.add(desk.policy({ config: args.ordersConfig }));
	const cmds = await inspectReturns(client, tx);
	const q = expiryMarket.MintQuote.parse(cmds[1][0]);
	const quote: MintQuoteRaw = {
		quantity: q.quantity,
		entryProbability: q.entry_probability,
		premium: q.premium,
		tradingFee: q.trading_fee,
		feeIncentiveSubsidy: q.fee_incentive_subsidy,
		builderFee: q.builder_fee,
		penaltyFee: q.penalty_fee,
		inventoryImpactCharge: q.inventory_impact_charge,
		allInCost: q.all_in_cost,
	};
	const policy = args.ordersConfig
		? policyFromBcs(DelayedExecutionPolicyBcs.parse(cmds[2][0]))
		: null;
	return { quote, policy };
}

/** What `quote_mint` quotes: an exact quantity, or the largest quantity a premium budget buys. */
export type AnonymousMintQuoteRequest = Exclude<MintQuoteRequest, { shape: 'exact-cost' }>;

/**
 * Quote a mint for no particular account: Predict's `quote_mint`, at a fresh live pricer. It
 * prices like a queued fill at the clock with no builder fee, so it previews a mint for a visitor
 * without an account or a funded balance. It has no all-in budget mode. It aborts
 * `EOrderFailsLimits` when the mint would be refused at the clock, for example below the 1 USDC
 * minimum premium. With `ordersConfig`, also reads the order desk's policy.
 */
export async function quoteMintAnonymous(
	client: ReadClient,
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		lowerTick: bigint;
		higherTick: bigint;
		request: AnonymousMintQuoteRequest;
		ordersConfig?: OrdersGeneratedConfig;
	} & MarketFeeds,
): Promise<{ quote: MintQuoteRaw; policy: DelayedExecutionPolicy | null }> {
	const tx = new Transaction();
	const pricer = tx.add(loadLivePricer(config, args));
	const r = args.request;
	tx.add(
		expiryMarket.quoteMint({
			config,
			arguments: {
				market: args.expiryMarketId,
				pricer,
				lowerTick: args.lowerTick,
				higherTick: args.higherTick,
				...(r.shape === 'exact-quantity'
					? { maxPremium: 0n, minQuantity: r.quantityRaw, exactQuantity: true }
					: { maxPremium: r.maxPremiumRaw, minQuantity: r.minQuantityRaw, exactQuantity: false }),
			},
		}),
	);
	if (args.ordersConfig) tx.add(desk.policy({ config: args.ordersConfig }));
	const cmds = await inspectReturns(client, tx);
	const q = expiryMarket.MintQuote.parse(cmds[1][0]);
	return {
		quote: {
			quantity: q.quantity,
			entryProbability: q.entry_probability,
			premium: q.premium,
			tradingFee: q.trading_fee,
			feeIncentiveSubsidy: q.fee_incentive_subsidy,
			builderFee: q.builder_fee,
			penaltyFee: q.penalty_fee,
			inventoryImpactCharge: q.inventory_impact_charge,
			allInCost: q.all_in_cost,
		},
		policy: args.ordersConfig ? policyFromBcs(DelayedExecutionPolicyBcs.parse(cmds[2][0])) : null,
	};
}

/**
 * The order desk's policy and an owner's USDC balance, in one simulate. The queued exact-cost
 * quote needs both: enqueue escrows `min(max_cost, available − fee)`, while the chain quote caps
 * at the whole balance.
 */
export async function orderFeeAndBalance(
	client: ReadClient,
	config: OrdersGeneratedConfig,
	owner: string,
	coinType: string,
): Promise<{ policy: DelayedExecutionPolicy; availableRaw: bigint }> {
	const tx = new Transaction();
	tx.add(desk.policy({ config }));
	const loaded = tx.add(
		account.loadAccount({ config, arguments: { self: deriveAccountWrapperIdFrom(config, owner) } }),
	);
	tx.add(account.balance({ config, typeArguments: [coinType], arguments: { self: loaded } }));
	const cmds = await inspectReturns(client, tx);
	return {
		policy: policyFromBcs(DelayedExecutionPolicyBcs.parse(cmds[0][0])),
		availableRaw: parseU64LE(cmds[2][0]),
	};
}
