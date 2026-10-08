// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): chain reads for the order queue. Every read here calls functions
// that exist only from the delayed-execution package on, so the facade gates them on
// `packages.predictDelayedExecution`. A market without an order book reads as an empty queue.
import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Transaction, type TransactionResult } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { GeneratedConfig } from '../config/generated.js';
import {
	DELAYED_EXECUTION_VERSION,
	policyFromBcs,
	type DelayedExecutionPolicy,
	type QueueHeads,
	type QueuedOrder,
} from '../queue.js';
import { deriveAccountIdFrom, deriveAccountWrapperIdFrom } from '../tx/common.js';
import { loadLivePricer, type MarketFeeds } from '../tx/trade.js';
import { accountMoveCalls as account } from '../../account.js';
import { DelayedExecutionPolicy as DelayedExecutionPolicyBcs } from '../../contracts/deepbook_predict/delayed_execution_config.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import { QueuedOrder as QueuedOrderBcs } from '../../contracts/deepbook_predict/order_queue.js';
import * as protocolConfig from '../../contracts/deepbook_predict/protocol_config.js';
import { inspectReturns, type ReadClient } from './inspect.js';
import { parseOptionalU64, parseU64LE } from './parse.js';

const parseBool = (bytes: Uint8Array): boolean => (bytes[0] ?? 0) !== 0;
const OptionalPolicy = bcs.option(DelayedExecutionPolicyBcs);
const OptionalQueuedOrder = bcs.option(QueuedOrderBcs);

/** Everything the queued-order preflight and the app's queue view read, from one simulate. */
export interface MarketQueueState {
	marketId: string;
	expiryMs: bigint;
	mintPaused: boolean;
	cashBalance: bigint;
	requiredCash: bigint;
	/** Cash above required cash: the largest cash need a new queued mint may have now. */
	spareCash: bigint;
	/** Summed cash need of the unfinished orders; `rebalance_expiry_cash` funds it. */
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
	/** The settlement payout walk is done once `cursor === nextId`. */
	payout: { cursor: bigint; nextId: bigint };
	protocol: {
		/** `null` until the admin initializes the policy. */
		policy: DelayedExecutionPolicy | null;
		noTradeWindowMs: bigint;
		/** The admin-set mint fee subsidy rate, 1e9-scaled (20% when unset). */
		feeIncentiveSubsidyRate: bigint;
		tradingPaused: boolean;
		frozen: boolean;
		versionWatermark: bigint;
	};
	/** Present when an owner was given. */
	account: {
		accountId: string;
		/** Unfinished orders the account holds in this market, against `per_account_cap`. */
		waitingOrders: bigint;
		/** `account::balance<USDC>`, unsettled accumulator funds included. */
		availableRaw: bigint;
	} | null;
	/** One entry per requested record ID: the record, or `null` when missing or deleted. */
	records: (QueuedOrder | null)[];
}

/**
 * Read a market's queue state in one simulate: the cash figures, the stuck gate, cohorts, heads,
 * counters, the policy and the protocol gates. With `owner`, also the account's waiting-order
 * count and USDC balance (the owner must have an account: loading a missing wrapper aborts the
 * read). With `recordIds`, also those records.
 */
export async function marketQueueState(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
	opts: { owner?: string; quoteCoinType?: string; recordIds?: readonly bigint[] } = {},
): Promise<MarketQueueState> {
	const tx = new Transaction();
	let next = 0;
	const results: TransactionResult[] = [];
	const add = (command: (tx: Transaction) => TransactionResult): number => {
		results.push(tx.add(command));
		return next++;
	};
	const market = { market: marketId };
	const i = {
		expiry: add(expiryMarket.expiry({ config, arguments: market })),
		mintPaused: add(expiryMarket.mintPaused({ config, arguments: market })),
		cashBalance: add(expiryMarket.cashBalance({ config, arguments: market })),
		requiredCash: add(expiryMarket.requiredCash({ config, arguments: market })),
		spareCash: add(expiryMarket.spareCash({ config, arguments: market })),
		waitingCashNeed: add(expiryMarket.waitingCashNeed({ config, arguments: market })),
		minEntryProbability: add(expiryMarket.minEntryProbability({ config, arguments: market })),
		backingBufferLambda: add(expiryMarket.backingBufferLambda({ config, arguments: market })),
		payoutTreeNodeCount: add(expiryMarket.payoutTreeNodeCount({ config, arguments: market })),
		stuck: add(expiryMarket.queueStuck({ config, arguments: market })),
		cohorts: add(expiryMarket.waitingCohorts({ config, arguments: market })),
		heads: add(expiryMarket.queueHeads({ config, arguments: market })),
		pending: add(expiryMarket.pendingCounts({ config, arguments: market })),
		payout: add(expiryMarket.payoutProgress({ config, arguments: market })),
		policy: add(protocolConfig.delayedExecutionPolicy({ config })),
		noTradeWindowMs: add(protocolConfig.noTradeWindowMs({ config })),
		subsidyRate: add(protocolConfig.feeIncentiveSubsidyRate({ config })),
		tradingPaused: add(protocolConfig.tradingPaused({ config })),
		frozen: add(protocolConfig.frozen({ config })),
		watermark: add(protocolConfig.versionWatermark({ config })),
	};
	let accountIdx: { waiting: number; balance: number; accountId: string } | null = null;
	if (opts.owner) {
		if (!opts.quoteCoinType) throw new Error('marketQueueState: owner reads need quoteCoinType');
		const accountId = deriveAccountIdFrom(config, opts.owner);
		const waiting = add(
			expiryMarket.waitingOrders({ config, arguments: { ...market, accountId } }),
		);
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
		add(expiryMarket.queuedOrder({ config, arguments: { ...market, recordId } })),
	);

	const cmds = await inspectReturns(client, tx);
	const u64 = (idx: number, value = 0) => parseU64LE(cmds[idx][value]);
	const policy = OptionalPolicy.parse(cmds[i.policy][0]);
	return {
		marketId: normalizeSuiAddress(marketId),
		expiryMs: u64(i.expiry),
		mintPaused: parseBool(cmds[i.mintPaused][0]),
		cashBalance: u64(i.cashBalance),
		requiredCash: u64(i.requiredCash),
		spareCash: u64(i.spareCash),
		waitingCashNeed: u64(i.waitingCashNeed),
		minEntryProbability: u64(i.minEntryProbability),
		backingBufferLambda: u64(i.backingBufferLambda),
		payoutTreeNodeCount: u64(i.payoutTreeNodeCount),
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
		payout: { cursor: u64(i.payout, 0), nextId: u64(i.payout, 1) },
		protocol: {
			policy: policy == null ? null : policyFromBcs(policy),
			noTradeWindowMs: u64(i.noTradeWindowMs),
			feeIncentiveSubsidyRate: u64(i.subsidyRate),
			tradingPaused: parseBool(cmds[i.tradingPaused][0]),
			frozen: parseBool(cmds[i.frozen][0]),
			versionWatermark: u64(i.watermark),
		},
		account: accountIdx
			? {
					accountId: accountIdx.accountId,
					waitingOrders: u64(accountIdx.waiting),
					availableRaw: u64(accountIdx.balance),
				}
			: null,
		records: recordIdx.map((idx) => OptionalQueuedOrder.parse(cmds[idx][0]) ?? null),
	};
}

/** Queue records by record ID, `null` for a missing or cleaned-up one. One simulate. */
export async function queuedOrders(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
	recordIds: readonly bigint[],
): Promise<(QueuedOrder | null)[]> {
	if (recordIds.length === 0) return [];
	const tx = new Transaction();
	for (const recordId of recordIds) {
		tx.add(expiryMarket.queuedOrder({ config, arguments: { market: marketId, recordId } }));
	}
	const cmds = await inspectReturns(client, tx);
	return cmds.map((rv) => OptionalQueuedOrder.parse(rv[0]) ?? null);
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
 * - `'immediate'`: the watermark isn't raised and this SDK has no delayed-execution record. Use
 *   the immediate `mint*` / `redeem` builders.
 * - `'awaiting-cutover'`: delayed execution is published but the watermark isn't raised. The
 *   immediate builders still work and enqueue aborts `ECutoverNotReached`.
 * - `'delayed'`: the watermark is raised. Use the `enqueue*` builders; the immediate ones abort
 *   `EDelayedExecutionRequired`.
 * - `'unsupported'`: the watermark is raised but this SDK's config has no delayed-execution
 *   record for the network. Upgrade the SDK, or pass a config that records it.
 */
export type ExecutionMode = 'immediate' | 'awaiting-cutover' | 'delayed' | 'unsupported';

/** The {@link ExecutionMode} for a watermark and whether the config records delayed execution. */
export function executionModeFor(
	watermark: bigint,
	recordsDelayedExecution: boolean,
): ExecutionMode {
	if (watermark >= DELAYED_EXECUTION_VERSION) {
		return recordsDelayedExecution ? 'delayed' : 'unsupported';
	}
	return recordsDelayedExecution ? 'awaiting-cutover' : 'immediate';
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
 * Quote an early sell of an Open record at a fresh live pricer (`load_live_pricer`, then
 * `quote_redeem_open`). `proceeds` is before the order fee, with no congestion penalty. Aborts
 * `ERecordNotOpen` when the record isn't Open. It doesn't check that the wrapper's account owns
 * the record: the wrapper only supplies the builder code.
 */
export async function quoteRedeemOpen(
	client: ReadClient,
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		recordId: bigint;
		closeQuantityRaw: bigint;
	} & MarketFeeds,
): Promise<{ quote: RedeemOpenQuoteRaw; policy: DelayedExecutionPolicy | null }> {
	const tx = new Transaction();
	const pricer = tx.add(loadLivePricer(config, args));
	tx.add(
		expiryMarket.quoteRedeemOpen({
			config,
			arguments: {
				market: args.expiryMarketId,
				wrapper: args.wrapperId,
				pricer,
				recordId: args.recordId,
				closeQuantity: args.closeQuantityRaw,
			},
		}),
	);
	tx.add(protocolConfig.delayedExecutionPolicy({ config }));
	const cmds = await inspectReturns(client, tx);
	const q = expiryMarket.RedeemQuote.parse(cmds[1][0]);
	const policy = OptionalPolicy.parse(cmds[2][0]);
	return {
		quote: {
			closeQuantity: q.close_quantity,
			probability: q.probability,
			proceeds: q.proceeds,
			tradingFee: q.trading_fee,
			builderFee: q.builder_fee,
			inventoryImpactRebate: q.inventory_impact_rebate,
		},
		policy: policy == null ? null : policyFromBcs(policy),
	};
}

/** `expiry_market::MintQuote` with camelCase keys. `allInCost` includes the congestion penalty. */
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
 * Quote a mint for one account without placing it: `quote_mint_for_account` (exact quantity and
 * premium budget) or `quote_mint_exact_cost_for_account` (all-in budget), at a fresh live pricer.
 * Both read the account's builder code and cap a budget at its balance. They abort with
 * `pricing::EPythSpotUnavailable` / `EPythSpotStale` while the on-chain Pyth spot is unusable, so
 * treat those as "no preview" (`isPreviewUnavailable`).
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
		/** Also read the delayed-execution policy (only on a package that has it). */
		withPolicy?: boolean;
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
	if (args.withPolicy) tx.add(protocolConfig.delayedExecutionPolicy({ config }));
	const cmds = await inspectReturns(client, tx);
	const q = expiryMarket.MintQuote.parse(cmds[1][0]);
	const policy = args.withPolicy ? OptionalPolicy.parse(cmds[2][0]) : null;
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
	return { quote, policy: policy == null ? null : policyFromBcs(policy) };
}

/**
 * The delayed-execution policy and an owner's USDC balance, in one simulate. The queued exact-cost
 * quote needs both: enqueue escrows `min(max_cost, available − fee)`, while the chain quote caps
 * at the whole balance.
 */
export async function orderFeeAndBalance(
	client: ReadClient,
	config: GeneratedConfig,
	owner: string,
	coinType: string,
): Promise<{ policy: DelayedExecutionPolicy | null; availableRaw: bigint }> {
	const tx = new Transaction();
	tx.add(protocolConfig.delayedExecutionPolicy({ config }));
	const loaded = tx.add(
		account.loadAccount({ config, arguments: { self: deriveAccountWrapperIdFrom(config, owner) } }),
	);
	tx.add(account.balance({ config, typeArguments: [coinType], arguments: { self: loaded } }));
	const cmds = await inspectReturns(client, tx);
	const policy = OptionalPolicy.parse(cmds[0][0]);
	return {
		policy: policy == null ? null : policyFromBcs(policy),
		availableRaw: parseU64LE(cmds[2][0]),
	};
}
