// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ClientWithCoreApi, SuiClientRegistration } from '@mysten/sui/client';
import { Transaction, coinWithBalance, type TransactionResult } from '@mysten/sui/transactions';
import { isValidSuiObjectId, normalizeSuiAddress } from '@mysten/sui/utils';
import { TESTNET_PREDICT } from '../deployments/testnet.js';
import { getConfig, type PredictConfig, type UnderlyingConfig } from './config/index.js';
import {
	toGeneratedConfig,
	toOrdersConfig,
	type GeneratedConfig,
	type OrdersGeneratedConfig,
} from './config/generated.js';
import { MIN_PREMIUM, decodeOrderRange, type FeePolicy } from './cost.js';
import {
	decodeAccountsCreated,
	decodeBuilderCodeSets,
	decodeClaims,
	decodeCohortCommits,
	decodeDeposits,
	decodeEnqueues,
	decodeExpiryPnlRealized,
	decodeMarketPayoutsCompleted,
	decodeMints,
	decodeOpenRecordPayouts,
	decodePlpCancels,
	decodePlpRequests,
	decodePolicyUpdates,
	decodeQueueEvents,
	decodeQueueOps,
	decodeQueuedFills,
	decodeQueuedRefunds,
	decodeRecordFunds,
	decodeRedeems,
	decodeWithdrawals,
	exactlyOne,
	type DecodableTransactionResult,
} from './decode.js';
import {
	PredictInputError,
	PredictMoveError,
	PredictPreflightError,
	type PredictPreflightCode,
} from './errors.js';
import {
	ORDER_FLOW_PACKAGE_VERSION,
	ORDER_KIND,
	ORDER_STATUS,
	budgetMintLimits,
	cashNeedSell,
	channelTickMs,
	exactMintLimits,
	feeCovered,
	maxMintNow,
	mintBudget,
	mintCashNeed,
	orderKindName,
	orderView,
	previewTiming,
	sellLimits,
	slippageBand,
	type DelayedExecutionPolicy,
	type MaxMintNow,
	type OrderKindName,
	type OrderView,
	type QueuedOrder,
	type TimingPreview,
} from './queue.js';
import { deriveQueueId } from './queue-id.js';
import { simulateWithEvents } from './reads/inspect.js';
import {
	executionModeFor,
	lazerPackages,
	marketQueueState,
	orderFeeAndBalance,
	pendingFunds,
	queuedOrders,
	quoteMintAnonymous,
	quoteMintForAccount,
	quoteRedeemOpen,
	versionWatermark,
	type AnonymousMintQuoteRequest,
	type ExecutionMode,
	type MarketQueueState,
	type MintQuoteRaw,
	type MintQuoteRequest,
} from './reads/queue.js';
import {
	positionsFromTable,
	resolvePositionsTable,
	type OpenPosition,
	type PositionsHandle,
} from './reads/positions.js';
import { accountBalance, hasPosition } from './reads/balances.js';
import {
	activeMarketIds,
	currentNav,
	expiryMarketId,
	marketFeePolicy,
	marketState,
	marketStates,
	rangePrices,
	referenceTick,
	type MarketState,
} from './reads/markets.js';
import { poolStats } from './reads/pool.js';
import { readPricerSnapshot, type PricerSnapshot } from './reads/pricing.js';
import { boardPricer, type BoardPricer } from './pricing.js';
import { POS_INF_TICK, binaryRangeTicks, type Side } from './ticks.js';
import {
	cancelSupplyRequest,
	cancelWithdrawRequest,
	depositFunds,
	requestSupply,
	requestWithdraw,
	setBuilderCode,
	unsetBuilderCode,
	withdrawFunds,
} from './tx/authed.js';

import { accountContract, deriveAccountWrapperIdFrom } from './tx/common.js';
import {
	assertOrderFeeAtMost,
	claimParked,
	enqueueExactAmount,
	enqueueExactCost,
	enqueueExactQuantity,
	enqueueRedeemOpen,
	fill,
	payOpen,
	rebalanceExpiryCash,
	refund,
	type LazerPackages,
} from './tx/queue.js';
import type { MarketFeeds } from './tx/trade.js';
import {
	mintExactAmount,
	mintExactCost,
	mintExactQuantity,
	redeemLive,
	redeemSettled,
} from './tx/trade.js';
import {
	priceToRaw,
	probabilityToRaw,
	rawToProbability,
	rawToUsdc,
	usdcToRaw,
	fromRaw,
} from './units.js';

// `position_lot_size` — a position quantity must be a whole multiple of this many
// raw payout units ($0.01 lots). See packages/predict/sources/constants.move.
/**
 * Testnet's `position_lot_size`, read from the deployment record. Validation uses the lot
 * size of the config actually in play; this is the convenience constant for testnet callers.
 */
export const POSITION_LOT_SIZE = BigInt(TESTNET_PREDICT.units.positionLotSize);

// Most `tx.*` builders are one builder's worth of commands in a fresh PTB.
function txOf(command: (tx: Transaction) => TransactionResult | void): Transaction {
	const tx = new Transaction();
	tx.add(command);
	return tx;
}

/** A live/settled market addressed by its human coordinates: a binary position
 * (single strike + side) or a two-strike range position. */
export type MarketDescriptor = {
	underlying: string;
	expiryMs: number | bigint;
	/**
	 * Pin resolution to this exact `ExpiryMarket` object, skipping the
	 * underlying+expiry lookup — a caller that reviewed a specific market object
	 * mints against exactly that object, not whatever resolves at submit time.
	 */
	marketId?: string;
} & (
	| {
			side: Side;
			/**
			 * Strike in USD, or "reference" to trade at the market's on-chain reference
			 * price (the Polymarket-style anchor: derived from the exact previous-window
			 * oracle observation, so consecutive windows chain settlement → next strike).
			 */
			strike: number | 'reference';
	  }
	| {
			/** A range position: pays out when settlement lands inside `(lower, upper]`
			 * (left-open, right-closed — same convention as the on-chain range key). */
			side: 'range';
			/** Lower strike bound in USD — finite, on the tick grid. */
			lower: number;
			/** Upper strike bound in USD — finite, on the tick grid, above `lower`. */
			upper: number;
	  }
);

/** Options for the friendly `mint` (exact payout quantity). */
export interface MintOptions {
	quantity: number;
	maxCost?: number;
	maxProbability?: number;
}

/** Options for `mintAmount` (spend up to a premium budget, floor the quantity received). */
export interface MintAmountOptions {
	/** Premium budget in quote units — the max premium paid (chain also caps it at the account balance). */
	spend: number;
	minQuantity: number;
	/** All-in cost ceiling in quote units (premium + fees). Omitted → uncapped. */
	maxCost?: number;
}

/** Options for `mintCost`: all-in budget. Requires Predict v2 or later. */
export interface MintCostOptions {
	/** All-in USDC budget; the chain also caps it at the account balance. */
	spend: number;
	/** Minimum payout received. Zero disables this slippage floor. */
	minQuantity: number;
}

/** Options for `redeem`: which order and how much to close. `claimSettled` takes only
 * `orderId` — a settled claim closes the order in full. */
export interface CloseOptions {
	orderId: bigint;
	quantity: number;
}

/** Options for `supplyPlp`. */
export interface PlpSupplyOptions {
	/**
	 * Floor on the PLP minted for the whole request, as raw `bigint` shares — PLP is raw
	 * everywhere in this SDK. It is a floor on the MARK, not a share count: a flush quoting
	 * less does not fill smaller, it declines. Omitted → `0n`, no floor.
	 *
	 * How a miss is handled is the deployment's `lp_request_limit_flush_attempts`: at the
	 * shipped count of one the first flush below the floor cancels and refunds the request.
	 */
	minPlpOut?: bigint;
}

/** Options for `withdrawPlp`. */
export interface PlpWithdrawOptions {
	/**
	 * Floor on the USDC paid for the whole request, in USD decimals like every other amount
	 * here. A floor on the MARK, not an amount: a flush quoting less declines rather than
	 * paying out smaller. Omitted → no floor. Measured after the protocol's withdraw fee.
	 */
	minUsdcOut?: number | string;
}

/** One tradeable market as returned by read.markets(). */
export interface ActiveMarket {
	id: string;
	expiryMs: bigint;
	/** Strike granularity in USD (e.g. 0.01). */
	tickSize: number;
	/**
	 * Coarser step new mint strikes must align to. A numeric strike must be a whole
	 * multiple of this (the market's `referencePrice` is the one exception the chain
	 * admits off-grid); otherwise the mint aborts `EInvalidAdmissionTick`.
	 */
	admissionTickSize: number;
	mintPaused: boolean;
	/** The window's anchor strike in USD, or null until the keeper seeds it. */
	referencePrice: number | null;
}

/** A resolved live market: its on-chain state summary for the caller. */
export interface MarketSummary {
	id: string;
	expiryMs: bigint;
	tickSize: number;
	/**
	 * Coarser step new mint strikes must align to. A numeric strike must be a whole
	 * multiple of this (the market's `referencePrice` is the one exception the chain
	 * admits off-grid); otherwise the mint aborts `EInvalidAdmissionTick`.
	 */
	admissionTickSize: number;
	mintPaused: boolean;
	nav: number;
	/** The window's anchor strike in USD, or null until the keeper seeds it. */
	referencePrice: number | null;
}

/** Aggregate pool figures. Balances in human units (shares raw); the pending fields
 * are request COUNTS, not amounts — the on-chain getters expose queue lengths, and
 * the escrowed USDC/PLP behind them is tracked separately. */
export interface PoolSummary {
	plpTotalSupply: bigint;
	idleUsdc: number;
	/** Number of LP supply requests queued for the next flush. */
	supplyRequestsPending: number;
	/** Number of LP withdraw requests queued for the next flush. */
	withdrawRequestsPending: number;
}

/** Exact pre-trade quote: the dry-run receipt of the mint you are about to send. */
export interface MintQuote {
	/** Fill price, 0..1 per $1 payout. */
	entryProbability: number;
	/** Premium paid into LP backing (quote units). */
	premium: number;
	/**
	 * Fee breakdown. `referral` is a PORTION of the trader-paid trading fee and
	 * congestion surcharge routed to the referrer — it is already inside those
	 * numbers and is NOT an extra debit. `inventoryImpact` is a separate charge and
	 * IS part of `cost`.
	 */
	fees: {
		trading: number;
		subsidy: number;
		builder: number;
		penalty: number;
		referral: number;
		inventoryImpact: number;
	};
	/**
	 * All-in account debit: premium + (trading − subsidy) + builder + penalty +
	 * inventoryImpact — exactly what the chain withdraws (the deployed
	 * `compute_mint_quote`'s `all_in_cost`); pass this (plus your buffer) as maxCost.
	 */
	cost: number;
	quantity: number;
	raw: { premium: bigint; cost: bigint; quantity: bigint; entryProbability: bigint };
	/** True: computed by the real mint code path against real account state. */
	feesExact: true;
	/**
	 * True when this previews a queued (delayed-execution) fill: read from the chain's
	 * `quote_*` functions with the congestion penalty removed, since a queued fill pays none.
	 * Set when the network's config records delayed execution.
	 */
	queued?: boolean;
	/**
	 * Queued previews only: the flat order fee, charged once at enqueue on top of `cost`. Show
	 * it once per order, not per contract.
	 */
	orderFee?: number;
}

/** Exact pre-close quote: the dry-run receipt of the redeem you are about to send. */
export interface RedeemQuote {
	/** NET quote credited to the account. */
	proceeds: number;
	/** Gross close value before fees. */
	gross: number;
	/** `inventoryImpactRebate` is credited back on the close, so `proceeds` is
	 * gross + rebate − trading − builder − penalty. */
	fees: { trading: number; builder: number; penalty: number; inventoryImpactRebate: number };
	quantityClosed: number;
	remaining: number;
	raw: { proceeds: bigint; gross: bigint; quantityClosed: bigint };
	feesExact: true;
}

interface ResolvedMarket {
	id: string;
	state: MarketState;
}

/** A market by its underlying and expiry, optionally pinned to an exact object. */
export type MarketCoordinates = Pick<MarketDescriptor, 'underlying' | 'expiryMs' | 'marketId'>;

/** Options for `enqueueMint`: a queued mint of an exact payout quantity. */
export interface EnqueueMintOptions {
	quantity: number;
	/** All-in USDC cap (premium + fees). Required: a queued mint has no "unlimited" cap. */
	maxCost: number;
	/** Entry-probability cap at τ, in (0, 1]. Required. See `queue.slippageBand`. */
	maxProbability: number;
}

/** Options for `enqueueMintAmount`: a queued premium-budget mint. */
export interface EnqueueMintAmountOptions {
	/** Premium budget in USDC. */
	spend: number;
	/** Floor on the payout received. */
	minQuantity: number;
	/** All-in USDC cap (premium + fees). Required. */
	maxCost: number;
}

/** Options for `enqueueMintCost`: a queued all-in-budget mint. */
export interface EnqueueMintCostOptions {
	/** All-in USDC budget, fees included. Escrowed at enqueue, less what the fill doesn't use. */
	spend: number;
	/** Floor on the payout received. Zero disables this slippage floor. */
	minQuantity: number;
}

/** Options for `enqueueSell`: a queued early sell of an Open record. */
export interface EnqueueSellOptions {
	/** The Open record to sell from: its queue record ID, not the position's order ID. */
	recordId: bigint;
	/** Payout quantity to close. A partial sell must leave at least the policy minimum. */
	quantity: number;
	/** Close-side probability floor at τ, in [0, 1]. Pass 0 on purpose to disable it. */
	minProbability: number;
	/** Floor on the proceeds before the order fee, in USDC. Pass 0 on purpose to disable it. */
	minProceeds: number;
	/**
	 * Add `rebalance_expiry_cash` after the enqueue so the market is funded for this sell at once.
	 * `'auto'` (default) adds it only when the sell's cash need is above spare cash, `'always'`
	 * always, `'never'` never. It takes the hot `PoolVault`, so keep it conditional.
	 */
	fundMarket?: 'auto' | 'always' | 'never';
}

/** What a queued order builder previews alongside the transaction. Display only. */
export interface QueuedOrderPreview {
	marketId: string;
	kind: number;
	kindName: OrderKindName;
	/** τ, deadline and cutoff for an order placed now, from the local clock. */
	timing: TimingPreview;
	/** The flat order fee, charged once at enqueue. */
	orderFee: number;
	/** USDC escrowed for the premium and fees; 0 for a sell. Unused budget returns at the fill. */
	budget: number;
	/** What enqueue debits: budget + order fee. */
	totalDebit: number;
	/** The order's worst-case cash need against the market's spare cash. */
	cashNeedRaw: bigint;
	spareCashRaw: bigint;
	/**
	 * Sells only: the cash need is above spare cash, so the sell may be refunded in full
	 * (reason 8) unless the market is funded before the fill.
	 */
	needsFunding: boolean;
	/** Whether the builder added `rebalance_expiry_cash` after the enqueue. */
	fundedInTransaction: boolean;
	raw: { orderFee: bigint; budget: bigint; totalDebit: bigint };
}

/** A queued order's transaction and its preview. */
export interface QueuedOrderPlan {
	transaction: Transaction;
	preview: QueuedOrderPreview;
}

/**
 * How much the price may move against a queued order between its quote and its fill, in cents per
 * contract. A contract pays $1, so its price in cents is its probability: 10¢ of slippage lets
 * a 42¢ contract fill at up to 52¢, fees included. It is never a percentage.
 */
export interface SlippageOptions {
	/**
	 * Cents per contract: `10` is 10¢. `'auto'` (the default) sizes it with `queue.slippageBand`
	 * from the time to expiry and the policy's delay.
	 */
	slippageCents?: number | 'auto';
	/** Standard deviations of movement for `'auto'`. Default 2. */
	k?: number;
}

/**
 * Options for `read.planMint`. `amount` plans a purchase form's spend (an all-in budget mint),
 * and `quantity` plans an exact payout.
 */
export type PlanMintOptions = SlippageOptions &
	(
		| {
				/** The purchase amount in USDC. */
				amount: number;
				/**
				 * Whether `amount` is the whole debit, order fee included (`'inclusive'`, the default),
				 * or the order fee is charged on top (`'exclusive'`).
				 */
				orderFee?: 'inclusive' | 'exclusive';
		  }
		| { quantity: number }
	);

/** The slippage a plan applied. */
export interface AppliedSlippage {
	/** Cents per contract. */
	cents: number;
	source: 'input' | 'auto';
	/** The model band when `source` is `'auto'`. */
	band: ReturnType<typeof slippageBand> | null;
}

/**
 * `read.planMint`: everything a purchase form shows, and the enqueue options that carry its
 * slippage. Display only: the fill prices at τ, within the limits in `order`.
 */
export interface MintPlan {
	shape: 'budget' | 'exact-quantity';
	/** The owner, market and strike range the plan was quoted for. */
	target: PlanTarget;
	/** The quote at the current price. */
	quote: MintQuote;
	/**
	 * Whether the quote is the account's own (`quote_mint_*_for_account`, with its builder fee). A
	 * visitor without an account, or a balance below the order, gets `quote_mint`'s quote instead,
	 * with a budget's quantity found by a short search.
	 */
	quoteForAccount: boolean;
	slippage: AppliedSlippage;
	/** The payout if it wins, at the current price ("Potential payout"). */
	potentialPayout: number;
	/** The smallest payout the order accepts, at the worst price. A smaller fill is refunded. */
	minPayout: number;
	/** `potentialPayout / expectedDebit` ("Payout multiple"), order fee included. */
	payoutMultiple: number;
	/** `minPayout / totalDebit`: the multiple at the worst price. */
	minPayoutMultiple: number;
	/** All-in price per contract now in USDC (0.42 is 42¢), after the fee subsidy, order fee excluded. */
	pricePerContract: number;
	/**
	 * The worst price the limits admit: the price per contract without the fee subsidy, plus the
	 * slippage. Enqueue admission checks the order without the subsidy, and the subsidy can run out
	 * before the fill, so the limits never count on it.
	 */
	worstPricePerContract: number;
	/** The flat order fee, read from the order desk, charged once per order. */
	orderFee: number;
	/** USDC escrowed for the premium and fees. Unused budget comes back at the fill. */
	budget: number;
	/** `budget + orderFee`: what enqueue debits. */
	totalDebit: number;
	/** `quote.cost + orderFee`: what the order costs if it fills at the current price. */
	expectedDebit: number;
	balance: {
		/** Whether the owner has a Predict account yet. */
		hasAccount: boolean;
		/** The account's USDC, or null without an account. */
		available: number | null;
		/** Whether the balance covers `totalDebit`, or null without an account. */
		covers: boolean | null;
	};
	/**
	 * The largest `amount` (budget plans) or `quantity` (exact plans) the market's spare cash and,
	 * with an account, the balance allow now. An exact plan's balance bound prices each contract
	 * at the plan's `worstPricePerContract`. Null when neither binds.
	 */
	maxNow: number | null;
	/** τ, deadline and cutoff for an order placed now, from the local clock. */
	timing: TimingPreview;
	/**
	 * Whether `tx.enqueuePlan` would build the order now and admission would take it at the current
	 * price: the builder's preflight (the queue gates, the order fee, the minimum premium and the
	 * market's cash), the balance against `totalDebit`, the payout bound and, for a budget, the
	 * floor admission buys without the fee subsidy. Two admission conditions are checked only on
	 * chain, at placement: the market's SVI age under the order desk's `svi_max_age_ms`, and room in
	 * the payout tree for a new strike's boundary nodes.
	 */
	accepting: boolean;
	/**
	 * The `PredictPreflightError` code the order would get now, or null. `'fee'` also covers a
	 * missing account or a balance below `totalDebit`.
	 */
	refusal: PredictPreflightCode | null;
	/** Pass `order.options` to `tx[order.builder]`. */
	order:
		| { builder: 'enqueueMintCost'; options: EnqueueMintCostOptions }
		| { builder: 'enqueueMint'; options: EnqueueMintOptions };
	raw: {
		budget: bigint;
		orderFee: bigint;
		totalDebit: bigint;
		slippage: bigint;
		minQuantity: bigint;
		maxCost: bigint | null;
		maxProbability: bigint | null;
		pricePerContract: bigint;
		worstPricePerContract: bigint;
	};
}

/**
 * What a plan was quoted for. Its limits are sized for that one order, so `tx.enqueuePlan` refuses
 * the plan for any other owner, market, strike or record.
 */
export interface PlanTarget {
	owner: string;
	expiryMarketId: string;
	/** A mint's strike range, as the market's admission ticks. */
	lowerTick?: bigint;
	higherTick?: bigint;
	/** A sell's Open record. Record IDs restart in every market. */
	recordId?: bigint;
}

/** Options for `read.planSell`. */
export type PlanSellOptions = SlippageOptions & {
	/** The Open record to sell from. */
	recordId: bigint;
	/** Payout quantity to close. */
	quantity: number;
};

/** `read.planSell`: what an early sell shows, and the enqueue options that carry its slippage. */
export interface SellPlan {
	/** The owner, market and record the plan was quoted for. */
	target: PlanTarget;
	/** The quote at the current price. */
	quote: SellQuote;
	slippage: AppliedSlippage;
	/** Proceeds at the current price, before the order fee. */
	proceeds: number;
	/** `proceeds − orderFee`. */
	net: number;
	/** The proceeds floor the order carries, before the order fee. A smaller fill is refunded. */
	minProceeds: number;
	/**
	 * `minProceeds − orderFee`: the worst the sell nets if it fills. Negative when the order fee is
	 * above the proceeds floor.
	 */
	minNet: number;
	orderFee: number;
	timing: TimingPreview;
	/**
	 * Whether `tx.enqueuePlan` would build the sell now: the builder's preflight, which checks the
	 * queue gates, that the record is Open and the owner's, the order fee and the minimum sell. The
	 * market's SVI age under the order desk's `svi_max_age_ms` is checked only on chain, at
	 * placement.
	 */
	accepting: boolean;
	/** The `PredictPreflightError` code the sell would get now, or null. */
	refusal: PredictPreflightCode | null;
	/** Pass `order.options` to `tx.enqueueSell`. */
	order: { builder: 'enqueueSell'; options: EnqueueSellOptions };
	raw: { slippage: bigint; minProceeds: bigint; minProbability: bigint; orderFee: bigint };
}

/** `read.queue`: a market's queue state plus the derived figures the app shows. */
export interface MarketQueueView extends MarketQueueState {
	mode: ExecutionMode;
	/** τ, deadline and cutoff for an order placed now, from the local clock. */
	timing: TimingPreview;
	/**
	 * Whether a new mint would pass the queue gates now: the same gates `enqueueMint*` checks
	 * before its fee and cash checks (the order-flow allowlist, the cutover, pauses, stuck, mint
	 * capacity, the cutoff, and the account cap when an owner was given). One side can be full
	 * while the other is open.
	 */
	acceptingMints: boolean;
	/** Whether a new sell would pass the queue gates now (sells skip the mint pauses). */
	acceptingSells: boolean;
	/**
	 * Why each side refuses now, or null: the `PredictPreflightError` code the builder would
	 * throw for the queue gates.
	 */
	refusal: { mint: PredictPreflightCode | null; sell: PredictPreflightCode | null };
	/** The largest mint the market's spare cash admits now. */
	maxMint: { exactQuantity: MaxMintNow; budget: MaxMintNow };
}

/** A queue record and its display state. */
export interface QueuedOrderView {
	recordId: bigint;
	record: QueuedOrder;
	view: OrderView;
}

/** How `read.waitForOutcome` ended. */
export interface QueuedOrderOutcome {
	/** `'gone'`: the record is missing (cleaned up, or not landed). `'timeout'`: still waiting. */
	outcome: 'filled' | 'refunded' | 'closed' | 'gone' | 'timeout';
	order: QueuedOrderView | null;
}

/** A quote for selling an Open record early (`quote_redeem_open`). */
export interface SellQuote {
	/** The live per-contract probability. */
	probability: number;
	/** Proceeds before the order fee, with no congestion penalty. */
	proceeds: number;
	/**
	 * `proceeds − orderFee`: what the account nets. Negative when the order fee is above the
	 * proceeds, since the fee is charged at enqueue whatever the sell returns.
	 */
	net: number;
	fees: { trading: number; builder: number; inventoryImpactRebate: number; order: number };
	quantityClosed: number;
	raw: { probability: bigint; proceeds: bigint; orderFee: bigint; quantityClosed: bigint };
}

// The strike-bearing (binary) arm of MarketDescriptor, for read.price and its
// seam — anonymous board pricing has no range semantics.
type BinaryMarketCoordinates = Pick<MarketDescriptor, 'underlying' | 'expiryMs' | 'marketId'> & {
	strike: number | 'reference';
};

/** The Sui client surface PredictClient reads through: any `ClientWithCoreApi`
 * (gRPC or JSON-RPC) provides both the `simulateTransaction` the reads/quotes
 * sit on and the `core` object methods position enumeration needs. */
export interface PredictCompatibleClient extends ClientWithCoreApi {}

/**
 * Register PredictClient as a `client.predict` extension, mirroring
 * `@mysten/deepbook-v3`'s `deepbook(...)`: `client.$extend(predict({ network }))`.
 */
export function predict<Name extends string = 'predict'>({
	name = 'predict' as Name,
	network,
	config,
}: {
	name?: Name;
	network: 'testnet' | 'mainnet';
	config?: PredictConfig;
}): SuiClientRegistration<PredictCompatibleClient, Name, PredictClient> {
	return {
		name,
		register: (client) => new PredictClient({ client, network, config }),
	};
}

/**
 * The one object an app constructs. Wraps the config, a client for reads, and
 * a derived-account model so callers pass owner addresses, decimal amounts, and
 * human market coordinates — the facade converts to raw units, resolves markets
 * (cached), and delegates to the internal tx primitives / reads. Each `tx.*` builder
 * returns a finished `Transaction`; callers composing their own PTBs use the generated
 * move-call bindings this subpath exports (`plpMoveCalls`, `expiryMarketMoveCalls`, …).
 */
// The chain refused a quote or order on its own limits at the current price.
function isOrderFailsLimits(error: unknown): boolean {
	return error instanceof PredictMoveError && error.abortName === 'EOrderFailsLimits';
}

// The chain refused to price a live trade because the market reached its expiry.
function isPastExpiry(error: unknown): boolean {
	return error instanceof PredictMoveError && error.abortName === 'ELivePricingExpired';
}

export class PredictClient {
	readonly cfg: PredictConfig;
	// The flat slice every generated call resolves `options.config` against.
	get #config(): GeneratedConfig {
		return toGeneratedConfig(this.cfg);
	}
	#client: PredictCompatibleClient;
	// underlying:expiryMs → resolved market. The id and tickSizeRaw — the only
	// state tx building depends on — are immutable per (underlying, expiry), so
	// one resolution per market per client suffices. (mintPaused IS mutable; the
	// cached copy is never consulted for a tx decision — the chain enforces it.)
	#marketCache = new Map<string, ResolvedMarket>();
	// owner → resolved position-store ids. accountUid and the table id are
	// immutable once created, so cache-forever; a missing table (no Predict
	// data yet) is NOT cached — it appears after the owner's first trade.
	#positionsCache = new Map<string, PositionsHandle>();
	// Queue IDs confirmed to exist. A `MarketQueue` is shared and never deleted, so a confirmed
	// queue is cached forever; a missing one is not cached, since the keeper creates it later.
	#knownQueues = new Set<string>();

	constructor(opts: {
		network: 'testnet' | 'mainnet';
		client: PredictCompatibleClient;
		config?: PredictConfig;
	}) {
		this.cfg = opts.config ?? getConfig(opts.network);
		this.#client = opts.client;
	}

	/** The deterministic id of an owner's canonical account wrapper — no chain read. */
	wrapperIdFor(owner: string): string {
		return deriveAccountWrapperIdFrom(this.#config, owner);
	}

	/**
	 * The deterministic id of a market's `MarketQueue` under the config's queue registry, whether
	 * or not it exists yet — no chain read. Throws `PredictInputError` while the config doesn't
	 * record delayed execution.
	 */
	queueIdFor(marketId: string): string {
		return deriveQueueId(this.#requireDelayedExecution().queueRegistry, marketId);
	}

	// The deployment's wiring for a symbol; throws a typed error on an unknown symbol.
	// Per-underlying ids are the one thing the flat config slice does not carry.
	#underlying(underlying: string): UnderlyingConfig {
		const u = this.cfg.underlyings[underlying];
		if (!u) throw new PredictInputError(`unknown underlying: ${underlying}`);
		return u;
	}

	// The oracle feed ids for a symbol; throws a typed error on an unknown symbol.
	#feeds(underlying: string): MarketFeeds {
		const u = this.#underlying(underlying);
		return {
			pythFeed: u.pythFeed,
			blockScholesValueStore: u.blockScholesValueStore,
			blockScholesSviStore: u.blockScholesSviStore,
		};
	}

	// Resolve (and cache) a market's id + state from its human coordinates. An
	// explicit `marketId` pin skips the underlying+expiry lookup but still reads
	// that market's state — tx building depends on tickSizeRaw.
	async #resolveMarket(
		m: Pick<MarketDescriptor, 'underlying' | 'expiryMs' | 'marketId'>,
	): Promise<ResolvedMarket> {
		if (m.marketId != null) {
			if (!isValidSuiObjectId(m.marketId)) {
				throw new PredictInputError(`invalid marketId: ${JSON.stringify(m.marketId)}`);
			}
			const resolved: ResolvedMarket = this.#marketCache.get(m.marketId) ?? {
				id: m.marketId,
				state: await marketState(this.#client, this.#config, m.marketId),
			};
			// The pin must agree with the descriptor's coordinates: catching a stale or
			// wrong-market id here beats minting against mismatched oracle feeds. (The
			// underlying cannot be cross-checked — market state does not carry it.)
			if (resolved.state.expiryMs !== BigInt(m.expiryMs)) {
				throw new PredictInputError(
					`pinned market ${m.marketId} expires at ${resolved.state.expiryMs}, descriptor says ${BigInt(m.expiryMs)}`,
				);
			}
			this.#marketCache.set(m.marketId, resolved);
			return resolved;
		}
		const expiryMs = BigInt(m.expiryMs);
		const key = `${m.underlying}:${expiryMs}`;
		const hit = this.#marketCache.get(key);
		if (hit) return hit;
		const u = this.#underlying(m.underlying);
		const id = await expiryMarketId(this.#client, this.#config, u, expiryMs);
		if (!id) throw new PredictInputError(`no market for ${m.underlying} at expiry ${expiryMs}`);
		const state = await marketState(this.#client, this.#config, id);
		const resolved: ResolvedMarket = { id, state };
		this.#marketCache.set(key, resolved);
		return resolved;
	}

	// Reference PRICE in USD from a state (tick index × tick size), or null.
	static #referencePriceOf(state: MarketState): number | null {
		return state.referenceTickRaw == null
			? null
			: fromRaw(state.referenceTickRaw * state.tickSizeRaw, 9);
	}

	// A finite tick from a USD strike, validated exactly like binaryRangeTicks:
	// whole-tick multiple, inside the finite domain (1..POS_INF_TICK-1).
	#gridTick(strike: number, tickSizeRaw: bigint): bigint {
		const raw = priceToRaw(strike);
		const tick = raw / tickSizeRaw;
		if (tick * tickSizeRaw !== raw) {
			throw new PredictInputError(
				`strike ${strike} is not on the ${fromRaw(tickSizeRaw, 9)} tick grid`,
			);
		}
		if (tick <= 0n || tick >= POS_INF_TICK) {
			throw new PredictInputError(
				`strike tick ${tick} outside the finite tick domain (1..POS_INF_TICK-1)`,
			);
		}
		return tick;
	}

	// New finite MINT boundaries must land on the market's coarser ADMISSION grid,
	// not merely the fine tick grid — the chain asserts exactly this
	// (`assert_admitted_mint_ticks`, `EInvalidAdmissionTick`). The ±inf sentinels are
	// exempt, and the market's reference tick is the one finite boundary allowed to
	// bypass the grid, so an off-grid tick is only rejected after confirming it is not
	// the reference (one extra read, and only on the failing path).
	async #assertAdmittedTick(tick: bigint, marketId: string, state: MarketState): Promise<void> {
		if (tick === 0n || tick === POS_INF_TICK) return;
		const multiple = state.admissionTickSizeRaw / state.tickSizeRaw;
		if (multiple > 0n && tick % multiple === 0n) return;
		const reference = await referenceTick(this.#client, this.#config, marketId);
		if (reference != null && reference === tick) return;
		const admission = fromRaw(state.admissionTickSizeRaw, 9);
		throw new PredictInputError(
			`strike ${fromRaw(tick * state.tickSizeRaw, 9)} is not on the ${admission} admission grid ` +
				`(mint boundaries must be a multiple of ${admission}, or the market's reference strike)`,
		);
	}

	// Resolve a descriptor's strike(s) to the (lower, higher) tick pair. A binary
	// numeric strike converts and validates against the tick grid; "reference"
	// reads the market's reference tick FRESH (never cached — it is unset early in
	// a window) and uses it directly: it is on the tick grid by construction. A
	// range descriptor converts both bounds to finite grid ticks ("reference" is
	// binary-only: a range has no single reference strike).
	async #strikeTicks(
		m: MarketDescriptor,
		marketId: string,
		state: MarketState,
	): Promise<{ lowerTick: bigint; higherTick: bigint }> {
		if (m.side === 'range') {
			if (!(m.lower < m.upper)) {
				throw new PredictInputError(`range lower ${m.lower} must be below upper ${m.upper}`);
			}
			const lowerTick = this.#gridTick(m.lower, state.tickSizeRaw);
			const higherTick = this.#gridTick(m.upper, state.tickSizeRaw);
			await this.#assertAdmittedTick(lowerTick, marketId, state);
			await this.#assertAdmittedTick(higherTick, marketId, state);
			return { lowerTick, higherTick };
		}
		if (m.strike !== 'reference') {
			const ticks = binaryRangeTicks(priceToRaw(m.strike), m.side, state.tickSizeRaw);
			await this.#assertAdmittedTick(ticks.lowerTick, marketId, state);
			await this.#assertAdmittedTick(ticks.higherTick, marketId, state);
			return ticks;
		}
		const tick = await referenceTick(this.#client, this.#config, marketId);
		if (tick == null) {
			throw new PredictInputError(
				`reference price not set yet for ${m.underlying} @ ${m.expiryMs} — retry shortly or pass a numeric strike`,
			);
		}
		return m.side === 'up'
			? { lowerTick: tick, higherTick: POS_INF_TICK }
			: { lowerTick: 0n, higherTick: tick };
	}

	// Raw payout quantity must land on a lot boundary — the chain rejects otherwise.
	#assertLot(quantityRaw: bigint): void {
		// From the config in play, not the exported testnet constant — a deployment with a
		// different `position_lot_size` must not be validated against testnet's.
		const lot = BigInt(this.cfg.units.positionLotSize);
		if (quantityRaw % lot !== 0n) {
			throw new PredictInputError(
				`quantity ${quantityRaw} raw is not a whole ${lot}-unit lot (position_lot_size)`,
			);
		}
	}

	// Whether the owner's account wrapper exists. A visitor without an account still gets a plan.
	async #hasAccount(owner: string): Promise<boolean> {
		const {
			objects: [wrapper],
		} = await this.#client.core.getObjects({ objectIds: [this.wrapperIdFor(owner)] });
		return !(wrapper instanceof Error);
	}

	// The slippage a plan applies, per $1 of payout, 1e9-scaled: the caller's, or the model band at
	// the quote's probability.
	static #appliedSlippage(
		opts: SlippageOptions,
		probabilityRaw: bigint,
		state: MarketQueueState,
		nowMs: bigint,
	): { raw: bigint; applied: AppliedSlippage } {
		const cents = opts.slippageCents ?? 'auto';
		if (cents !== 'auto') {
			if (!(Number.isFinite(cents) && cents >= 0 && cents <= 100)) {
				throw new PredictInputError(
					`slippageCents must be in [0, 100] cents per contract, got ${cents}`,
				);
			}
			// A cent is 1e7 in the 1e9-scaled price per $1 of payout.
			const raw = BigInt(Math.round(cents * 1e7));
			return { raw, applied: { cents: Number(raw) / 1e7, source: 'input', band: null } };
		}
		const policy = state.desk.policy;
		const band = slippageBand({
			// The band is undefined at the certain ends, where a queued mint is refused anyway.
			probability: Math.min(Math.max(rawToProbability(probabilityRaw), 1e-6), 1 - 1e-6),
			timeToExpiryMs: Number(state.expiryMs > nowMs ? state.expiryMs - nowMs : 0n),
			delayMs: Number(policy.delayMs),
			tickMs: Number(channelTickMs(policy.pythChannel)),
			k: opts.k,
		});
		const raw = BigInt(Math.ceil(band.deltaProbability * 1e9));
		return { raw, applied: { cents: Number(raw) / 1e7, source: 'auto', band } };
	}

	// Why the chain refused a plan's quote, as a typed refusal, or the chain's own error when it
	// can't tell. A market past its expiry has no live price (`ELivePricingExpired`). A mint the
	// chain refuses at the current price (`EOrderFailsLimits`) is diagnosed by `#entryBandRefusal`.
	async #quoteRefusal(
		error: unknown,
		mint?: { m: MarketDescriptor; quantityRaw?: bigint },
	): Promise<unknown> {
		if (isPastExpiry(error)) {
			return new PredictPreflightError(
				'past-cutoff',
				'the market reached its expiry, so it has no live price and takes no orders',
			);
		}
		if (mint != null && isOrderFailsLimits(error)) {
			return (await this.#entryBandRefusal(mint.m, mint.quantityRaw)) ?? error;
		}
		return error;
	}

	// Why the chain refused to quote a mint at the current price (`EOrderFailsLimits`), as a typed
	// refusal: a binary strike outside the market's entry band, or an exact quantity whose premium
	// is below the minimum. Null when neither explains it, or the diagnosis can't be read, so the
	// caller rethrows the chain's error.
	async #entryBandRefusal(
		m: MarketDescriptor,
		quantityRaw?: bigint,
	): Promise<PredictPreflightError | null> {
		if (m.side === 'range') return null;
		// Best effort: a failed diagnosis read leaves the chain's own error to the caller.
		const read = await Promise.all([this.read.price(m), this.read.feePolicy(m)]).catch(() => null);
		if (read == null) return null;
		const [prices, policy] = read;
		const probability = probabilityToRaw(m.side === 'up' ? prices.up : prices.down);
		if (probability < policy.minEntryProbability || probability > policy.maxEntryProbability) {
			return new PredictPreflightError(
				'entry-band',
				`the ${m.side} probability ${rawToProbability(probability)} is outside the market's entry band [${rawToProbability(policy.minEntryProbability)}, ${rawToProbability(policy.maxEntryProbability)}]: pick a strike nearer the money`,
			);
		}
		if (quantityRaw != null && (quantityRaw * probability) / 1_000_000_000n < MIN_PREMIUM) {
			return new PredictPreflightError(
				'min-premium',
				`${rawToUsdc(quantityRaw)} contracts cost a premium below the ${rawToUsdc(MIN_PREMIUM)} USDC minimum`,
			);
		}
		return null;
	}

	// A payout floor admission buys at least, for an all-in budget: the largest lot multiple up to
	// `startRaw` whose cost without the fee subsidy, by an exact chain quote, fits the budget.
	// Admission (`cost_qty_at`, no subsidy) first finds the largest quantity whose cost fits, and
	// cost rises with quantity, so that is at least this. A probe below the minimum premium
	// (`EOrderFailsLimits`) is retried once at the smallest quantity that clears it. Admission
	// searches again only when its fill costs more than its payout, a search rounding makes
	// non-monotone, so a floor whose payout is below the budget, about $1 a contract, is refused.
	async #admittedFloor(
		quoteAt: (quantityRaw: bigint) => Promise<MintQuoteRaw>,
		budgetRaw: bigint,
		startRaw: bigint,
		lot: bigint,
		entryProbabilityRaw: bigint,
	): Promise<{ quantity: bigint } | { refusal: 'min-premium' | 'cost-above-payout' }> {
		const ceilLot = (x: bigint) => ((x + lot - 1n) / lot) * lot;
		const minPremiumQuantity =
			entryProbabilityRaw === 0n
				? 0n
				: ceilLot((MIN_PREMIUM * 1_000_000_000n + entryProbabilityRaw - 1n) / entryProbabilityRaw);
		let quantity = startRaw;
		let raised = false;
		for (let probe = 0; probe < 5 && quantity > 0n; probe++) {
			let quote: MintQuoteRaw;
			try {
				quote = await quoteAt(quantity);
			} catch (e) {
				if (!isOrderFailsLimits(e)) throw e;
				if (!raised && quantity < minPremiumQuantity) {
					raised = true;
					quantity = minPremiumQuantity;
					continue;
				}
				return { refusal: quantity < minPremiumQuantity ? 'min-premium' : 'cost-above-payout' };
			}
			const unsubsidized = quote.allInCost - quote.penaltyFee + quote.feeIncentiveSubsidy;
			if (unsubsidized <= budgetRaw) {
				return quantity >= budgetRaw ? { quantity } : { refusal: 'cost-above-payout' };
			}
			// The smallest quantity that clears the minimum premium doesn't fit.
			if (raised) return { refusal: 'min-premium' };
			const next = ((quantity * budgetRaw) / unsubsidized / lot) * lot;
			quantity = next < quantity ? next : quantity - lot;
		}
		return { refusal: 'min-premium' };
	}

	// A budget mint's quote for no particular account. `quote_mint` has no all-in budget mode, so
	// this searches for the largest lot multiple whose all-in cost fits the budget. The first probe
	// is its premium-budget mode with the whole budget as the premium, whose premium clears the
	// 1 USDC minimum whenever the purchase can. Each next probe divides the budget by the last price
	// per contract. The price barely moves with size, so a few quotes settle it. A probe the chain
	// refuses (`EOrderFailsLimits`) ends the search with the best fit so far.
	async #searchBudgetQuote(
		ticks: { expiryMarketId: string; lowerTick: bigint; higherTick: bigint } & MarketFeeds,
		budgetRaw: bigint,
		lot: bigint,
	): Promise<MintQuoteRaw> {
		const floorLot = (x: bigint) => (x / lot) * lot;
		const probeQuote = async (request: AnonymousMintQuoteRequest) => {
			try {
				return (await quoteMintAnonymous(this.#client, this.#config, { ...ticks, request })).quote;
			} catch (e) {
				if (isOrderFailsLimits(e)) return null;
				throw e;
			}
		};
		let best: MintQuoteRaw | null = null;
		let quote = await probeQuote({
			shape: 'exact-amount',
			maxPremiumRaw: budgetRaw,
			minQuantityRaw: lot,
		});
		for (let probe = 1; quote != null; probe++) {
			const cost = quote.allInCost - quote.penaltyFee;
			if (cost <= budgetRaw && (best == null || quote.quantity > best.quantity)) best = quote;
			if (probe === 4) break;
			const next = cost === 0n ? quote.quantity : floorLot((budgetRaw * quote.quantity) / cost);
			if (next === 0n || next === quote.quantity) break;
			quote = await probeQuote({ shape: 'exact-quantity', quantityRaw: next });
		}
		if (best == null) {
			throw new PredictPreflightError(
				'min-premium',
				`a budget of ${rawToUsdc(budgetRaw)} buys no payout at the current price (a mint's premium must be at least ${rawToUsdc(MIN_PREMIUM)} USDC)`,
			);
		}
		return best;
	}

	// The PredictPreflightError code a check throws, or null when it passes.
	static #refusal(check: () => void): PredictPreflightCode | null {
		try {
			check();
			return null;
		} catch (e) {
			if (e instanceof PredictPreflightError) return e.code;
			throw e;
		}
	}

	// Shared construction for tx.mint and read.quoteMint. The quote dry-runs the
	// same mint the trade sends; quoteMint omits the caller's cost/probability caps
	// (they only gate via abort and don't change the receipt numbers).
	async #buildMint(owner: string, m: MarketDescriptor, opts: MintOptions): Promise<Transaction> {
		const feeds = this.#feeds(m.underlying);
		const { id, state } = await this.#resolveMarket(m);
		const quantityRaw = usdcToRaw(opts.quantity);
		this.#assertLot(quantityRaw);
		const { lowerTick, higherTick } = await this.#strikeTicks(m, id, state);
		return txOf(
			mintExactQuantity(this.#config, {
				expiryMarketId: id,
				wrapperId: this.wrapperIdFor(owner),
				lowerTick,
				higherTick,
				quantityRaw,
				maxCostRaw: opts.maxCost != null ? usdcToRaw(opts.maxCost) : undefined,
				maxProbabilityRaw:
					opts.maxProbability != null ? probabilityToRaw(opts.maxProbability) : undefined,
				...feeds,
			}),
		);
	}

	async #buildMintCost(
		owner: string,
		m: MarketDescriptor,
		opts: MintCostOptions,
	): Promise<Transaction> {
		const feeds = this.#feeds(m.underlying);
		const maxCostRaw = usdcToRaw(opts.spend);
		const minQuantityRaw = usdcToRaw(opts.minQuantity);
		const { id, state } = await this.#resolveMarket(m);
		const { lowerTick, higherTick } = await this.#strikeTicks(m, id, state);
		return txOf(
			mintExactCost(this.#config, {
				expiryMarketId: id,
				wrapperId: this.wrapperIdFor(owner),
				lowerTick,
				higherTick,
				maxCostRaw,
				minQuantityRaw,
				...feeds,
			}),
		);
	}

	async #quoteMintTransaction(owner: string, tx: Transaction): Promise<MintQuote> {
		const events = await simulateWithEvents(this.#client, tx, owner);
		const r = exactlyOne(decodeMints(this.cfg, { events }), 'OrderMinted');
		// Mirrors the deployed `compute_mint_quote`'s all_in_cost exactly:
		// premium + (trading − subsidy) + builder + penalty + inventory-impact.
		// `referral_fee` is deliberately NOT added — it is a portion OF the
		// trader-paid trading fee and congestion surcharge, not an extra debit.
		const costRaw =
			r.raw.premium +
			(r.raw.tradingFee - r.raw.feeIncentiveSubsidy) +
			r.raw.builderFee +
			r.raw.penaltyFee +
			r.raw.inventoryImpactCharge;
		return {
			entryProbability: r.entryProbability,
			premium: r.premium,
			fees: r.fees,
			cost: rawToUsdc(costRaw),
			quantity: r.quantity,
			raw: {
				premium: r.raw.premium,
				cost: costRaw,
				quantity: r.raw.quantity,
				entryProbability: r.raw.entryProbability,
			},
			feesExact: true,
		};
	}

	// Shared construction for tx.redeem and read.quoteRedeem.
	async #buildRedeem(owner: string, m: MarketDescriptor, opts: CloseOptions): Promise<Transaction> {
		const feeds = this.#feeds(m.underlying);
		const { id } = await this.#resolveMarket(m);
		const closeQuantityRaw = usdcToRaw(opts.quantity);
		this.#assertLot(closeQuantityRaw);
		return txOf(
			redeemLive(this.#config, {
				expiryMarketId: id,
				wrapperId: this.wrapperIdFor(owner),
				orderId: opts.orderId,
				closeQuantityRaw,
				...feeds,
			}),
		);
	}

	// Raw strike for anonymous pricing: numeric strikes validate against the tick
	// grid; "reference" reads the market's reference tick fresh (unset → typed error).
	async #strikeRawFor(
		m: BinaryMarketCoordinates,
		marketId: string,
		state: MarketState,
	): Promise<bigint> {
		if (m.strike !== 'reference') {
			// Same validation as the mint path: on the grid AND inside the finite tick
			// domain (0 / POS_INF are the ±inf sentinels, not quotable strikes).
			return this.#gridTick(m.strike, state.tickSizeRaw) * state.tickSizeRaw;
		}
		const tick = await referenceTick(this.#client, this.#config, marketId);
		if (tick == null) {
			throw new PredictInputError(
				`reference price not set yet for ${m.underlying} @ ${m.expiryMs} — retry shortly or pass a numeric strike`,
			);
		}
		return tick * state.tickSizeRaw;
	}

	// === delayed execution (DBU-885) ===

	// The config slice the queue calls take, or a typed refusal: without the Predict upgrade, the
	// order-flow companion and its desk, this SDK version has no record of delayed execution on the
	// network, and the queue calls would address the wrong package or decode nothing.
	#requireDelayedExecution(): OrdersGeneratedConfig {
		return toOrdersConfig(this.cfg);
	}

	// Whether the config records delayed execution, without throwing.
	#recordsDelayedExecution(): boolean {
		const { predictDelayedExecution, predictOrders } = this.cfg.packages;
		const { orderDesk, queueRegistry } = this.cfg.objects;
		return Boolean(predictDelayedExecution && predictOrders && orderDesk && queueRegistry);
	}

	// The market's queue ID, once its `MarketQueue` is known to exist. A missing queue would abort
	// every read and order with an opaque error, so it is refused here with a typed one.
	async #existingQueueId(orders: OrdersGeneratedConfig, marketId: string): Promise<string> {
		const queueId = deriveQueueId(orders.queueRegistry, marketId);
		if (this.#knownQueues.has(queueId)) return queueId;
		const {
			objects: [queue],
		} = await this.#client.core.getObjects({ objectIds: [queueId] });
		if (queue instanceof Error) {
			throw new PredictPreflightError(
				'no-queue',
				`market ${marketId} has no order queue yet (\`queue::create_and_share\` hasn't run for it)`,
			);
		}
		this.#knownQueues.add(queueId);
		return queueId;
	}

	async #queueState(
		orders: OrdersGeneratedConfig,
		marketId: string,
		opts: { owner?: string; recordIds?: bigint[] } = {},
	): Promise<MarketQueueState> {
		const queueId = await this.#existingQueueId(orders, marketId);
		return marketQueueState(this.#client, orders, marketId, {
			owner: opts.owner,
			quoteCoinType: this.cfg.quoteCoinType,
			recordIds: opts.recordIds,
			queueId,
		});
	}

	// The queue gates every enqueue passes: Predict's order-flow allowlist and cutover, the
	// pauses, then the queue's own (`begin_enqueue`): the stuck gate, capacity, the per-account
	// cap, and the cutoff on the previewed τ. Throws the matching PredictPreflightError.
	#assertQueueOpen(
		state: MarketQueueState,
		side: 'mint' | 'sell',
		nowMs: bigint,
	): { policy: DelayedExecutionPolicy; timing: TimingPreview } {
		const policy = state.desk.policy;
		if (!state.protocol.orderFlowEnabled) {
			throw new PredictPreflightError(
				'not-live',
				"queued orders aren't live yet: the protocol hasn't enabled the order-flow package",
			);
		}
		const mode = executionModeFor(state.protocol.versionWatermark, true);
		if (mode === 'retired') {
			throw new PredictPreflightError(
				'retired',
				'the Predict package version this SDK calls is retired: update the SDK',
			);
		}
		if (mode !== 'delayed') {
			throw new PredictPreflightError(
				'not-live',
				"queued orders aren't live yet: the protocol's version watermark hasn't been raised",
			);
		}
		if (state.desk.versionWatermark > ORDER_FLOW_PACKAGE_VERSION) {
			throw new PredictPreflightError(
				'retired',
				'the order-flow package version this SDK calls is retired: update the SDK',
			);
		}
		if (state.protocol.frozen) throw new PredictPreflightError('paused', 'the protocol is frozen');
		if (side === 'mint' && (state.protocol.tradingPaused || state.mintPaused)) {
			throw new PredictPreflightError('paused', 'minting is paused on this market');
		}
		if (state.stuck) {
			throw new PredictPreflightError(
				'stuck',
				'pricing is delayed for this market, try again shortly',
			);
		}
		const [pending, capacity] =
			side === 'mint'
				? [state.pending.mints, policy.mintCapacity]
				: [state.pending.sells, policy.sellCapacity];
		if (pending >= capacity) {
			throw new PredictPreflightError(
				'queue-full',
				`the market has ${pending} waiting ${side}s, its maximum`,
			);
		}
		if (state.account && state.account.waitingOrders >= policy.perAccountCap) {
			throw new PredictPreflightError(
				'account-cap',
				`the account already has ${state.account.waitingOrders} waiting orders in this market, its maximum`,
			);
		}
		const timing = previewTiming({
			nowMs,
			policy,
			heads: state.heads,
			expiryMs: state.expiryMs,
			noTradeWindowMs: state.protocol.noTradeWindowMs,
		});
		if (!timing.beforeCutoff) {
			throw new PredictPreflightError(
				'past-cutoff',
				'this market no longer takes orders before its expiry',
			);
		}
		return { policy, timing };
	}

	#preview(
		marketId: string,
		kind: number,
		timing: TimingPreview,
		policy: DelayedExecutionPolicy,
		budget: bigint,
		cashNeedRaw: bigint,
		spareCashRaw: bigint,
		funding: { needsFunding: boolean; fundedInTransaction: boolean },
	): QueuedOrderPreview {
		const totalDebit = budget + policy.orderFee;
		return {
			marketId,
			kind,
			kindName: orderKindName(kind),
			timing,
			orderFee: rawToUsdc(policy.orderFee),
			budget: rawToUsdc(budget),
			totalDebit: rawToUsdc(totalDebit),
			cashNeedRaw,
			spareCashRaw,
			...funding,
			raw: { orderFee: policy.orderFee, budget, totalDebit },
		};
	}

	// Shared by the three queued mints: resolve the market and ticks, build the enqueue (its static
	// checks run first), then one read for the preflight: queue gates, fee, budget, cash need.
	async #planMint(
		owner: string,
		m: MarketDescriptor,
		order: { kind: number; maxCostRaw: bigint; quantityRaw?: bigint; maxPremiumRaw?: bigint },
		build: (
			orders: OrdersGeneratedConfig,
			target: {
				expiryMarketId: string;
				wrapperId: string;
				lowerTick: bigint;
				higherTick: bigint;
			} & MarketFeeds,
		) => (tx: Transaction) => TransactionResult,
	): Promise<QueuedOrderPlan> {
		const orders = this.#requireDelayedExecution();
		const feeds = this.#feeds(m.underlying);
		const { id, state: market } = await this.#resolveMarket(m);
		const { lowerTick, higherTick } = await this.#strikeTicks(m, id, market);
		const thunk = build(orders, {
			expiryMarketId: id,
			wrapperId: this.wrapperIdFor(owner),
			lowerTick,
			higherTick,
			...feeds,
		});
		const state = await this.#queueState(orders, id, { owner });
		const { policy, timing } = this.#assertQueueOpen(state, 'mint', BigInt(Date.now()));
		const { budget, cashNeed } = PredictClient.#assertMintOrder(state, policy, order);
		// The enqueue charges the desk's fee at execution, so hold it to the previewed one.
		const tx = new Transaction();
		tx.add(assertOrderFeeAtMost(orders, policy.orderFee));
		tx.add(thunk);
		return {
			transaction: tx,
			preview: this.#preview(id, order.kind, timing, policy, budget, cashNeed, state.spareCash, {
				needsFunding: false,
				fundedInTransaction: false,
			}),
		};
	}

	// A mint's own checks after the queue gates, shared by the mint builders and `read.planMint`:
	// the order fee, the escrowed budget against the minimum premium, and the market's cash.
	static #assertMintOrder(
		state: MarketQueueState,
		policy: DelayedExecutionPolicy,
		order: { kind: number; maxCostRaw: bigint; quantityRaw?: bigint; maxPremiumRaw?: bigint },
	): { budget: bigint; cashNeed: bigint } {
		const available = state.account?.availableRaw ?? 0n;
		const budget = mintBudget({
			kind: order.kind,
			maxCostRaw: order.maxCostRaw,
			availableRaw: available,
			orderFeeRaw: policy.orderFee,
			quantityRaw: order.quantityRaw,
		});
		if (budget == null) {
			throw new PredictPreflightError(
				'fee',
				`the balance (${rawToUsdc(available)}) doesn't cover the ${rawToUsdc(policy.orderFee)} order fee`,
			);
		}
		if (budget < MIN_PREMIUM) {
			throw new PredictPreflightError(
				'min-premium',
				`the escrowed budget ${rawToUsdc(budget)} is below the ${rawToUsdc(MIN_PREMIUM)} minimum premium`,
			);
		}
		if (order.kind !== ORDER_KIND.EXACT_QUANTITY && state.minEntryProbability === 0n) {
			throw new PredictPreflightError('market-cash', 'this market takes no budget mints');
		}
		const cashNeed = mintCashNeed({
			kind: order.kind,
			budgetRaw: budget,
			minEntryProbability: state.minEntryProbability,
			quantityRaw: order.quantityRaw,
			maxPremiumRaw: order.maxPremiumRaw,
		});
		if (cashNeed > state.spareCash) {
			throw new PredictPreflightError(
				'market-cash',
				"this market can't take an order this size right now",
			);
		}
		return { budget, cashNeed };
	}

	// The record a sell names is Open. The chain can't even quote one that isn't (`ERecordNotOpen`).
	static #assertRecordOpen(state: MarketQueueState, recordId: bigint): QueuedOrder {
		const record = state.records[0];
		if (!record || record.status !== ORDER_STATUS.OPEN || record.position.order_id === 0n) {
			throw new PredictPreflightError(
				'record-not-open',
				`record ${recordId} isn't an Open position`,
			);
		}
		return record;
	}

	// The quantity an Open record holds, refusing a sell of more than that.
	#assertSellQuantity(record: QueuedOrder, closeQuantityRaw: bigint): bigint {
		const held = decodeOrderRange(
			record.position.order_id,
			BigInt(this.cfg.units.positionLotSize),
		).quantity;
		if (closeQuantityRaw > held) {
			throw new PredictInputError(
				`quantity ${rawToUsdc(closeQuantityRaw)} is above the record's ${rawToUsdc(held)}`,
			);
		}
		return held;
	}

	// A sell's own checks after the queue gates, shared by `tx.enqueueSell` and `read.planSell`: the
	// record is Open and the owner's, the order fee, the record's quantity and the minimum sell. A
	// sell is never refused for market cash.
	#assertSellOrder(
		state: MarketQueueState,
		policy: DelayedExecutionPolicy,
		recordId: bigint,
		closeQuantityRaw: bigint,
	): void {
		const record = PredictClient.#assertRecordOpen(state, recordId);
		if (
			!state.account ||
			normalizeSuiAddress(record.account_id) !== normalizeSuiAddress(state.account.accountId)
		) {
			throw new PredictPreflightError(
				'not-record-owner',
				`record ${recordId} belongs to another account`,
			);
		}
		if (!feeCovered('sell', state.account.availableRaw, policy.orderFee)) {
			throw new PredictPreflightError(
				'fee',
				`the balance doesn't cover the ${rawToUsdc(policy.orderFee)} order fee`,
			);
		}
		const held = this.#assertSellQuantity(record, closeQuantityRaw);
		const min = policy.minSellQuantity;
		if (closeQuantityRaw < min || (closeQuantityRaw < held && held - closeQuantityRaw < min)) {
			throw new PredictPreflightError(
				'below-min-sell',
				`a sell must close at least ${rawToUsdc(min)} and leave either nothing or at least that much`,
			);
		}
	}

	async #planSell(
		owner: string,
		m: MarketCoordinates,
		opts: EnqueueSellOptions,
	): Promise<QueuedOrderPlan> {
		const orders = this.#requireDelayedExecution();
		const feeds = this.#feeds(m.underlying);
		const { id } = await this.#resolveMarket(m);
		const closeQuantityRaw = usdcToRaw(opts.quantity);
		this.#assertLot(closeQuantityRaw);
		const thunk = enqueueRedeemOpen(orders, {
			expiryMarketId: id,
			wrapperId: this.wrapperIdFor(owner),
			recordId: opts.recordId,
			closeQuantityRaw,
			minProbabilityRaw: probabilityToRaw(opts.minProbability),
			minProceedsRaw: usdcToRaw(opts.minProceeds),
			...feeds,
		});
		const state = await this.#queueState(orders, id, { owner, recordIds: [opts.recordId] });
		const { policy, timing } = this.#assertQueueOpen(state, 'sell', BigInt(Date.now()));
		this.#assertSellOrder(state, policy, opts.recordId, closeQuantityRaw);
		const cashNeed = cashNeedSell(closeQuantityRaw, state.backingBufferLambda);
		const needsFunding = cashNeed > state.spareCash;
		const fund = opts.fundMarket ?? 'auto';
		const funded = fund === 'always' || (fund === 'auto' && needsFunding);
		const tx = new Transaction();
		// The enqueue charges the desk's fee at execution, so hold it to the previewed one.
		tx.add(assertOrderFeeAtMost(orders, policy.orderFee));
		tx.add(thunk);
		// After the enqueue: its cash need is then in `waiting_cash_need`, which the rebalance funds.
		if (funded) tx.add(rebalanceExpiryCash(this.#config, { expiryMarketId: id }));
		return {
			transaction: tx,
			preview: this.#preview(
				id,
				ORDER_KIND.REDEEM_OPEN,
				timing,
				policy,
				0n,
				cashNeed,
				state.spareCash,
				{
					needsFunding,
					fundedInTransaction: funded,
				},
			),
		};
	}

	// A chain mint quote as a queued-fill preview: the congestion penalty comes out of the cost
	// (a queued fill pays none) and the order fee is reported separately.
	static #queuedMintQuote(q: MintQuoteRaw, policy: DelayedExecutionPolicy | null): MintQuote {
		const costRaw = q.allInCost - q.penaltyFee;
		return {
			entryProbability: rawToProbability(q.entryProbability),
			premium: rawToUsdc(q.premium),
			fees: {
				trading: rawToUsdc(q.tradingFee),
				subsidy: rawToUsdc(q.feeIncentiveSubsidy),
				builder: rawToUsdc(q.builderFee),
				penalty: 0,
				// The chain quote doesn't split it out. It is part of `trading`, never extra.
				referral: 0,
				inventoryImpact: rawToUsdc(q.inventoryImpactCharge),
			},
			cost: rawToUsdc(costRaw),
			quantity: rawToUsdc(q.quantity),
			raw: {
				premium: q.premium,
				cost: costRaw,
				quantity: q.quantity,
				entryProbability: q.entryProbability,
			},
			feesExact: true,
			queued: true,
			orderFee: policy ? rawToUsdc(policy.orderFee) : undefined,
		};
	}

	// === tx builders ===
	// Each returns a ready-to-sign Transaction. Market-resolving builders are async.
	readonly tx = {
		createManager: (): Transaction => txOf(accountContract(this.cfg).createAccount()),

		// `create: true` composes first-time funding into ONE PTB: create the account
		// wrapper, deposit into it through the fresh handle, and `share` it LAST (once
		// shared, by-value use of the handle is over). The wrapper is derived from the
		// transaction SENDER (`account_registry::new` takes no owner), so `owner` MUST
		// be the address that signs this transaction — a sponsored/backend signer would
		// silently fund its own fresh account instead. The caller also asserts the
		// account does not exist yet: `new` ABORTS at the deterministic address if it
		// already exists — no chain read is done here. Gate on your own existence check
		// (`wrapperIdFor(owner)` + a getObject), or retry without the flag on that abort.
		//
		// Without `create`, the sourced coin goes into the existing account's stored
		// balance via the PTB-callable `deposit_funds` (folds settle → authorize → load →
		// deposit; clock auto-injected). Command order is auth → deposit (auth is a hot
		// potato consumed by the deposit). See
		// `packages/account/sources/account.move` (`deposit_funds`).
		deposit: (
			owner: string,
			amountUsdc: number | string,
			opts?: { create?: boolean },
		): Transaction => {
			const tx = new Transaction();
			const coin = tx.add(
				coinWithBalance({
					type: this.cfg.quoteCoinType,
					balance: usdcToRaw(amountUsdc),
					useGasCoin: false,
				}),
			);
			if (opts?.create) {
				tx.add(
					accountContract(this.cfg).createAccountAndDeposit({
						coin,
						coinType: this.cfg.quoteCoinType,
					}),
				);
			} else {
				tx.add(
					depositFunds({
						config: this.#config,
						arguments: { wrapper: this.wrapperIdFor(owner), coin },
						typeArguments: [this.cfg.quoteCoinType],
					}),
				);
			}
			return tx;
		},

		// Withdraw `amountUsdc` from the account back to `owner`. By default the funds land
		// in the owner's USDC *address balance* (the versionless accumulator) via
		// `0x2::coin::send_funds` — no coin-object churn, and they merge into the same
		// balance `deposit` draws from, closing the loop. Pass `{ toCoinObject: true }` to
		// instead receive a discrete `Coin<T>` object (for wallets/explorers that only
		// render coin objects, or to compose the coin further in your own PTB). Either way
		// the underlying `withdraw_funds` returns the raw `Coin<T>` — the PTB-callable form
		// that folds settle → authorize → load → withdraw (clock auto-injected, `ctx`
		// implicit); command order is auth → withdraw. See
		// `packages/account/sources/account.move` (`withdraw_funds`).
		withdraw: (
			owner: string,
			amountUsdc: number | string,
			opts?: { toCoinObject?: boolean },
		): Transaction => {
			const tx = new Transaction();
			const coin = tx.add(
				withdrawFunds({
					config: this.#config,
					arguments: { wrapper: this.wrapperIdFor(owner), amount: usdcToRaw(amountUsdc) },
					typeArguments: [this.cfg.quoteCoinType],
				}),
			);
			if (opts?.toCoinObject) {
				tx.transferObjects([coin], owner);
			} else {
				tx.moveCall({
					target: '0x2::coin::send_funds',
					typeArguments: [this.cfg.quoteCoinType],
					arguments: [coin, tx.pure.address(owner)],
				});
			}
			return tx;
		},

		/**
		 * Immediate exact-quantity mint (`mint_exact_quantity`).
		 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
		 * (`EDelayedExecutionRequired`), so it works only while the config calls a pre-v4 package.
		 * Use {@link PredictClient.tx.enqueueMint}, and `read.executionMode()` to know which path a
		 * network is on.
		 */
		mint: (owner: string, m: MarketDescriptor, opts: MintOptions): Promise<Transaction> =>
			this.#buildMint(owner, m, opts),

		/**
		 * V2 all-in budget mint; use minQuantity to protect the fill against slippage.
		 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
		 * (`EDelayedExecutionRequired`). Use `tx.enqueueMintCost`.
		 */
		mintCost: (owner: string, m: MarketDescriptor, opts: MintCostOptions): Promise<Transaction> =>
			this.#buildMintCost(owner, m, opts),

		/**
		 * Immediate premium-budget mint (`mint_exact_amount`).
		 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
		 * (`EDelayedExecutionRequired`). Use `tx.enqueueMintAmount`.
		 */
		mintAmount: async (
			owner: string,
			m: MarketDescriptor,
			opts: MintAmountOptions,
		): Promise<Transaction> => {
			const feeds = this.#feeds(m.underlying);
			// The chain requires a positive all-in cost cap (EMintCostCapRequired);
			// reject a zero cap pre-flight rather than surface a cryptic Move abort.
			if (opts.maxCost != null && opts.maxCost <= 0) {
				throw new PredictInputError('maxCost must be > 0');
			}
			const { id, state } = await this.#resolveMarket(m);
			// No lot check: min_quantity is a floor the chain compares against an
			// already-lot-floored minted quantity, so any floor value is legal.
			const minQuantityRaw = usdcToRaw(opts.minQuantity);
			const { lowerTick, higherTick } = await this.#strikeTicks(m, id, state);
			return txOf(
				mintExactAmount(this.#config, {
					expiryMarketId: id,
					wrapperId: this.wrapperIdFor(owner),
					lowerTick,
					higherTick,
					maxPremiumRaw: usdcToRaw(opts.spend),
					minQuantityRaw,
					maxCostRaw: opts.maxCost != null ? usdcToRaw(opts.maxCost) : undefined,
					...feeds,
				}),
			);
		},

		/**
		 * Immediate close of an account position (`redeem_live`).
		 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
		 * (`EDelayedExecutionRequired`). A position held in the account then has no early exit and
		 * is paid at settlement with `claimSettled`. Queued fills are Open records in the market's
		 * queue, sold with `tx.enqueueSell`.
		 */
		redeem: (owner: string, m: MarketDescriptor, opts: CloseOptions): Promise<Transaction> =>
			this.#buildRedeem(owner, m, opts),

		/**
		 * Pay a settled position held in the ACCOUNT (`redeem_settled`), in full. Unchanged by delayed
		 * execution, for positions minted before it. It doesn't pay Open queue records: the queue's
		 * settlement walk (`settle_step`) pays those to the account's wrapper address.
		 */
		claimSettled: async (
			owner: string,
			m: Pick<MarketDescriptor, 'underlying' | 'expiryMs' | 'marketId'>,
			opts: Pick<CloseOptions, 'orderId'>,
		): Promise<Transaction> => {
			const { id } = await this.#resolveMarket(m);
			return txOf(
				redeemSettled(this.#config, {
					expiryMarketId: id,
					wrapperId: this.wrapperIdFor(owner),
					orderId: opts.orderId,
				}),
			);
		},

		// --- delayed execution (DBU-885) ---
		// Each queued-order builder reads the market once and refuses, with a typed
		// PredictPreflightError, an order the queue or protocol gates would abort, so a refused order
		// never fails a larger transaction. The order's own limits at the current price are checked
		// only on chain. It returns the transaction and a display preview. Every builder throws
		// PredictInputError while the network's config doesn't record delayed execution.

		/**
		 * Queue a mint of an exact payout quantity, filled at Pyth's price for its τ. Escrows
		 * `min(maxCost, quantity, available − fee)` plus the order fee. `maxCost` and
		 * `maxProbability` are required caps (see `queue.slippageBand`). Size against
		 * `read.queue(...).maxMint`. The record ID is in the enqueue's `OrderEnqueued`
		 * (`decode.enqueue`).
		 */
		enqueueMint: async (
			owner: string,
			m: MarketDescriptor,
			opts: EnqueueMintOptions,
		): Promise<QueuedOrderPlan> => {
			const quantityRaw = usdcToRaw(opts.quantity);
			this.#assertLot(quantityRaw);
			const maxCostRaw = usdcToRaw(opts.maxCost);
			const maxProbabilityRaw = probabilityToRaw(opts.maxProbability);
			return this.#planMint(
				owner,
				m,
				{ kind: ORDER_KIND.EXACT_QUANTITY, maxCostRaw, quantityRaw },
				(orders, target) =>
					enqueueExactQuantity(orders, {
						...target,
						quantityRaw,
						maxCostRaw,
						maxProbabilityRaw,
					}),
			);
		},

		/**
		 * Queue a premium-budget mint: sized at τ under `spend`, at least `minQuantity`, with the
		 * all-in debit capped by the required `maxCost`.
		 */
		enqueueMintAmount: async (
			owner: string,
			m: MarketDescriptor,
			opts: EnqueueMintAmountOptions,
		): Promise<QueuedOrderPlan> => {
			const maxPremiumRaw = usdcToRaw(opts.spend);
			const minQuantityRaw = usdcToRaw(opts.minQuantity);
			const maxCostRaw = usdcToRaw(opts.maxCost);
			// The fill buys at most `spend` of premium, so a spend below the minimum premium fails
			// the chain's placement dry run whatever the budget. Refused before any read.
			if (maxPremiumRaw < MIN_PREMIUM) {
				throw new PredictPreflightError(
					'min-premium',
					`spend ${rawToUsdc(maxPremiumRaw)} is below the ${rawToUsdc(MIN_PREMIUM)} minimum premium`,
				);
			}
			return this.#planMint(
				owner,
				m,
				{ kind: ORDER_KIND.EXACT_AMOUNT, maxCostRaw, maxPremiumRaw },
				(orders, target) =>
					enqueueExactAmount(orders, {
						...target,
						maxPremiumRaw,
						minQuantityRaw,
						maxCostRaw,
					}),
			);
		},

		/**
		 * Queue an all-in-budget mint (the default mint): sized at τ so the all-in cost fits
		 * `spend`, at least `minQuantity`. Escrows `min(spend, available − fee)` plus the order fee.
		 */
		enqueueMintCost: async (
			owner: string,
			m: MarketDescriptor,
			opts: EnqueueMintCostOptions,
		): Promise<QueuedOrderPlan> => {
			const maxCostRaw = usdcToRaw(opts.spend);
			const minQuantityRaw = usdcToRaw(opts.minQuantity);
			return this.#planMint(
				owner,
				m,
				{ kind: ORDER_KIND.EXACT_COST, maxCostRaw },
				(orders, target) => enqueueExactCost(orders, { ...target, maxCostRaw, minQuantityRaw }),
			);
		},

		/**
		 * Queue an early sell of an Open record (`enqueue_redeem_open`), the only early sell in v4.
		 * The record must be Open and the owner's. Sells are never refused for market cash: when the
		 * sell's cash need is above spare cash the preview sets `needsFunding`, and by default the
		 * builder adds `rebalance_expiry_cash` after the enqueue (see `fundMarket`). A sell the market
		 * still can't cover at the fill is refunded in full (reason 8) and the position returns to an
		 * Open record.
		 */
		enqueueSell: (
			owner: string,
			m: MarketCoordinates,
			opts: EnqueueSellOptions,
		): Promise<QueuedOrderPlan> => this.#planSell(owner, m, opts),

		/**
		 * Queue the order a `read.planMint` or `read.planSell` plan describes, with its limits:
		 * `enqueueMintCost`, `enqueueMint` or `enqueueSell`, by `plan.order.builder`. Pass the
		 * market the plan was made for. Throws the plan's `refusal` as a `PredictPreflightError`,
		 * and `'fee'` when the balance now escrows less than the plan's budget.
		 */
		enqueuePlan: async (
			owner: string,
			m: MarketDescriptor,
			plan: MintPlan | SellPlan,
		): Promise<QueuedOrderPlan> => {
			// A plan that reported a refusal is refused the same way, so the two never disagree.
			// Plan again once the reason clears.
			if (plan.refusal != null) {
				throw new PredictPreflightError(plan.refusal, `the plan was refused (${plan.refusal})`);
			}
			// A plan's limits fit one order. Queued for another owner, market, strike or record, they
			// would buy or sell a different contract, so plan that order instead.
			const target = plan.target;
			const { id, state: marketState } = await this.#resolveMarket(m);
			if (normalizeSuiAddress(owner) !== normalizeSuiAddress(target.owner)) {
				throw new PredictInputError(`the plan was made for owner ${target.owner}, not ${owner}`);
			}
			if (normalizeSuiAddress(id) !== normalizeSuiAddress(target.expiryMarketId)) {
				throw new PredictInputError(
					`the plan was made for market ${target.expiryMarketId}, not ${id}`,
				);
			}
			const order = plan.order;
			if (order.builder === 'enqueueSell') {
				if (order.options.recordId !== target.recordId) {
					throw new PredictInputError(
						`the plan was made for record ${target.recordId}, not ${order.options.recordId}`,
					);
				}
			} else {
				const { lowerTick, higherTick } = await this.#strikeTicks(m, id, marketState);
				if (lowerTick !== target.lowerTick || higherTick !== target.higherTick) {
					throw new PredictInputError(
						'the market descriptor names a different strike or side than the plan, or its reference strike moved: plan again',
					);
				}
			}
			const placed =
				order.builder === 'enqueueSell'
					? await this.tx.enqueueSell(owner, m, order.options)
					: order.builder === 'enqueueMintCost'
						? await this.tx.enqueueMintCost(owner, m, order.options)
						: await this.tx.enqueueMint(owner, m, order.options);
			// The plan's debit, and a sell's net, assume the order fee it was quoted with. The builders
			// read the desk's fee again, and no order argument bounds it on chain, so refuse a fee
			// that rose since the plan.
			if (placed.preview.raw.orderFee > plan.raw.orderFee) {
				throw new PredictInputError(
					`the order fee rose from ${rawToUsdc(plan.raw.orderFee)} to ${placed.preview.orderFee} since the plan: plan again`,
				);
			}
			if (order.builder === 'enqueueSell') return placed;
			// The limits assume the plan's whole budget. The builders escrow less when the balance
			// fell since the plan, so refuse that instead.
			const planned = (plan as MintPlan).raw.budget;
			if (placed.preview.raw.budget < planned) {
				throw new PredictPreflightError(
					'fee',
					`the balance now escrows ${placed.preview.budget}, below the plan's ${rawToUsdc(planned)}`,
				);
			}
			return placed;
		},

		/**
		 * Refund this market's orders past their deadline. For the app's "Refund my order" button
		 * only (`OrderView.canRequestRefund`), never prepended to other transactions: keepers
		 * refund on their own. Needs no account, session or Pyth key, and works during a freeze.
		 * `maxOrders` (default 100) bounds the records visited.
		 */
		refund: async (
			m: MarketCoordinates,
			opts: { maxOrders?: number } = {},
		): Promise<Transaction> => {
			const orders = this.#requireDelayedExecution();
			const { id } = await this.#resolveMarket(m);
			const queueId = await this.#existingQueueId(orders, id);
			return txOf(
				refund(orders, {
					expiryMarketId: id,
					queueId,
					maxOrders: BigInt(opts.maxOrders ?? 100),
				}),
			);
		},

		/**
		 * Send a finished record's parked funds to its receive address (`queue::claim_parked`): a
		 * refund or change the address couldn't take while it was on USDC's deny list or USDC was
		 * paused (`OrderView` `parkedRaw`). A skipped settlement payout isn't parked: pay it with
		 * `payOpen`. Permissionless, and a no-op returning 0 while
		 * the address is still denied. Needs no account, session or Pyth key.
		 */
		claimParked: async (m: MarketCoordinates, recordId: bigint): Promise<Transaction> => {
			const orders = this.#requireDelayedExecution();
			const { id } = await this.#resolveMarket(m);
			const queueId = await this.#existingQueueId(orders, id);
			return txOf(claimParked(orders, { expiryMarketId: id, queueId, recordId }));
		},

		/**
		 * Pay a settled market's Open record that the payout walk skipped (`queue::pay_open`), for
		 * example while its receive address was denied. Permissionless: the payout goes only to the
		 * record's own receive address. Aborts `EMarketNotSettled` before settlement.
		 */
		payOpen: async (m: MarketCoordinates, recordId: bigint): Promise<Transaction> => {
			const orders = this.#requireDelayedExecution();
			const { id } = await this.#resolveMarket(m);
			const queueId = await this.#existingQueueId(orders, id);
			return txOf(payOpen(orders, { expiryMarketId: id, queueId, recordId }));
		},

		/**
		 * The open filler: verify signed Pyth Lazer payloads, commit them to the market's waiting
		 * cohorts, then resolve up to `maxOrders` (default 15) records. Reads the current Lazer
		 * package from Lazer's `State` first (`lazerStateId`, or `config.oracle.pythLazerState`).
		 */
		fill: async (
			m: MarketCoordinates,
			opts: {
				payloads: readonly Uint8Array[];
				maxOrders?: number;
				refundOverdue?: boolean;
				lazerStateId?: string;
			},
		): Promise<Transaction> => {
			const orders = this.#requireDelayedExecution();
			const stateId = opts.lazerStateId ?? this.cfg.oracle?.pythLazerState;
			if (!stateId) {
				throw new PredictInputError('fill needs the Pyth Lazer State: pass `lazerStateId`');
			}
			const { id } = await this.#resolveMarket(m);
			const queueId = await this.#existingQueueId(orders, id);
			const lazer = await lazerPackages(this.#client, stateId);
			return txOf(
				fill(orders, {
					expiryMarketId: id,
					queueId,
					payloads: opts.payloads,
					lazer,
					maxOrders: BigInt(opts.maxOrders ?? 15),
					refundOverdue: opts.refundOverdue,
				}),
			);
		},

		// Queue a supply request pulling `amountUsdc` from the account's existing custody
		// balance. `request_supply` auto-settles USDC then `account.withdraw`s the payment
		// into queue escrow; the PLP fill is delivered at the next flush, not returned here.
		// Command order is auth → request (auth is a hot potato consumed by this call). The
		// `minPlpOut` slot is the per-request floor on PLP minted at flush — `options.minPlpOut`
		// when given, otherwise 0 (no floor). At the shipped attempt count of one, the first
		// flush whose mark quotes less cancels and refunds the request; three is the
		// configurable maximum, not the default.
		supplyPlp: (
			owner: string,
			amountUsdc: number | string,
			options: PlpSupplyOptions = {},
		): Transaction =>
			txOf(
				requestSupply({
					config: this.#config,
					arguments: {
						wrapper: this.wrapperIdFor(owner),
						amount: usdcToRaw(amountUsdc),
						minPlpOut: options.minPlpOut ?? 0n,
					},
				}),
			),

		// Queue a withdraw request pulling `shares` (raw PLP u64) from account custody into
		// queue escrow — the Move parameter is named `amount`, but on `request_withdraw` it
		// counts PLP SHARES, not USDC. Auto-settles flush-delivered PLP first; the USDC
		// fill lands on the account at the next flush (no `withdraw_settled` entrypoint).
		// Command order is auth → request. The `minUsdcOut` slot is the per-request floor
		// on USDC paid at flush — `options.minUsdcOut` when given, otherwise 0 (no floor).
		// At the shipped attempt count of one, the first flush whose mark quotes less
		// cancels and refunds the request; three is the configurable maximum, not the
		// default.
		withdrawPlp: (owner: string, shares: bigint, options: PlpWithdrawOptions = {}): Transaction =>
			txOf(
				requestWithdraw({
					config: this.#config,
					arguments: {
						wrapper: this.wrapperIdFor(owner),
						amount: shares,
						minUsdcOut: options.minUsdcOut === undefined ? 0n : usdcToRaw(options.minUsdcOut),
					},
				}),
			),

		// Cancel a still-pending supply request by queue `index`, refunding its escrowed
		// USDC straight back into the requesting account. Command order is auth → cancel.
		cancelSupplyPlp: (owner: string, index: bigint): Transaction =>
			txOf(
				cancelSupplyRequest({
					config: this.#config,
					arguments: { wrapper: this.wrapperIdFor(owner), index },
				}),
			),

		// Cancel a still-pending withdraw request by queue `index`, refunding its escrowed
		// PLP straight back into the requesting account. Command order is auth → cancel.
		cancelWithdrawPlp: (owner: string, index: bigint): Transaction =>
			txOf(
				cancelWithdrawRequest({
					config: this.#config,
					arguments: { wrapper: this.wrapperIdFor(owner), index },
				}),
			),

		// Set the account's sticky builder-code attribution to `builderCodeId`, an existing
		// `BuilderCode` object borrowed as `&BuilderCode`. Command order is auth → set (auth
		// is a hot potato consumed by this call). Lives in the PREDICT package's
		// `predict_account` module, NOT the account package. Deployed sig
		// `packages/predict/sources/predict_account.move:134` — 3 moveCall args
		// (wrapper, auth, code; ctx implicit).
		setBuilderCode: (owner: string, builderCodeId: string): Transaction =>
			txOf(
				setBuilderCode({
					config: this.#config,
					arguments: { wrapper: this.wrapperIdFor(owner), code: builderCodeId },
				}),
			),

		// Clear the account's sticky builder-code attribution. Command order is auth → unset.
		// Deployed sig `.../predict_account.move:151` — 2 moveCall args (wrapper, auth; ctx
		// implicit).
		unsetBuilderCode: (owner: string): Transaction =>
			txOf(
				unsetBuilderCode({
					config: this.#config,
					arguments: { wrapper: this.wrapperIdFor(owner) },
				}),
			),
	};

	// === reads ===
	readonly read = {
		// All tradeable (active) markets with the state a frontend needs to render
		// and mint: one chain read for ids + one batched PTB for the states.
		markets: async (): Promise<ActiveMarket[]> => {
			const ids = await activeMarketIds(this.#client, this.#config);
			const states = await marketStates(this.#client, this.#config, ids);
			return ids.map((id, i) => ({
				id,
				expiryMs: states[i].expiryMs,
				tickSize: fromRaw(states[i].tickSizeRaw, 9),
				admissionTickSize: fromRaw(states[i].admissionTickSizeRaw, 9),
				mintPaused: states[i].mintPaused,
				referencePrice: PredictClient.#referencePriceOf(states[i]),
			}));
		},

		// Validate an app-stored order id against the chain (stale after full
		// close or partial-close replacement — see RedeemReceipt.replacementOrderId).
		hasPosition: (owner: string, marketId: string, orderId: bigint): Promise<boolean> =>
			hasPosition(this.#client, this.#config, owner, marketId, orderId),

		// All open positions for an owner, enumerated from the chain (the
		// account's positions Table): 1 call per page warm, +2 resolution calls
		// once per owner. Returns [] for owners with no Predict account.
		positions: async (owner: string): Promise<OpenPosition[]> => {
			let handle = this.#positionsCache.get(owner);
			if (!handle?.positionsTableId) {
				const resolved = await resolvePositionsTable(this.#client, this.#config, owner);
				if (!resolved) return []; // never onboarded — do not cache
				if (resolved.positionsTableId) this.#positionsCache.set(owner, resolved);
				handle = resolved;
			}
			if (!handle.positionsTableId) return [];
			return positionsFromTable(this.#client, handle.positionsTableId);
		},

		// Anonymous board pricing: the chain's probability for both sides of a
		// strike, from one fresh pricer (no account needed). This is the ↑/↓
		// button price before a user has onboarded.
		price: async (m: BinaryMarketCoordinates): Promise<{ up: number; down: number }> => {
			const feeds = this.#feeds(m.underlying);
			const { id, state } = await this.#resolveMarket(m);
			const strikeRaw = await this.#strikeRawFor(m, id, state);
			const { upRaw, downRaw } = await rangePrices(
				this.#client,
				this.#config,
				id,
				feeds,
				strikeRaw,
				state.tickSizeRaw,
			);
			return { up: rawToProbability(upRaw), down: rawToProbability(downRaw) };
		},

		// A client-side board pricer for one market: ONE simulate reads the chain's
		// resolved pricer (already forward-selected + rolled to now), then prices every
		// strike LOCALLY with no further chain calls — `pricer.up(strike)`,
		// `.down(strike)`, `.range(lo,hi)`, `.strikeAtProbability(p)`. Use this to paint a
		// whole board instantly; `read.price` / `read.quoteMint` stay the authoritative
		// per-strike quote at trade time. Throws the same typed stale-oracle/expired
		// PredictMoveError `read.price` would when the chain itself cannot quote.
		pricer: async (
			m: Pick<MarketDescriptor, 'underlying' | 'expiryMs'>,
		): Promise<BoardPricer & { asOf: PricerSnapshot['sources'] }> => {
			const feeds = this.#feeds(m.underlying);
			const { id } = await this.#resolveMarket(m);
			const snap = await readPricerSnapshot(this.#client, this.#config, id, feeds);
			return { ...boardPricer(snap), asOf: snap.sources };
		},

		/**
		 * Exact pre-trade quote for an exact-quantity mint. Requires a funded account.
		 *
		 * Where the config records the delayed-execution upgrade (`packages.predictDelayedExecution`),
		 * this reads Predict's own `quote_mint_for_account` (the immediate mint is retired there) and
		 * the order desk's fee, and previews a QUEUED fill at the clock: `queued: true`, no
		 * congestion penalty in `cost`, and the order fee in `orderFee`. The fill itself prices at
		 * its committed Pyth tick. It throws `PredictInputError` when that config lacks the
		 * order-flow package or its desk. Elsewhere it dry-runs the immediate mint and decodes its
		 * receipt, as before.
		 */
		quoteMint: async (
			owner: string,
			m: MarketDescriptor,
			opts: Pick<MintOptions, 'quantity'>,
		): Promise<MintQuote> => {
			if (this.cfg.packages.predictDelayedExecution) {
				const orders = this.#requireDelayedExecution();
				const feeds = this.#feeds(m.underlying);
				const { id, state } = await this.#resolveMarket(m);
				const quantityRaw = usdcToRaw(opts.quantity);
				this.#assertLot(quantityRaw);
				const { lowerTick, higherTick } = await this.#strikeTicks(m, id, state);
				const { quote, policy } = await quoteMintForAccount(this.#client, this.#config, {
					expiryMarketId: id,
					wrapperId: this.wrapperIdFor(owner),
					lowerTick,
					higherTick,
					request: { shape: 'exact-quantity', quantityRaw },
					ordersConfig: orders,
					...feeds,
				});
				return PredictClient.#queuedMintQuote(quote, policy);
			}
			const tx = await this.#buildMint(owner, m, opts);
			return this.#quoteMintTransaction(owner, tx);
		},

		/**
		 * Quote the all-in budget mint against current account and market state. Where the config
		 * records the delayed-execution upgrade, it reads `quote_mint_exact_cost_for_account` at
		 * `min(spend, available − fee)`, the budget enqueue escrows, and previews a queued fill as
		 * `quoteMint` does (and throws as it does on a partial config). Elsewhere it simulates the
		 * immediate v2 mint.
		 */
		quoteMintCost: async (
			owner: string,
			m: MarketDescriptor,
			opts: MintCostOptions,
		): Promise<MintQuote> => {
			if (this.cfg.packages.predictDelayedExecution) {
				const orders = this.#requireDelayedExecution();
				const feeds = this.#feeds(m.underlying);
				const { id, state } = await this.#resolveMarket(m);
				const { lowerTick, higherTick } = await this.#strikeTicks(m, id, state);
				const { policy, availableRaw } = await orderFeeAndBalance(
					this.#client,
					orders,
					owner,
					this.cfg.quoteCoinType,
				);
				const fee = policy.orderFee;
				const spendRaw = usdcToRaw(opts.spend);
				const escrowable = availableRaw > fee ? availableRaw - fee : 0n;
				const { quote } = await quoteMintForAccount(this.#client, this.#config, {
					expiryMarketId: id,
					wrapperId: this.wrapperIdFor(owner),
					lowerTick,
					higherTick,
					request: {
						shape: 'exact-cost',
						maxCostRaw: spendRaw < escrowable ? spendRaw : escrowable,
						minQuantityRaw: usdcToRaw(opts.minQuantity),
					},
					...feeds,
				});
				return PredictClient.#queuedMintQuote(quote, policy);
			}
			return this.#quoteMintTransaction(owner, await this.#buildMintCost(owner, m, opts));
		},

		/**
		 * Quote an early sell of an Open record (the queue's `quote_redeem_open`) at a fresh live
		 * pricer. `proceeds` is before the order fee, with no congestion penalty, and `net` takes the
		 * fee off. Throws `ERecordNotOpen` when the record isn't Open.
		 */
		quoteSell: async (
			owner: string,
			m: MarketCoordinates,
			opts: { recordId: bigint; quantity: number },
		): Promise<SellQuote> => {
			const orders = this.#requireDelayedExecution();
			const feeds = this.#feeds(m.underlying);
			const { id } = await this.#resolveMarket(m);
			const closeQuantityRaw = usdcToRaw(opts.quantity);
			this.#assertLot(closeQuantityRaw);
			const queueId = await this.#existingQueueId(orders, id);
			const { quote, policy } = await quoteRedeemOpen(this.#client, orders, {
				expiryMarketId: id,
				queueId,
				wrapperId: this.wrapperIdFor(owner),
				recordId: opts.recordId,
				closeQuantityRaw,
				...feeds,
			});
			const orderFee = policy.orderFee;
			return {
				probability: rawToProbability(quote.probability),
				proceeds: rawToUsdc(quote.proceeds),
				net: rawToUsdc(quote.proceeds - orderFee),
				fees: {
					trading: rawToUsdc(quote.tradingFee),
					builder: rawToUsdc(quote.builderFee),
					inventoryImpactRebate: rawToUsdc(quote.inventoryImpactRebate),
					order: rawToUsdc(orderFee),
				},
				quantityClosed: rawToUsdc(quote.closeQuantity),
				raw: {
					probability: quote.probability,
					proceeds: quote.proceeds,
					orderFee,
					quantityClosed: quote.closeQuantity,
				},
			};
		},

		/**
		 * Which trade path the network is on, from `ProtocolConfig.version_watermark` and whether
		 * this config records delayed execution (the Predict upgrade, the order-flow companion and
		 * its desk). Flip the app between `mint*` and `enqueue*` on it, without a redeploy at the
		 * watermark bump.
		 */
		executionMode: async (): Promise<ExecutionMode> =>
			executionModeFor(
				await versionWatermark(this.#client, this.cfg.objects.protocolConfig),
				this.#recordsDelayedExecution(),
				this.cfg.packages.predictDelayedExecution != null,
			),

		/**
		 * A market's queue in one read: cash, the stuck gate ("pricing delayed"), cohorts, counters
		 * against capacity, the desk's policy, a τ/deadline/cutoff preview, and the largest mint
		 * spare cash admits now. With `owner` (who must have an account), also the account's
		 * waiting orders and balance. Throws `PredictPreflightError` `'no-queue'` while the market
		 * has no `MarketQueue`.
		 */
		queue: async (m: MarketCoordinates, owner?: string): Promise<MarketQueueView> => {
			const orders = this.#requireDelayedExecution();
			const { id } = await this.#resolveMarket(m);
			const state = await this.#queueState(orders, id, { owner });
			const nowMs = BigInt(Date.now());
			const policy = state.desk.policy;
			const mode = executionModeFor(state.protocol.versionWatermark, true);
			const timing = previewTiming({
				nowMs,
				policy,
				heads: state.heads,
				expiryMs: state.expiryMs,
				noTradeWindowMs: state.protocol.noTradeWindowMs,
			});
			// The builders' own gate, so the flags can never disagree with their preflight.
			const refusalFor = (side: 'mint' | 'sell'): PredictPreflightCode | null => {
				try {
					this.#assertQueueOpen(state, side, nowMs);
					return null;
				} catch (e) {
					if (e instanceof PredictPreflightError) return e.code;
					throw e;
				}
			};
			const refusal = { mint: refusalFor('mint'), sell: refusalFor('sell') };
			return {
				...state,
				mode,
				timing,
				acceptingMints: refusal.mint == null,
				acceptingSells: refusal.sell == null,
				refusal,
				maxMint: {
					exactQuantity: maxMintNow({
						shape: 'exact-quantity',
						spareCashRaw: state.spareCash,
						minEntryProbability: state.minEntryProbability,
						lotSize: BigInt(this.cfg.units.positionLotSize),
						asOfMs: nowMs,
					}),
					budget: maxMintNow({
						shape: 'budget',
						spareCashRaw: state.spareCash,
						minEntryProbability: state.minEntryProbability,
						availableRaw: state.account?.availableRaw,
						orderFeeRaw: policy.orderFee,
						asOfMs: nowMs,
					}),
				},
			};
		},

		/**
		 * Plan a queued mint for a purchase form: the quote at the current price, the payout and
		 * multiple, the order fee read from the desk, the escrow and debit, the balance, the most
		 * the market takes now, the timing and the queue gates, plus the enqueue options that carry
		 * the slippage. `amount` plans an all-in spend (`enqueueMintCost`, refunded below the payout
		 * floor), and `quantity` an exact payout (`enqueueMint`, capped by probability and cost).
		 * Works for a visitor without an account: the quote then comes from `quote_mint`.
		 *
		 * `slippageCents` is cents per contract, never a percentage: a 10¢ limit fills while the
		 * all-in price per contract stays within 10¢ of the quote's price without its fee subsidy.
		 */
		planMint: async (
			owner: string,
			m: MarketDescriptor,
			opts: PlanMintOptions,
		): Promise<MintPlan> => {
			const orders = this.#requireDelayedExecution();
			const feeds = this.#feeds(m.underlying);
			const { id, state: market } = await this.#resolveMarket(m);
			const { lowerTick, higherTick } = await this.#strikeTicks(m, id, market);
			const hasAccount = await this.#hasAccount(owner);
			const state = await this.#queueState(orders, id, hasAccount ? { owner } : {});
			const nowMs = BigInt(Date.now());
			const policy = state.desk.policy;
			const fee = policy.orderFee;
			const availableRaw = state.account?.availableRaw ?? null;
			const lot = BigInt(this.cfg.units.positionLotSize);
			const ticks = { expiryMarketId: id, lowerTick, higherTick, ...feeds };
			const forAccount = (request: MintQuoteRequest) =>
				quoteMintForAccount(this.#client, this.#config, {
					...ticks,
					wrapperId: this.wrapperIdFor(owner),
					request,
				}).then((r) => r.quote);

			let quote: MintQuoteRaw;
			let quoteForAccount: boolean;
			let budgetRequested: bigint | null = null;
			if ('amount' in opts) {
				const amountRaw = usdcToRaw(opts.amount);
				budgetRequested =
					(opts.orderFee ?? 'inclusive') === 'inclusive'
						? amountRaw > fee
							? amountRaw - fee
							: 0n
						: amountRaw;
				// No budget below the minimum premium can be admitted, and the account's quote
				// aborts `EOrderFailsLimits` on one, so refuse it as a visitor's search does. An
				// amount the order fee takes whole buys nothing either.
				if (budgetRequested === 0n) {
					throw new PredictPreflightError(
						'min-premium',
						`${opts.amount} doesn't cover the ${rawToUsdc(fee)} order fee, so it buys no premium`,
					);
				}
				if (budgetRequested < MIN_PREMIUM) {
					throw new PredictPreflightError(
						'min-premium',
						`a budget of ${rawToUsdc(budgetRequested)} is below the minimum premium (a mint's premium must be at least ${rawToUsdc(MIN_PREMIUM)} USDC)`,
					);
				}
				// The account's own quote caps the budget at its balance, so it only previews an
				// order the balance covers.
				quoteForAccount =
					availableRaw != null && availableRaw > fee && availableRaw - fee >= budgetRequested;
				const budget = budgetRequested;
				const search = () =>
					this.#searchBudgetQuote(ticks, budget, lot).catch(async (error: unknown) => {
						// Every probe refused ends the search in 'min-premium', which a strike outside
						// the entry band also explains.
						if (error instanceof PredictPreflightError && error.code === 'min-premium') {
							throw (await this.#entryBandRefusal(m)) ?? error;
						}
						throw await this.#quoteRefusal(error, { m });
					});
				if (quoteForAccount) {
					try {
						quote = await forAccount({
							shape: 'exact-cost',
							maxCostRaw: budget,
							minQuantityRaw: 0n,
						});
					} catch (error) {
						if (!isOrderFailsLimits(error)) throw await this.#quoteRefusal(error);
						// The chain refused the whole budget. Outside the entry band, say so. Otherwise
						// the account-free search sizes it, and refuses one too small for the minimum
						// premium with a typed error.
						quoteForAccount = false;
						quote = await search();
					}
				} else {
					quote = await search();
				}
			} else {
				const quantityRaw = usdcToRaw(opts.quantity);
				this.#assertLot(quantityRaw);
				quoteForAccount = hasAccount;
				try {
					quote = hasAccount
						? await forAccount({ shape: 'exact-quantity', quantityRaw })
						: (
								await quoteMintAnonymous(this.#client, this.#config, {
									...ticks,
									request: { shape: 'exact-quantity', quantityRaw },
								})
							).quote;
				} catch (error) {
					throw await this.#quoteRefusal(error, { m, quantityRaw });
				}
			}

			// The expected cost, after the fee subsidy. The limits add the subsidy back, because
			// admission checks the order without it (`EOrderFailsLimits`).
			const costRaw = quote.allInCost - quote.penaltyFee;
			const slippage = PredictClient.#appliedSlippage(opts, quote.entryProbability, state, nowMs);
			const limitsIn = {
				quoteCostRaw: costRaw,
				quoteQuantityRaw: quote.quantity,
				entryProbabilityRaw: quote.entryProbability,
				slippageRaw: slippage.raw,
				feeIncentiveSubsidyRaw: quote.feeIncentiveSubsidy,
				lotSize: lot,
			};
			let budgetRaw: bigint;
			let minQuantityRaw: bigint;
			// What admission buys at least, for a budget plan, or why it buys nothing the plan can
			// preview.
			let admitted: { quantity: bigint } | { refusal: 'min-premium' | 'cost-above-payout' } | null =
				null;
			let maxCostRaw: bigint | null = null;
			let maxProbabilityRaw: bigint | null = null;
			let price: { nowRaw: bigint; worstRaw: bigint };
			let order: MintPlan['order'];
			if (budgetRequested != null) {
				const limits = budgetMintLimits({ ...limitsIn, budgetRaw: budgetRequested });
				budgetRaw = budgetRequested;
				// Admission sizes the fill without the subsidy by Move's exact arithmetic, whose
				// per-component rounding (inventory impact included) an average price can't bound.
				// So the floor's ceiling is checked with exact quotes. It also never exceeds the
				// quote's own quantity, since a searched quote can leave part of the budget unspent.
				// The first probe divides the budget by the quote's unsubsidized price, with no rounding
				// allowance, so a minimum-sized purchase isn't probed one lot short.
				const unsubsidizedCost = costRaw + quote.feeIncentiveSubsidy;
				const start =
					unsubsidizedCost === 0n
						? quote.quantity
						: ((budgetRaw * quote.quantity) / unsubsidizedCost / lot) * lot;
				admitted = await this.#admittedFloor(
					(quantityRaw) =>
						quoteForAccount
							? forAccount({ shape: 'exact-quantity', quantityRaw })
							: quoteMintAnonymous(this.#client, this.#config, {
									...ticks,
									request: { shape: 'exact-quantity', quantityRaw },
								}).then((r) => r.quote),
					budgetRaw,
					start < quote.quantity ? start : quote.quantity,
					lot,
					quote.entryProbability,
				);
				const ceiling = 'quantity' in admitted ? admitted.quantity : 0n;
				minQuantityRaw = limits.minQuantityRaw < ceiling ? limits.minQuantityRaw : ceiling;
				price = limits.pricePerContract;
				order = {
					builder: 'enqueueMintCost',
					options: { spend: rawToUsdc(budgetRaw), minQuantity: rawToUsdc(minQuantityRaw) },
				};
			} else {
				const limits = exactMintLimits(limitsIn);
				maxCostRaw = limits.maxCostRaw;
				maxProbabilityRaw = limits.maxProbabilityRaw;
				// Enqueue escrows `min(max_cost, quantity, available − fee)`.
				budgetRaw = maxCostRaw < quote.quantity ? maxCostRaw : quote.quantity;
				minQuantityRaw = quote.quantity;
				price = limits.pricePerContract;
				order = {
					builder: 'enqueueMint',
					options: {
						quantity: rawToUsdc(quote.quantity),
						maxCost: rawToUsdc(maxCostRaw),
						maxProbability: rawToProbability(maxProbabilityRaw),
					},
				};
			}

			const totalDebitRaw = budgetRaw + fee;
			const expectedDebitRaw = costRaw + fee;
			const inclusive = 'amount' in opts && (opts.orderFee ?? 'inclusive') === 'inclusive';
			// The builder's own preflight on the plan's order, plus what only the quote shows: the
			// balance against the whole debit the limits assume, the payout bound, and the premium a
			// budget buys at admission, which prices without the fee subsidy.
			const refusal = PredictClient.#refusal(() => {
				this.#assertQueueOpen(state, 'mint', nowMs);
				if (availableRaw == null || availableRaw < totalDebitRaw) {
					throw new PredictPreflightError(
						'fee',
						`the balance doesn't cover the plan's ${rawToUsdc(totalDebitRaw)} debit`,
					);
				}
				PredictClient.#assertMintOrder(
					state,
					policy,
					budgetRequested != null
						? { kind: ORDER_KIND.EXACT_COST, maxCostRaw: budgetRaw }
						: {
								kind: ORDER_KIND.EXACT_QUANTITY,
								maxCostRaw: maxCostRaw ?? budgetRaw,
								quantityRaw: quote.quantity,
							},
				);
				if (costRaw + quote.feeIncentiveSubsidy > quote.quantity) {
					throw new PredictPreflightError(
						'cost-above-payout',
						'the all-in cost without the fee subsidy is above the payout',
					);
				}
				if (admitted != null && 'refusal' in admitted) {
					throw new PredictPreflightError(
						admitted.refusal,
						admitted.refusal === 'min-premium'
							? `without the fee subsidy, ${rawToUsdc(budgetRaw)} buys no fill that clears the ${rawToUsdc(MIN_PREMIUM)} minimum premium`
							: `without the fee subsidy, ${rawToUsdc(budgetRaw)} buys a fill near $1 a contract, whose admission sizing can't be previewed`,
					);
				}
			});
			const cashOrBudgetMax = maxMintNow(
				budgetRequested != null
					? {
							shape: 'budget',
							spareCashRaw: state.spareCash,
							minEntryProbability: state.minEntryProbability,
							availableRaw: availableRaw ?? undefined,
							orderFeeRaw: fee,
							asOfMs: nowMs,
						}
					: {
							shape: 'exact-quantity',
							spareCashRaw: state.spareCash,
							minEntryProbability: state.minEntryProbability,
							lotSize: lot,
							asOfMs: nowMs,
						},
			).maxRaw;
			// `maxMintNow` bounds an exact quantity by spare cash only. Enqueue escrows the quantity
			// at the plan's worst price per contract, capped at the $1 payout, so the balance bounds
			// it too.
			let max = cashOrBudgetMax;
			if (budgetRequested == null && availableRaw != null && price.worstRaw > 0n) {
				const spendable = availableRaw > fee ? availableRaw - fee : 0n;
				const perContract = price.worstRaw < 1_000_000_000n ? price.worstRaw : 1_000_000_000n;
				const byBalance = ((spendable * 1_000_000_000n) / perContract / lot) * lot;
				if (max == null || byBalance < max) max = byBalance;
			}
			return {
				shape: budgetRequested != null ? 'budget' : 'exact-quantity',
				target: { owner: normalizeSuiAddress(owner), expiryMarketId: id, lowerTick, higherTick },
				quote: PredictClient.#queuedMintQuote(quote, policy),
				quoteForAccount,
				slippage: slippage.applied,
				potentialPayout: rawToUsdc(quote.quantity),
				minPayout: rawToUsdc(minQuantityRaw),
				payoutMultiple: Number(quote.quantity) / Number(expectedDebitRaw),
				minPayoutMultiple: Number(minQuantityRaw) / Number(totalDebitRaw),
				pricePerContract: rawToProbability(price.nowRaw),
				worstPricePerContract: rawToProbability(price.worstRaw),
				orderFee: rawToUsdc(fee),
				budget: rawToUsdc(budgetRaw),
				totalDebit: rawToUsdc(totalDebitRaw),
				expectedDebit: rawToUsdc(expectedDebitRaw),
				balance: {
					hasAccount,
					available: availableRaw == null ? null : rawToUsdc(availableRaw),
					covers: availableRaw == null ? null : availableRaw >= totalDebitRaw,
				},
				maxNow: max == null ? null : rawToUsdc(inclusive ? max + fee : max),
				timing: previewTiming({
					nowMs,
					policy,
					heads: state.heads,
					expiryMs: state.expiryMs,
					noTradeWindowMs: state.protocol.noTradeWindowMs,
				}),
				accepting: refusal == null,
				refusal,
				order,
				raw: {
					budget: budgetRaw,
					orderFee: fee,
					totalDebit: totalDebitRaw,
					slippage: slippage.raw,
					minQuantity: minQuantityRaw,
					maxCost: maxCostRaw,
					maxProbability: maxProbabilityRaw,
					pricePerContract: price.nowRaw,
					worstPricePerContract: price.worstRaw,
				},
			};
		},

		/**
		 * Plan a queued early sell of an Open record: the quote at the current price, net of the
		 * order fee, the floors at the worst price the slippage allows, the timing and the
		 * builder's preflight, plus the `enqueueSell` options that carry the floors. A record that
		 * isn't Open has no quote, so it throws `PredictPreflightError` `'record-not-open'` instead.
		 */
		planSell: async (
			owner: string,
			m: MarketCoordinates,
			opts: PlanSellOptions,
		): Promise<SellPlan> => {
			const orders = this.#requireDelayedExecution();
			const { id } = await this.#resolveMarket(m);
			const state = await this.#queueState(orders, id, { owner, recordIds: [opts.recordId] });
			// No quote exists for a record that isn't Open, or for more than it holds, so those
			// refusals throw.
			const record = PredictClient.#assertRecordOpen(state, opts.recordId);
			this.#assertSellQuantity(record, usdcToRaw(opts.quantity));
			const quote = await this.read
				.quoteSell(owner, m, { recordId: opts.recordId, quantity: opts.quantity })
				.catch(async (error: unknown) => {
					throw await this.#quoteRefusal(error);
				});
			const nowMs = BigInt(Date.now());
			const slippage = PredictClient.#appliedSlippage(opts, quote.raw.probability, state, nowMs);
			const limits = sellLimits({
				proceedsRaw: quote.raw.proceeds,
				closeQuantityRaw: quote.raw.quantityClosed,
				probabilityRaw: quote.raw.probability,
				slippageRaw: slippage.raw,
			});
			const fee = quote.raw.orderFee;
			// The builder's own preflight on the sell.
			const refusal = PredictClient.#refusal(() => {
				const { policy } = this.#assertQueueOpen(state, 'sell', nowMs);
				this.#assertSellOrder(state, policy, opts.recordId, usdcToRaw(opts.quantity));
			});
			return {
				target: { owner: normalizeSuiAddress(owner), expiryMarketId: id, recordId: opts.recordId },
				quote,
				slippage: slippage.applied,
				proceeds: quote.proceeds,
				net: quote.net,
				minProceeds: rawToUsdc(limits.minProceedsRaw),
				minNet: rawToUsdc(limits.minProceedsRaw - fee),
				orderFee: rawToUsdc(fee),
				timing: previewTiming({
					nowMs,
					policy: state.desk.policy,
					heads: state.heads,
					expiryMs: state.expiryMs,
					noTradeWindowMs: state.protocol.noTradeWindowMs,
				}),
				accepting: refusal == null,
				refusal,
				order: {
					builder: 'enqueueSell',
					options: {
						recordId: opts.recordId,
						quantity: opts.quantity,
						minProbability: rawToProbability(limits.minProbabilityRaw),
						minProceeds: rawToUsdc(limits.minProceedsRaw),
					},
				},
				raw: {
					slippage: slippage.raw,
					minProceeds: limits.minProceedsRaw,
					minProbability: limits.minProbabilityRaw,
					orderFee: fee,
				},
			};
		},

		/** One queue record and its display state, or null when missing or cleaned up. */
		order: async (m: MarketCoordinates, recordId: bigint): Promise<QueuedOrderView | null> =>
			(await this.read.orders(m, [recordId]))[0],

		/**
		 * Queue records by record ID, with their display states. The SDK has no indexer: the app
		 * supplies record IDs from its enqueue receipts or its indexer.
		 */
		orders: async (
			m: MarketCoordinates,
			recordIds: readonly bigint[],
		): Promise<(QueuedOrderView | null)[]> => {
			const orders = this.#requireDelayedExecution();
			const { id } = await this.#resolveMarket(m);
			const queueId = await this.#existingQueueId(orders, id);
			const records = await queuedOrders(
				this.#client,
				orders,
				{ expiryMarketId: id, queueId },
				recordIds,
			);
			const nowMs = BigInt(Date.now());
			return records.map((record, i) =>
				record ? { recordId: recordIds[i], record, view: orderView(record, nowMs) } : null,
			);
		},

		/**
		 * Poll a record until it is filled, refunded or closed (`pollMs`, default 250), or until
		 * `timeoutMs` (default 30 s). The fullnode a client reads can trail the enqueue's
		 * execution, so a record not seen yet is polled again until the timeout, and ends as
		 * `'gone'` only then. A record that disappears after it was seen ends as `'gone'` at once.
		 * The record's result is enough for the UI; the fee breakdown is in the
		 * `QueuedOrderFilled` event.
		 */
		waitForOutcome: async (
			m: MarketCoordinates,
			recordId: bigint,
			opts: { pollMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
		): Promise<QueuedOrderOutcome> => {
			const pollMs = opts.pollMs ?? 250;
			const deadline = Date.now() + (opts.timeoutMs ?? 30_000);
			let seen = false;
			for (;;) {
				const order = await this.read.order(m, recordId);
				const timedOut = Date.now() + pollMs > deadline;
				if (!order) {
					if (seen || timedOut) return { outcome: 'gone', order: null };
				} else {
					seen = true;
					const state = order.view.state;
					if (state === 'filled' || state === 'refunded' || state === 'closed') {
						return { outcome: state, order };
					}
					if (timedOut) return { outcome: 'timeout', order };
				}
				await sleep(pollMs, opts.signal);
			}
		},

		/**
		 * USDC sent to the owner's account wrapper that the account hasn't settled yet: refunds,
		 * sell proceeds and settled payouts of Open records. Already counted in `read.balance`; for
		 * display.
		 */
		pendingFunds: async (owner: string): Promise<number> =>
			rawToUsdc(await pendingFunds(this.#client, this.wrapperIdFor(owner), this.cfg.quoteCoinType)),

		/** The current Pyth Lazer package, for a filler. Read it per batch and never cache it. */
		lazerPackages: (stateId?: string): Promise<LazerPackages> => {
			const id = stateId ?? this.cfg.oracle?.pythLazerState;
			if (!id) throw new PredictInputError('pass the Pyth Lazer State id');
			return lazerPackages(this.#client, id);
		},

		/**
		 * Exact pre-close quote for an ACCOUNT position: dry-runs the immediate redeem and decodes
		 * the receipt.
		 * @deprecated `redeem_live` is retired by delayed execution (DBU-885): Predict v4 always
		 * aborts it. Queued fills are Open records: quote them with `read.quoteSell`.
		 */
		quoteRedeem: async (
			owner: string,
			m: MarketDescriptor,
			opts: CloseOptions,
		): Promise<RedeemQuote> => {
			const tx = await this.#buildRedeem(owner, m, opts);
			const events = await simulateWithEvents(this.#client, tx, owner);
			const r = exactlyOne(decodeRedeems(this.cfg, { events }), 'order-redeemed');
			return {
				proceeds: r.proceeds,
				gross: r.gross,
				fees: r.fees,
				quantityClosed: r.quantityClosed,
				remaining: r.remaining,
				raw: {
					proceeds: r.raw.proceeds,
					gross: r.raw.gross,
					quantityClosed: r.raw.quantityClosed,
				},
				feesExact: true,
			};
		},

		market: async (
			m: Pick<MarketDescriptor, 'underlying' | 'expiryMs'>,
		): Promise<MarketSummary | null> => {
			const expiryMs = BigInt(m.expiryMs);
			// Deliberately re-queries and overwrites the cache instead of reading
			// through it: this read must return live state (nav, mintPaused), and
			// refreshing the cache on the way keeps later tx builds consistent.
			const u = this.#underlying(m.underlying);
			const id = await expiryMarketId(this.#client, this.#config, u, expiryMs);
			if (!id) return null;
			const state = await marketState(this.#client, this.#config, id);
			this.#marketCache.set(`${m.underlying}:${expiryMs}`, { id, state });
			const navRaw = await currentNav(this.#client, this.#config, id, u);
			return {
				id,
				expiryMs: state.expiryMs,
				tickSize: fromRaw(state.tickSizeRaw, 9), // strike/price scale
				admissionTickSize: fromRaw(state.admissionTickSizeRaw, 9),
				mintPaused: state.mintPaused,
				nav: rawToUsdc(navRaw),
				referencePrice: PredictClient.#referencePriceOf(state),
			};
		},

		/**
		 * The fee and exposure policy the market snapshotted at creation, ready to pass to the
		 * `cost` functions as `fees`. A market keeps it for its whole life, so it can differ from
		 * the protocol's current template, and neither recorded deployment's template matches
		 * `cost.SHIPPED_FEE_POLICY` any more. One object read.
		 */
		feePolicy: async (m: MarketCoordinates): Promise<FeePolicy> =>
			marketFeePolicy(this.#client, (await this.#resolveMarket(m)).id),

		balance: async (owner: string): Promise<number> =>
			rawToUsdc(await accountBalance(this.#client, this.#config, owner, this.cfg.quoteCoinType)),

		// PLP shares held in the owner's account custody (raw u64, 6-decimal PLP coin).
		plpBalance: (owner: string): Promise<bigint> =>
			accountBalance(this.#client, this.#config, owner, this.cfg.coinTypes.plp),

		pool: async (): Promise<PoolSummary> => {
			const s = await poolStats(this.#client, this.#config);
			return {
				plpTotalSupply: s.plpTotalSupply, // shares raw (6-decimal)
				idleUsdc: rawToUsdc(s.idleBalance),
				// These are queue LENGTHS (counts of pending requests), not token amounts.
				supplyRequestsPending: Number(s.supplyRequestsPending),
				withdrawRequestsPending: Number(s.withdrawRequestsPending),
			};
		},
	};

	// === execution-result decoders ===
	// Pure event parsing (no network): pass the executed/simulated transaction
	// result (with events included) and get a typed receipt back. Singular forms
	// throw unless exactly one matching event exists; plural forms return all
	// (an integrator batching N actions in one PTB gets N receipts).
	readonly decode = {
		mint: (r: DecodableTransactionResult) => exactlyOne(decodeMints(this.cfg, r), 'OrderMinted'),
		mints: (r: DecodableTransactionResult) => decodeMints(this.cfg, r),
		redeem: (r: DecodableTransactionResult) =>
			exactlyOne(decodeRedeems(this.cfg, r), 'order-redeemed'),
		redeems: (r: DecodableTransactionResult) => decodeRedeems(this.cfg, r),
		claim: (r: DecodableTransactionResult) =>
			exactlyOne(decodeClaims(this.cfg, r), 'SettledOrderRedeemed'),
		claims: (r: DecodableTransactionResult) => decodeClaims(this.cfg, r),
		createManager: (r: DecodableTransactionResult) =>
			exactlyOne(decodeAccountsCreated(this.cfg, r), 'AccountCreated'),
		deposit: (r: DecodableTransactionResult) =>
			exactlyOne(decodeDeposits(this.cfg, r), 'Deposited'),
		withdraw: (r: DecodableTransactionResult) =>
			exactlyOne(decodeWithdrawals(this.cfg, r), 'Withdrawn'),
		plpRequest: (r: DecodableTransactionResult) =>
			exactlyOne(decodePlpRequests(this.cfg, r), 'supply/withdraw-requested'),
		plpCancel: (r: DecodableTransactionResult) =>
			exactlyOne(decodePlpCancels(this.cfg, r), 'RequestCancelled'),
		builderCode: (r: DecodableTransactionResult) =>
			exactlyOne(decodeBuilderCodeSets(this.cfg, r), 'BuilderCodeSet'),

		// --- delayed execution (DBU-885) --- the queue events are matched against the order-flow
		// companion's original ID (`packages.predictOrdersV1 ?? predictOrders`), the Predict events
		// the upgrade added against `packages.predictDelayedExecution`. Each throws
		// PredictInputError while the config doesn't record the package it needs.

		/** The trader's `OrderEnqueued` receipt: the record ID, τ, deadline, escrow and fee. */
		enqueue: (r: DecodableTransactionResult) =>
			exactlyOne(decodeEnqueues(this.cfg, r), 'OrderEnqueued'),
		enqueues: (r: DecodableTransactionResult) => decodeEnqueues(this.cfg, r),
		/** Every queue event, tagged, in chain order: feed it to `queue.reduceOrderEvents`. */
		queueEvents: (r: DecodableTransactionResult) => decodeQueueEvents(this.cfg, r),
		cohortCommits: (r: DecodableTransactionResult) => decodeCohortCommits(this.cfg, r),
		queuedFills: (r: DecodableTransactionResult) => decodeQueuedFills(this.cfg, r),
		queuedRefunds: (r: DecodableTransactionResult) => decodeQueuedRefunds(this.cfg, r),
		openRecordPayouts: (r: DecodableTransactionResult) => decodeOpenRecordPayouts(this.cfg, r),
		marketPayoutsCompleted: (r: DecodableTransactionResult) =>
			decodeMarketPayoutsCompleted(this.cfg, r),
		queueOps: (r: DecodableTransactionResult) => decodeQueueOps(this.cfg, r),
		/** `RecordFundsParked` and `RecordFundsClaimed`: USDC a record keeps until it can be sent. */
		recordFunds: (r: DecodableTransactionResult) => decodeRecordFunds(this.cfg, r),
		policyUpdates: (r: DecodableTransactionResult) => decodePolicyUpdates(this.cfg, r),
		/**
		 * `ExpiryPnlRealized` changes in the pool's gross realized result, for P&L reporting. Sum
		 * them with `realizedPnlRaw`.
		 */
		expiryPnlRealized: (r: DecodableTransactionResult) => decodeExpiryPnlRealized(this.cfg, r),
	};
}

// Resolve after `ms`, or reject with the signal's reason once it aborts.
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}
