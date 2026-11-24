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
	usesPredictV6,
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
	decodeBsTimingUpdates,
	decodeMints,
	decodeOpenRecordPayouts,
	decodeOracleBindingUpdates,
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
	pricerAt,
	type PricingFreshness,
	type PricingInputs,
	type PricingInputsProvider,
	type ResolvedPricer,
} from './inputs.js';
import {
	localMintQuote,
	localNav,
	localSellQuote,
	rangeBoundaries,
	type FeeBand,
	type QuoteMarket,
} from './quotes.js';
import {
	ORDER_FLOW_PACKAGE_VERSION,
	PREDICT_PACKAGE_VERSION,
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
	type BsTiming,
	type DelayedExecutionPolicy,
	type MaxMintNow,
	type OrderKindName,
	type OrderView,
	type QueuedOrder,
	type TimingPreview,
} from './queue.js';
import { deriveQueueId } from './queue-id.js';
import {
	blockScholesPackages,
	readBsTiming,
	readOracleBinding,
	type OracleBinding,
} from './reads/binding.js';
import { readFeeBands, readMarketObject, readMarketWithBook } from './reads/book.js';
import {
	executionModeFor,
	lazerPackages,
	marketQueueState,
	pendingFunds,
	queuedOrders,
	quoteContext,
	versionWatermark,
	type AnonymousMintQuoteRequest,
	type ExecutionMode,
	type MarketQueueState,
	type MintQuoteRaw,
	type MintQuoteRequest,
	type RedeemOpenQuoteRaw,
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
	expiryMarketId,
	marketFeePolicy,
	marketState,
	marketStates,
	referenceTick,
	settlementPrice,
	type MarketState,
} from './reads/markets.js';
import { poolStats } from './reads/pool.js';
import type { PricerSnapshot } from './reads/pricing.js';
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
	enqueueExactAmountV2,
	enqueueExactCost,
	enqueueExactCostV2,
	enqueueExactQuantity,
	enqueueExactQuantityV2,
	enqueueRedeemOpen,
	enqueueRedeemOpenV2,
	fill,
	fillV2,
	payOpen,
	rebalanceExpiryCash,
	refund,
	type LazerPackages,
} from './tx/queue.js';
import type { MarketFeeds } from './tx/trade.js';
import { redeemSettled } from './tx/trade.js';
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

// An unsubsidized price per contract (1e9 = $1) below which a budget fill's cost can't be above
// its payout, so an admission refusal there is the entry band, not the payout bound.
const NEAR_DOLLAR_PER_CONTRACT = 950_000_000n;

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

/**
 * A market's settlement, from `read.settlement`. Pass `settlementPriceRaw` and `tickSizeRaw` to
 * `cost.settledPayout` to show what a position paid.
 */
export interface MarketSettlement {
	marketId: string;
	expiryMs: bigint;
	/** Whether Predict has recorded the settlement price. */
	settled: boolean;
	/** The settlement price in USD, or null until the market settles. */
	settlementPrice: number | null;
	/** The settlement price at the 1e9 price scale, or null until the market settles. */
	settlementPriceRaw: bigint | null;
	/** The market's raw tick size, which `cost.settledPayout` rounds the price against. */
	tickSizeRaw: bigint;
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

/**
 * Pre-trade quote of a queued mint at the current price. From Predict version 6 the chain keeps no
 * live price, so it is computed off chain (`quotes.localMintQuote`) from the signed inputs a
 * `PricingInputsProvider` supplies, with the chain's fee arithmetic. Its probability comes from the
 * local pricer, which agrees with the chain to about 1e-4.
 */
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
	/**
	 * True: the fees are the chain's integer arithmetic on the quote's probability. The probability
	 * is the local pricer's, so the quote is a preview, not the fill.
	 */
	feesExact: true;
	/** True: this previews a queued (delayed-execution) fill, which pays no congestion penalty. */
	queued?: boolean;
	/**
	 * Queued previews only: the flat order fee, charged once at enqueue on top of `cost`. Show
	 * it once per order, not per contract.
	 */
	orderFee?: number;
}

interface ResolvedMarket {
	id: string;
	state: MarketState;
}

/** A market by its underlying and expiry, optionally pinned to an exact object. */
export type MarketCoordinates = Pick<MarketDescriptor, 'underlying' | 'expiryMs' | 'marketId'>;

/**
 * Per-call pricing inputs for the reads that price a market off chain (`read.price`,
 * `read.pricer`, `read.market`, the quotes and the plans). Pass `inputs` to price this call with
 * them instead of asking the client's `PricingInputsProvider`.
 */
export interface PricingOptions {
	inputs?: PricingInputs;
}

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
	PricingOptions &
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
	 * Whether the quote is the account's own, with its balance as the budget's cap. A visitor
	 * without an account, or a balance below the order, gets a quote for no particular account,
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
	 * Whether `tx.enqueuePlan` would build the order now and the fill would take it at the current
	 * price: the builder's preflight (the queue gates, the order fee, the minimum premium and the
	 * market's cash), the balance against `totalDebit`, the payout bound and, for a budget, the
	 * floor the fill buys without the fee subsidy. From Predict version 6 placement checks no price,
	 * so an order outside its limits or the entry band at τ is refunded then, with the order fee
	 * kept (reasons 1 and 2).
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
export type PlanSellOptions = SlippageOptions &
	PricingOptions & {
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
	 * queue gates, that the record is Open and the owner's, the order fee and the minimum sell.
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

/**
 * A quote for selling an Open record early, computed off chain (`quotes.localSellQuote`) as
 * version 5's `quote_redeem_open` did.
 */
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
 * (gRPC or GraphQL) provides both the `simulateTransaction` the reads/quotes
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
	pricingInputs,
	pricingFreshness,
}: {
	name?: Name;
	network: 'testnet' | 'mainnet';
	config?: PredictConfig;
	/** Supplies the signed inputs the off-chain prices, quotes and NAV need. See {@link PredictClient}. */
	pricingInputs?: PricingInputsProvider;
	/** How old those inputs may be. See {@link PredictClient}. */
	pricingFreshness?: PricingFreshness | false;
}): SuiClientRegistration<PredictCompatibleClient, Name, PredictClient> {
	return {
		name,
		register: (client) =>
			new PredictClient({ client, network, config, pricingInputs, pricingFreshness }),
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
	// market id → fee bands. A market copies the template at creation and keeps it for life.
	#feeBandsCache = new Map<string, FeeBand[]>();
	#pricingInputs: PricingInputsProvider | undefined;
	#pricingFreshness: PricingFreshness | false | undefined;

	/**
	 * `pricingInputs` supplies the signed Pyth and Block Scholes inputs every off-chain price needs:
	 * `read.price`, `read.pricer`, `read.market`'s NAV, `read.quoteMint`, `read.quoteMintCost`,
	 * `read.quoteSell`, `read.planMint` and `read.planSell`. From Predict version 6 the chain keeps
	 * no live price, so those reads throw `PredictInputError` without it, unless the call passes its
	 * own `inputs`. The SDK never fetches Pyth or Block Scholes data itself: the frontend or a quote
	 * service provides it. Transaction builders and the other reads don't need it.
	 *
	 * `pricingFreshness` bounds how old those inputs may be (the version 5 live pricer's windows
	 * by default: 2 s for the spot, forward and Block Scholes spot, 60 s for the SVI tuple). A read
	 * given staler inputs throws the chain's stale-oracle abort names (`EPythSpotStale`,
	 * `EBlockScholesPriceStale`, `EBlockScholesSVIStale`). Pass `false` to price them anyway.
	 */
	constructor(opts: {
		network: 'testnet' | 'mainnet';
		client: PredictCompatibleClient;
		config?: PredictConfig;
		pricingInputs?: PricingInputsProvider;
		pricingFreshness?: PricingFreshness | false;
	}) {
		this.cfg = opts.config ?? getConfig(opts.network);
		this.#client = opts.client;
		this.#pricingInputs = opts.pricingInputs;
		this.#pricingFreshness = opts.pricingFreshness;
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
		mint?: { m: MarketDescriptor; quantityRaw?: bigint; pricing?: PricingOptions },
	): Promise<unknown> {
		if (isPastExpiry(error)) {
			return new PredictPreflightError(
				'past-cutoff',
				'the market reached its expiry, so it has no live price and takes no orders',
			);
		}
		if (mint != null && isOrderFailsLimits(error)) {
			return (await this.#entryBandRefusal(mint.m, mint.quantityRaw, mint.pricing)) ?? error;
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
		pricing: PricingOptions = {},
	): Promise<PredictPreflightError | null> {
		if (m.side === 'range') return null;
		// Best effort: a failed diagnosis read leaves the quote's own error to the caller.
		const read = await Promise.all([this.read.price(m, pricing), this.read.feePolicy(m)]).catch(
			() => null,
		);
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
		unsubsidizedPricePerContractRaw: bigint,
	): Promise<
		{ quantity: bigint } | { refusal: 'min-premium' | 'cost-above-payout' | 'entry-band' }
	> {
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
				// The raise sized the minimum-premium quantity from the budget quote's entry
				// probability. When the raised probe still fails, the probability moved down between
				// the two quotes and the premium is still short, so the minimum premium refused it.
				if (raised || quantity < minPremiumQuantity) return { refusal: 'min-premium' };
				// At or above the minimum premium, admission refuses a cost above the payout or an entry
				// probability outside the band. Well below $1 a contract the cost can't reach the payout,
				// so the probability left the band between the budget quote and this probe.
				return {
					refusal:
						unsubsidizedPricePerContractRaw < NEAR_DOLLAR_PER_CONTRACT
							? 'entry-band'
							: 'cost-above-payout',
				};
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

	// A budget mint's quote for no particular account. That quote has no all-in budget mode, so
	// this searches for the largest lot multiple whose all-in cost fits the budget. The first probe
	// is its premium-budget mode with the whole budget as the premium, whose premium clears the
	// 1 USDC minimum whenever the purchase can. Each next probe divides the budget by the last price
	// per contract. The price barely moves with size, so a few quotes settle it. A probe the chain
	// refuses (`EOrderFailsLimits`) ends the search with the best fit so far. With no fit, the
	// refusal is `min-premium`, unless the chain priced no probe and the budget is at least the
	// minimum premium plus a lot: the first probe's premium is above `budget − lot` (a lot costs
	// under $1), so the minimum premium didn't refuse it, and the chain's own refusal stands.
	async #searchBudgetQuote(
		anonymous: (request: AnonymousMintQuoteRequest) => MintQuoteRaw,
		budgetRaw: bigint,
		lot: bigint,
	): Promise<MintQuoteRaw> {
		const floorLot = (x: bigint) => (x / lot) * lot;
		let refusal: unknown = null;
		let priced = false;
		const probeQuote = async (request: AnonymousMintQuoteRequest) => {
			try {
				const quote = anonymous(request);
				priced = true;
				return quote;
			} catch (e) {
				if (!isOrderFailsLimits(e)) throw e;
				refusal ??= e;
				return null;
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
			if (!priced && refusal != null && budgetRaw >= MIN_PREMIUM + lot) throw refusal;
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

	// === off-chain pricing (Predict version 6) ===

	// The signed inputs a market prices from: the call's own, else the client's provider.
	async #inputsFor(
		m: { underlying: string },
		marketId: string,
		expiryMs: bigint,
		pricing: PricingOptions = {},
	): Promise<PricingInputs> {
		if (pricing.inputs) return pricing.inputs;
		if (!this.#pricingInputs) {
			throw new PredictInputError(
				'this read prices the market off chain and needs signed pricing inputs: pass ' +
					'`pricingInputs` (a PricingInputsProvider) to PredictClient, or `inputs` to this call',
			);
		}
		return this.#pricingInputs.pricingInputs({
			marketId,
			underlying: m.underlying,
			propbookUnderlyingId: this.#underlying(m.underlying).propbookUnderlyingId,
			expiryMs,
		});
	}

	// A market's pricer now, built off chain from signed inputs (`pricing::pricer_at`).
	async #localPricer(
		m: { underlying: string },
		marketId: string,
		expiryMs: bigint,
		pricing: PricingOptions = {},
	): Promise<ResolvedPricer> {
		const inputs = await this.#inputsFor(m, marketId, expiryMs, pricing);
		return pricerAt(inputs, { expiryMs }, Date.now(), this.#pricingFreshness);
	}

	// The market state a local quote prices with: its object (fee policy, the sponsored balance,
	// which moves, so it is read each time), its fee bands (kept for life, so cached) and, while
	// inventory impact is enabled, its payout tree.
	async #quoteMarket(marketId: string): Promise<QuoteMarket> {
		const [first, feeBands] = await Promise.all([
			readMarketObject(this.#client, marketId),
			this.#feeBands(marketId),
		]);
		// With inventory impact on, the charge reads the payout tree, which must be the same state as
		// the market's own fields.
		const market =
			first.fees.inventoryImpactMaxRate > 0n
				? await readMarketWithBook(this.#client, marketId)
				: { ...first, boundaries: undefined };
		const book = market.boundaries
			? { base: market.payout.base, boundaries: market.boundaries }
			: undefined;
		return {
			expiryMs: market.expiryMs,
			tickSizeRaw: market.tickSizeRaw,
			admissionTickSizeRaw: market.admissionTickSizeRaw,
			referenceTickRaw: market.referenceTickRaw,
			fees: market.fees,
			feeBands,
			feeIncentiveBalance: market.feeIncentiveBalance,
			book,
		};
	}

	async #feeBands(marketId: string): Promise<FeeBand[]> {
		const hit = this.#feeBandsCache.get(marketId);
		if (hit) return hit;
		const bands = await readFeeBands(this.#client, marketId);
		this.#feeBandsCache.set(marketId, bands);
		return bands;
	}

	// One pricing snapshot for a mint quote and every probe a plan makes with it: the market's
	// state and pricer now. The returned function prices one request: the account's own quote with
	// `availableRaw` (its balance caps a budget), else a quote for no particular account. A queued
	// order placed by this client names no builder, so it pays no builder fee.
	async #mintQuoter(
		m: MarketDescriptor,
		id: string,
		expiryMs: bigint,
		ticks: { lowerTick: bigint; higherTick: bigint },
		subsidyRate: bigint,
		pricing: PricingOptions = {},
	): Promise<(request: MintQuoteRequest, availableRaw?: bigint | null) => MintQuoteRaw> {
		const [market, pricer] = await Promise.all([
			this.#quoteMarket(id),
			this.#localPricer(m, id, expiryMs, pricing),
		]);
		const lotSize = BigInt(this.cfg.units.positionLotSize);
		return (request, availableRaw) =>
			localMintQuote({
				market,
				pricer,
				lowerTick: ticks.lowerTick,
				higherTick: ticks.higherTick,
				request,
				nowMs: pricer.pricedAtMs,
				feeIncentiveSubsidyRate: subsidyRate,
				availableRaw: availableRaw ?? undefined,
				lotSize,
			});
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

	// An early sell of an Open record, quoted locally against its range and held quantity. A record
	// that isn't Open has no quote, as the chain's `quote_redeem_open` refused it.
	async #sellQuote(
		m: MarketCoordinates,
		id: string,
		expiryMs: bigint,
		state: MarketQueueState,
		recordId: bigint,
		closeQuantityRaw: bigint,
		pricing: PricingOptions,
	): Promise<RedeemOpenQuoteRaw> {
		const record = state.records[0];
		if (!record || record.status !== ORDER_STATUS.OPEN || record.position.order_id === 0n) {
			throw new PredictMoveError('queue', 9n, 'ERecordNotOpen');
		}
		const lotSize = BigInt(this.cfg.units.positionLotSize);
		const [market, pricer] = await Promise.all([
			this.#quoteMarket(id),
			this.#localPricer(m, id, expiryMs, pricing),
		]);
		void recordId;
		return localSellQuote({
			market,
			pricer,
			order: decodeOrderRange(record.position.order_id, lotSize),
			closeQuantityRaw,
			nowMs: pricer.pricedAtMs,
			lotSize,
		});
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

	// The version constants the configured call targets compile: the network's own pins, else the
	// versions these bindings were generated from. A watermark above one retires that code.
	// A config that records Predict version 6 calls the version 6 packages, which compile the
	// versions these bindings were generated from. The network pins describe its version 5 targets.
	#predictCurrentVersion(): bigint {
		if (usesPredictV6(this.cfg)) return PREDICT_PACKAGE_VERSION;
		return this.cfg.packages.predictCurrentVersion ?? PREDICT_PACKAGE_VERSION;
	}

	#ordersCurrentVersion(): bigint {
		if (usesPredictV6(this.cfg)) return ORDER_FLOW_PACKAGE_VERSION;
		return this.cfg.packages.predictOrdersCurrentVersion ?? ORDER_FLOW_PACKAGE_VERSION;
	}

	// The Propbook objects a version 5 placement names, or none once the config calls version 6.
	#placementFeeds(underlying: string): MarketFeeds | null {
		return usesPredictV6(this.cfg) ? null : this.#feeds(underlying);
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
		const mode = executionModeFor(
			state.protocol.versionWatermark,
			true,
			true,
			this.#predictCurrentVersion(),
		);
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
		if (state.desk.versionWatermark > this.#ordersCurrentVersion()) {
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
			},
			feeds: MarketFeeds | null,
		) => (tx: Transaction) => TransactionResult,
	): Promise<QueuedOrderPlan> {
		const orders = this.#requireDelayedExecution();
		const feeds = this.#placementFeeds(m.underlying);
		const { id, state: market } = await this.#resolveMarket(m);
		const { lowerTick, higherTick } = await this.#strikeTicks(m, id, market);
		const thunk = build(
			orders,
			{
				expiryMarketId: id,
				wrapperId: this.wrapperIdFor(owner),
				lowerTick,
				higherTick,
			},
			feeds,
		);
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
		const feeds = this.#placementFeeds(m.underlying);
		const { id } = await this.#resolveMarket(m);
		const closeQuantityRaw = usdcToRaw(opts.quantity);
		this.#assertLot(closeQuantityRaw);
		const sell = {
			expiryMarketId: id,
			wrapperId: this.wrapperIdFor(owner),
			recordId: opts.recordId,
			closeQuantityRaw,
			minProbabilityRaw: probabilityToRaw(opts.minProbability),
			minProceedsRaw: usdcToRaw(opts.minProceeds),
		};
		const thunk = feeds
			? enqueueRedeemOpen(orders, { ...sell, ...feeds })
			: enqueueRedeemOpenV2(orders, sell);
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
				(orders, target, feeds) => {
					const terms = { ...target, quantityRaw, maxCostRaw, maxProbabilityRaw };
					return feeds
						? enqueueExactQuantity(orders, { ...terms, ...feeds })
						: enqueueExactQuantityV2(orders, terms);
				},
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
				(orders, target, feeds) => {
					const terms = { ...target, maxPremiumRaw, minQuantityRaw, maxCostRaw };
					return feeds
						? enqueueExactAmount(orders, { ...terms, ...feeds })
						: enqueueExactAmountV2(orders, terms);
				},
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
				(orders, target, feeds) => {
					const terms = { ...target, maxCostRaw, minQuantityRaw };
					return feeds
						? enqueueExactCost(orders, { ...terms, ...feeds })
						: enqueueExactCostV2(orders, terms);
				},
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
		 * market the plan was made for: the descriptor a mint plan was planned with, or the
		 * coordinates `read.planSell` took for a sell plan. Throws the plan's `refusal` as a
		 * `PredictPreflightError`, and `'fee'` when the balance now escrows less than the plan's
		 * budget.
		 */
		enqueuePlan: async <P extends MintPlan | SellPlan>(
			owner: string,
			m: P extends SellPlan ? MarketCoordinates : MarketDescriptor,
			plan: P,
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
			// A mint needs the descriptor's strike and side. A plan typed only as
			// `MintPlan | SellPlan` can pass bare coordinates, so check.
			const descriptor = 'side' in m ? (m as MarketDescriptor) : null;
			let placed: QueuedOrderPlan;
			if (order.builder === 'enqueueSell') {
				if (order.options.recordId !== target.recordId) {
					throw new PredictInputError(
						`the plan was made for record ${target.recordId}, not ${order.options.recordId}`,
					);
				}
				placed = await this.tx.enqueueSell(owner, m, order.options);
			} else {
				if (descriptor == null) {
					throw new PredictInputError(
						'a mint plan needs the market descriptor it was planned with (its strike and side)',
					);
				}
				const { lowerTick, higherTick } = await this.#strikeTicks(descriptor, id, marketState);
				if (lowerTick !== target.lowerTick || higherTick !== target.higherTick) {
					throw new PredictInputError(
						'the market descriptor names a different strike or side than the plan, or its reference strike moved: plan again',
					);
				}
				placed =
					order.builder === 'enqueueMintCost'
						? await this.tx.enqueueMintCost(owner, descriptor, order.options)
						: await this.tx.enqueueMint(owner, descriptor, order.options);
			}
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
		 *
		 * Once the config records Predict version 6 the commit is `queue::commit_v2`, which also needs
		 * the signed Block Scholes value and SVI batches for each τ's slots (`valueMessages`,
		 * `sviMessages`, see `queue.bsSlots`). It verifies them with the Block Scholes verifier
		 * (`blockScholes`, else `config.oracle`) and decodes them under the market's oracle binding.
		 */
		fill: async (
			m: MarketCoordinates,
			opts: {
				payloads: readonly Uint8Array[];
				maxOrders?: number;
				refundOverdue?: boolean;
				lazerStateId?: string;
				/** Signed Block Scholes value batches. Predict version 6 only. */
				valueMessages?: readonly Uint8Array[];
				/** Signed Block Scholes SVI batches. Predict version 6 only. */
				sviMessages?: readonly Uint8Array[];
				/** The Block Scholes verifier. Defaults to `config.oracle`. Predict version 6 only. */
				blockScholes?: { packageId?: string; signerRegistryId?: string };
			},
		): Promise<Transaction> => {
			const orders = this.#requireDelayedExecution();
			const stateId = opts.lazerStateId ?? this.cfg.oracle?.pythLazerState;
			if (!stateId) {
				throw new PredictInputError('fill needs the Pyth Lazer State: pass `lazerStateId`');
			}
			const { id, state } = await this.#resolveMarket(m);
			const queueId = await this.#existingQueueId(orders, id);
			const lazer = await lazerPackages(this.#client, stateId);
			if (usesPredictV6(this.cfg)) {
				if (!this.cfg.packages.predictMathV3) {
					throw new PredictInputError(
						'the version 6 commit builds its volatility with the `block_scholes` module of `deepbook_predict_math`: record `packages.predictMathV3`',
					);
				}
				const packageId = opts.blockScholes?.packageId ?? this.cfg.oracle?.blockScholesPackage;
				const signerRegistryId =
					opts.blockScholes?.signerRegistryId ?? this.cfg.oracle?.blockScholesSignerRegistry;
				if (!packageId || !signerRegistryId) {
					throw new PredictInputError(
						'fill needs the Block Scholes verifier: pass `blockScholes.packageId` and `blockScholes.signerRegistryId`',
					);
				}
				const [blockScholes, binding] = await Promise.all([
					blockScholesPackages(this.#client, { packageId, signerRegistryId }),
					this.read.oracleBinding(m.underlying),
				]);
				if (!binding) {
					throw new PredictInputError(
						`${m.underlying} has no oracle binding yet, so its orders can't be committed`,
					);
				}
				return txOf(
					fillV2(orders, {
						expiryMarketId: id,
						queueId,
						payloads: opts.payloads,
						lazer,
						valueMessages: opts.valueMessages ?? [],
						sviMessages: opts.sviMessages ?? [],
						blockScholes,
						binding,
						expiryMs: state.expiryMs,
						maxOrders: BigInt(opts.maxOrders ?? 15),
						refundOverdue: opts.refundOverdue,
					}),
				);
			}
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

		/**
		 * Anonymous board pricing: the probability of both sides of a strike, from one pricer (no
		 * account needed). This is the ↑/↓ button price before a user has onboarded. Computed off
		 * chain from signed inputs (see the constructor's `pricingInputs`), as Predict version 5's
		 * `range_price` did on chain, to about 1e-4. Throws `ELivePricingExpired` (a
		 * `PredictMoveError`) at or past expiry, as the chain read did.
		 */
		price: async (
			m: BinaryMarketCoordinates,
			pricing: PricingOptions = {},
		): Promise<{ up: number; down: number }> => {
			const { id, state } = await this.#resolveMarket(m);
			const strikeRaw = await this.#strikeRawFor(m, id, state);
			const pricer = await this.#localPricer(m, id, state.expiryMs, pricing);
			const tick = strikeRaw / state.tickSizeRaw;
			// UP is (strike, +∞] and DOWN is (−∞, strike], each priced as the chain's `range_price`.
			const up = rangeBoundaries(pricer, tick, POS_INF_TICK, state.tickSizeRaw);
			const down = rangeBoundaries(pricer, 0n, tick, state.tickSizeRaw);
			const upRaw = up.lowerUp ?? 0n;
			const downRaw = 1_000_000_000n - (down.higherUp ?? 0n);
			return { up: rawToProbability(upRaw), down: rawToProbability(downRaw) };
		},

		/**
		 * A client-side board pricer for one market: one pricer built off chain from signed inputs
		 * (the forward re-anchored on the Pyth spot, the SVI rolled down to now), then every strike
		 * priced LOCALLY — `pricer.up(strike)`, `.down(strike)`, `.range(lo,hi)`,
		 * `.strikeAtProbability(p)`. `asOf` carries the inputs' source times. Throws the
		 * `PredictMoveError` the chain's pricer load raised in the same case (`ELivePricingExpired`,
		 * `EBlockScholesInputsInvalid`, `EBlockScholesMinVarianceInvalid`).
		 */
		pricer: async (
			m: Pick<MarketDescriptor, 'underlying' | 'expiryMs' | 'marketId'>,
			pricing: PricingOptions = {},
		): Promise<BoardPricer & { asOf: PricerSnapshot['sources'] }> => {
			const { id, state } = await this.#resolveMarket(m);
			const snap = await this.#localPricer(m, id, state.expiryMs, pricing);
			return { ...boardPricer(snap), asOf: snap.sources };
		},

		/**
		 * Pre-trade quote of a queued exact-quantity mint at the current price, for one account:
		 * the order fee read from the desk, no congestion penalty in `cost` (a queued fill pays
		 * none), and `queued: true`. Computed off chain from signed inputs (see the constructor's
		 * `pricingInputs`) as Predict version 5's `quote_mint_for_account` did. Throws
		 * `EOrderFailsLimits` (a `PredictMoveError`) where that quote refused, and
		 * `PredictInputError` while the config doesn't record delayed execution.
		 */
		quoteMint: async (
			owner: string,
			m: MarketDescriptor,
			opts: Pick<MintOptions, 'quantity'> & PricingOptions,
		): Promise<MintQuote> => {
			const orders = this.#requireDelayedExecution();
			const { id, state } = await this.#resolveMarket(m);
			const quantityRaw = usdcToRaw(opts.quantity);
			this.#assertLot(quantityRaw);
			const ticks = await this.#strikeTicks(m, id, state);
			const ctx = await quoteContext(this.#client, orders, {
				owner,
				coinType: this.cfg.quoteCoinType,
			});
			const quote = await this.#mintQuoter(
				m,
				id,
				state.expiryMs,
				ticks,
				ctx.feeIncentiveSubsidyRate,
				opts,
			);
			return PredictClient.#queuedMintQuote(
				quote({ shape: 'exact-quantity', quantityRaw }, ctx.availableRaw),
				ctx.policy,
			);
		},

		/**
		 * Quote the queued all-in budget mint at `min(spend, available − fee)`, the budget enqueue
		 * escrows, as `quoteMint` does. Requires the owner's account.
		 */
		quoteMintCost: async (
			owner: string,
			m: MarketDescriptor,
			opts: MintCostOptions & PricingOptions,
		): Promise<MintQuote> => {
			const orders = this.#requireDelayedExecution();
			const { id, state } = await this.#resolveMarket(m);
			const ticks = await this.#strikeTicks(m, id, state);
			const ctx = await quoteContext(this.#client, orders, {
				owner,
				coinType: this.cfg.quoteCoinType,
			});
			const fee = ctx.policy.orderFee;
			const availableRaw = ctx.availableRaw ?? 0n;
			const spendRaw = usdcToRaw(opts.spend);
			const escrowable = availableRaw > fee ? availableRaw - fee : 0n;
			const quote = await this.#mintQuoter(
				m,
				id,
				state.expiryMs,
				ticks,
				ctx.feeIncentiveSubsidyRate,
				opts,
			);
			return PredictClient.#queuedMintQuote(
				quote(
					{
						shape: 'exact-cost',
						maxCostRaw: spendRaw < escrowable ? spendRaw : escrowable,
						minQuantityRaw: usdcToRaw(opts.minQuantity),
					},
					availableRaw,
				),
				ctx.policy,
			);
		},

		/**
		 * Quote an early sell of an Open record at the current price, computed off chain from signed
		 * inputs as Predict version 5's `quote_redeem_open` did. `proceeds` is before the order fee,
		 * with no congestion penalty, and `net` takes the fee off. Throws `ERecordNotOpen` (a
		 * `PredictMoveError`, as the chain's quote did) when the record isn't Open.
		 */
		quoteSell: async (
			_owner: string,
			m: MarketCoordinates,
			opts: { recordId: bigint; quantity: number } & PricingOptions,
		): Promise<SellQuote> => {
			const orders = this.#requireDelayedExecution();
			const { id, state: market } = await this.#resolveMarket(m);
			const closeQuantityRaw = usdcToRaw(opts.quantity);
			this.#assertLot(closeQuantityRaw);
			const state = await this.#queueState(orders, id, { recordIds: [opts.recordId] });
			const raw = await this.#sellQuote(
				m,
				id,
				market.expiryMs,
				state,
				opts.recordId,
				closeQuantityRaw,
				opts,
			);
			const orderFee = state.desk.policy.orderFee;
			return {
				probability: rawToProbability(raw.probability),
				proceeds: rawToUsdc(raw.proceeds),
				net: rawToUsdc(raw.proceeds - orderFee),
				fees: {
					trading: rawToUsdc(raw.tradingFee),
					builder: rawToUsdc(raw.builderFee),
					inventoryImpactRebate: rawToUsdc(raw.inventoryImpactRebate),
					order: rawToUsdc(orderFee),
				},
				quantityClosed: rawToUsdc(raw.closeQuantity),
				raw: {
					probability: raw.probability,
					proceeds: raw.proceeds,
					orderFee,
					quantityClosed: raw.closeQuantity,
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
				this.#predictCurrentVersion(),
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
			const mode = executionModeFor(
				state.protocol.versionWatermark,
				true,
				true,
				this.#predictCurrentVersion(),
			);
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
		 * Works for a visitor without an account: the quote is then for no particular account.
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
			const { id, state: market } = await this.#resolveMarket(m);
			const { lowerTick, higherTick } = await this.#strikeTicks(m, id, market);
			const hasAccount = await this.#hasAccount(owner);
			const state = await this.#queueState(orders, id, hasAccount ? { owner } : {});
			const nowMs = BigInt(Date.now());
			const policy = state.desk.policy;
			const fee = policy.orderFee;
			const availableRaw = state.account?.availableRaw ?? null;
			const lot = BigInt(this.cfg.units.positionLotSize);
			const pricing: PricingOptions = { inputs: opts.inputs };
			// One pricer for the quote and every probe the plan sizes with. A pricer that can't be built
			// (a market past its expiry, say) is refused as the quote would be.
			const quoter = await this.#mintQuoter(
				m,
				id,
				market.expiryMs,
				{ lowerTick, higherTick },
				state.protocol.feeIncentiveSubsidyRate,
				pricing,
			).catch(async (error: unknown) => {
				throw await this.#quoteRefusal(error);
			});
			// The account's own quote caps a budget at its balance. The anonymous one doesn't.
			const forAccount = async (request: MintQuoteRequest) => quoter(request, availableRaw);
			const anonymous = (request: AnonymousMintQuoteRequest) => quoter(request);

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
					this.#searchBudgetQuote(anonymous, budget, lot).catch(async (error: unknown) => {
						// Every probe refused ends the search in 'min-premium', which a strike outside
						// the entry band also explains.
						if (error instanceof PredictPreflightError && error.code === 'min-premium') {
							throw (await this.#entryBandRefusal(m, undefined, pricing)) ?? error;
						}
						throw await this.#quoteRefusal(error, { m, pricing });
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
						// The chain refused the budget at the account's own pricing, its builder fee
						// included. The account-free search only diagnoses the refusal: a strike outside
						// the entry band, or a budget too small for the minimum premium, throws its typed
						// refusal. It leaves the builder fee out, so a budget only it can size is never
						// planned, and keeps the chain's own error. (Near $1 a contract, admission's
						// payout-bound step-down isn't monotone, so a slightly smaller budget can pass
						// where this one is refused. That is a false refusal, never a bad order.)
						await search();
						throw error;
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
						: anonymous({ shape: 'exact-quantity', quantityRaw });
				} catch (error) {
					throw await this.#quoteRefusal(error, { m, quantityRaw, pricing });
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
			let admitted:
				| { quantity: bigint }
				| { refusal: 'min-premium' | 'cost-above-payout' | 'entry-band' }
				| null = null;
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
					async (quantityRaw) =>
						quoteForAccount
							? forAccount({ shape: 'exact-quantity', quantityRaw })
							: anonymous({ shape: 'exact-quantity', quantityRaw }),
					budgetRaw,
					start < quote.quantity ? start : quote.quantity,
					lot,
					quote.entryProbability,
					quote.quantity === 0n ? 0n : (unsubsidizedCost * 1_000_000_000n) / quote.quantity,
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
							: admitted.refusal === 'entry-band'
								? "the entry probability left the market's entry band while the order was sized: plan again, or pick a strike nearer the money"
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
				.quoteSell(owner, m, {
					recordId: opts.recordId,
					quantity: opts.quantity,
					inputs: opts.inputs,
				})
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
				record
					? {
							recordId: recordIds[i],
							record,
							view: orderView(record, nowMs, {
								lotSize: BigInt(this.cfg.units.positionLotSize),
							}),
						}
					: null,
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
		 * A market's state and its NAV mark, or `null` when no market exists for the coordinates.
		 * The NAV is computed off chain from signed inputs (see the constructor's `pricingInputs`),
		 * as Predict version 5's `current_nav` did on chain: free cash less the payout tree's
		 * marked liability, priced by the local pricer. It reads the market's whole payout tree (one
		 * page per 50 strikes) and throws `ELivePricingExpired` at or past expiry, as the chain read
		 * did.
		 */
		market: async (
			m: Pick<MarketDescriptor, 'underlying' | 'expiryMs'>,
			pricing: PricingOptions = {},
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
			// The cash and the payout tree are read as one state (`readMarketWithBook`).
			const [object, pricer] = await Promise.all([
				readMarketWithBook(this.#client, id),
				this.#localPricer(m, id, state.expiryMs, pricing),
			]);
			const navRaw = localNav({
				cashBalance: object.cashBalance,
				inventoryImpactReserve: object.inventoryImpactReserve,
				book: { base: object.payout.base, boundaries: object.boundaries },
				pricer,
				tickSizeRaw: state.tickSizeRaw,
			});
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
		 * The market's settlement price, or `null` until a keeper settles it. Unlike `market`,
		 * `price` and the quotes, which abort `ELivePricingExpired` once the market expires, it
		 * keeps working after expiry, when an app shows results. With delayed execution the
		 * keeper settles a market, pays its Open records and cleans them up within about a second
		 * of expiry, so `read.order` returns `null` by then. Keep each filled record's
		 * `position.orderId` and pass it to `cost.settledPayout` with this price.
		 */
		settlement: async (m: MarketCoordinates): Promise<MarketSettlement> => {
			const { id, state } = await this.#resolveMarket(m);
			const raw = await settlementPrice(this.#client, this.#config, id);
			return {
				marketId: id,
				expiryMs: state.expiryMs,
				settled: raw != null,
				settlementPrice: raw == null ? null : fromRaw(raw, 9),
				settlementPriceRaw: raw,
				tickSizeRaw: state.tickSizeRaw,
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

		/**
		 * A market's fee bands: trades whose price is in `[low, high)` pay `multiplier` × the trading
		 * fee. The template the market copied at creation, kept for life, so it is cached per market.
		 * `[]` charges every price 1x.
		 */
		feeBands: async (m: MarketCoordinates): Promise<FeeBand[]> =>
			this.#feeBands((await this.#resolveMarket(m)).id),

		/**
		 * An underlying's oracle binding (Predict version 6): the Pyth Lazer feed and channel, and the
		 * Block Scholes base asset, SVI model and decimals its markets price, settle and value with.
		 * Decoded from the `OracleBindingKey` dynamic field on `ProtocolConfig`. `null` while the admin
		 * hasn't set one. Throws `PredictInputError` while the config doesn't record version 6.
		 */
		oracleBinding: async (underlying: string): Promise<OracleBinding | null> => {
			const predictV6 = this.cfg.packages.predictV6;
			if (!predictV6) {
				throw new PredictInputError(
					`oracle bindings are a Predict version 6 setting, which isn't recorded for ${this.cfg.network}: record \`packages.predictV6\``,
				);
			}
			return readOracleBinding(this.#client, {
				protocolConfigId: this.cfg.objects.protocolConfig,
				predictV6,
				propbookUnderlyingId: this.#underlying(underlying).propbookUnderlyingId,
			});
		},

		/**
		 * The order desk's Block Scholes slot timing (`desk::bs_timing`, `deepbook_predict_orders`
		 * version 3): which value and SVI slots a commit at τ takes, and the gap wait before the next
		 * slot is accepted. The defaults while unset. Throws `PredictInputError` while the config
		 * doesn't record version 3.
		 */
		bsTiming: async (): Promise<BsTiming & { isDefault: boolean }> => {
			const predictOrdersV3 = this.cfg.packages.predictOrdersV3;
			const orderDesk = this.cfg.objects.orderDesk;
			if (!predictOrdersV3 || !orderDesk) {
				throw new PredictInputError(
					`the Block Scholes timing is a deepbook_predict_orders version 3 setting, which isn't recorded for ${this.cfg.network}`,
				);
			}
			return readBsTiming(this.#client, { orderDeskId: orderDesk, predictOrdersV3 });
		},

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
		/**
		 * `OracleBindingUpdated` (Predict version 6): an underlying's oracle binding set or replaced.
		 * Matched against `packages.predictV6`, the version that defines it.
		 */
		oracleBindingUpdates: (r: DecodableTransactionResult) =>
			decodeOracleBindingUpdates(this.cfg, r),
		/**
		 * `BsTimingUpdated` (`deepbook_predict_orders` version 3): the order desk's Block Scholes slot
		 * timing set. Matched against `packages.predictOrdersV3`, the version that defines it.
		 */
		bsTimingUpdates: (r: DecodableTransactionResult) => decodeBsTimingUpdates(this.cfg, r),
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
