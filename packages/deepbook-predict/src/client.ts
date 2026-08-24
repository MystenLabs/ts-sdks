import type { ClientWithCoreApi, SuiClientRegistration } from '@mysten/sui/client';
import { Transaction, coinWithBalance, type TransactionResult } from '@mysten/sui/transactions';
import { isValidSuiObjectId } from '@mysten/sui/utils';
import { getConfig, type PredictConfig, type UnderlyingConfig } from './config/index.js';
import { toGeneratedConfig, type GeneratedConfig } from './config/generated.js';
import {
	decodeAccountsCreated,
	decodeBuilderCodeSets,
	decodeClaims,
	decodeDeposits,
	decodeMints,
	decodePlpCancels,
	decodePlpRequests,
	decodeRedeems,
	decodeWithdrawals,
	exactlyOne,
	type DecodableTransactionResult,
} from './decode.js';
import { PredictInputError } from './errors.js';
import { simulateWithEvents } from './reads/inspect.js';
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
import type { MarketFeeds } from './tx/trade.js';
import { mintExactAmount, mintExactQuantity, redeemLive, redeemSettled } from './tx/trade.js';
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
export const POSITION_LOT_SIZE = 10_000n;

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

/** Options for `redeem` / `claimSettled`: which order and how much to close. */
export interface CloseOptions {
	orderId: bigint;
	quantity: number;
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
 * the escrowed DUSDC/PLP behind them is tracked separately. */
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
	/** Net premium into LP backing (quote units). */
	premium: number;
	fees: { trading: number; subsidy: number; builder: number; penalty: number };
	/**
	 * All-in account debit: premium + (trading − subsidy) + builder + penalty —
	 * exactly what the chain withdraws; pass this (plus your buffer) as maxCost.
	 */
	cost: number;
	quantity: number;
	raw: { premium: bigint; cost: bigint; quantity: bigint; entryProbability: bigint };
	/** True: computed by the real mint code path against real account state. */
	feesExact: true;
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
 * (cached), and delegates to the internal tx primitives / reads. Callers who need
 * to compose their own PTBs can use the generated bindings under `contracts/`.
 */
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
		if (quantityRaw % POSITION_LOT_SIZE !== 0n) {
			throw new PredictInputError(
				`quantity ${quantityRaw} raw is not a whole ${POSITION_LOT_SIZE}-unit lot (position_lot_size)`,
			);
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
		// in the owner's DUSDC *address balance* (the versionless accumulator) via
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

		mint: (owner: string, m: MarketDescriptor, opts: MintOptions): Promise<Transaction> =>
			this.#buildMint(owner, m, opts),

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

		redeem: (owner: string, m: MarketDescriptor, opts: CloseOptions): Promise<Transaction> =>
			this.#buildRedeem(owner, m, opts),

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

		// Queue a supply request pulling `amountUsdc` from the account's existing custody
		// balance. `request_supply` auto-settles DUSDC then `account.withdraw`s the payment
		// into queue escrow; the PLP fill is delivered at the next flush, not returned here.
		// Command order is auth → request (auth is a hot potato consumed by this call). The
		// `minPlpOut` slot is the per-request floor on PLP minted at flush — pinned to 0
		// (no floor) here; after three flushes miss the floor the request is cancelled and
		// refunded.
		supplyPlp: (owner: string, amountUsdc: number | string): Transaction =>
			txOf(
				requestSupply({
					config: this.#config,
					arguments: {
						wrapper: this.wrapperIdFor(owner),
						amount: usdcToRaw(amountUsdc),
						minPlpOut: 0n,
					},
				}),
			),

		// Queue a withdraw request pulling `shares` (raw PLP u64) from account custody into
		// queue escrow — the Move parameter is named `amount`, but on `request_withdraw` it
		// counts PLP SHARES, not DUSDC. Auto-settles flush-delivered PLP first; the DUSDC
		// fill lands on the account at the next flush (no `withdraw_settled` entrypoint).
		// Command order is auth → request. The `minDusdcOut` slot is the per-request floor
		// on DUSDC paid at flush — pinned to 0 (no floor) here; after three flushes miss the
		// floor the request is cancelled and refunded.
		withdrawPlp: (owner: string, shares: bigint): Transaction =>
			txOf(
				requestWithdraw({
					config: this.#config,
					arguments: {
						wrapper: this.wrapperIdFor(owner),
						amount: shares,
						minDusdcOut: 0n,
					},
				}),
			),

		// Cancel a still-pending supply request by queue `index`, refunding its escrowed
		// DUSDC straight back into the requesting account. Command order is auth → cancel.
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

		// Exact pre-trade quote: dry-runs the caller's own mint (same tx as
		// tx.mint) and decodes the receipt. Requires a funded account; throws
		// the same typed errors the real trade would — quote doubles as preflight.
		quoteMint: async (
			owner: string,
			m: MarketDescriptor,
			opts: Pick<MintOptions, 'quantity'>,
		): Promise<MintQuote> => {
			const tx = await this.#buildMint(owner, m, opts);
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
		},

		// Exact pre-close quote: dry-runs the caller's own redeem and decodes
		// the receipt — the informed close against the floor-less deployed redeem.
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

		balance: async (owner: string): Promise<number> =>
			rawToUsdc(await accountBalance(this.#client, this.#config, owner, this.cfg.quoteCoinType)),

		// PLP shares held in the owner's account custody (raw u64, 6-decimal PLP coin).
		plpBalance: (owner: string): Promise<bigint> =>
			accountBalance(this.#client, this.#config, owner, `${this.cfg.packages.predict}::plp::PLP`),

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
	};
}
