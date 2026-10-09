// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Typed errors for the Predict SDK.
//
// Two failure kinds cross the SDK boundary:
//   - PredictInputError — a caller gave us something we rejected before touching
//     the chain (unknown underlying, malformed argument, …).
//   - PredictMoveError — a Move `abort` surfaced by a read/simulate. Predict's error
//     constants are plain `u64` codes, not clever errors, so the fullnode can't name
//     them: `decodeMoveAbort` maps `(module, code)` to the constant name with
//     ABORT_NAMES below. A clever-error name the fullnode does decode takes precedence.

/** A caller-supplied argument the SDK rejected before building/sending a tx. */
export class PredictInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PredictInputError';
	}
}

/** A Move `abort` decoded from a simulate/read failure. */
export class PredictMoveError extends Error {
	readonly module: string;
	/** Exact u64 abort code — bigint because clever-error encodings pack data
	 * into the high bits, which Number would silently truncate. */
	readonly code: bigint;
	/** The `E…` constant name: the fullnode's clever-error name when it decodes
	 * one, else the name {@link ABORT_NAMES} gives the module's plain code, or null
	 * when neither knows the abort. */
	readonly abortName: string | null;

	constructor(module: string, code: bigint, abortName: string | null) {
		super(
			abortName
				? `Move abort in ${module}: ${abortName} (code ${code})`
				: `Move abort in ${module}: code ${code}`,
		);
		this.name = 'PredictMoveError';
		this.module = module;
		this.code = code;
		this.abortName = abortName;
	}
}

// The structured MoveAbort execution error surfaced by `@mysten/sui` on a failed
// simulate/execute. Read structurally rather than via the client's exported
// `SuiClientTypes.ExecutionError` (`@mysten/sui/client`) so mocked simulate results
// and future API-shape drift still satisfy it — the same convention reads/inspect.ts
// uses for its simulate seam. Field provenance:
//   - `MoveAbort.abortCode`                → u64 abort code as a decimal string.
//   - `MoveAbort.location.module`          → the aborting module's short name.
//   - `MoveAbort.cleverError.constantName` → the `E…` error constant, decoded by the
//     fullnode from the clever-error bits of the abort code and surfaced by the gRPC
//     (`grpc/core.ts` parseMoveAbort) and GraphQL transports. Only a clever-error abort
//     carries one, and Predict's plain `u64` constants never do, so ABORT_NAMES names
//     those. JSON-RPC surfaces no `constantName` at all.
export interface MoveAbortError {
	MoveAbort?: {
		abortCode?: string | number | bigint;
		location?: { module?: string };
		cleverError?: { constantName?: string };
	};
}

/**
 * The error constants of the Predict modules the SDK's flows abort in, by module, as an array
 * indexed by the plain `u64` abort code (each module numbers its constants from 0 with no gaps).
 * Generated from the Move sources at deepbookv3 d8fa6aa8. A published code never changes meaning:
 * new codes only append, so an older package version's codes are a prefix of its module's list.
 * Keyed by module name only, as the abort location reports it, so a same-named module in an
 * unrelated package would be named from this table too.
 */
export const ABORT_NAMES: Readonly<Record<string, readonly string[]>> = Object.freeze({
	// Predict (`deepbook_predict`). Append-only since v1, so older package versions use a prefix.
	expiry_market: [
		'EMintPaused',
		'EMarketNotSettled',
		'EMintCostAboveMax',
		'EMintProbabilityAboveMax',
		'EWrongPricer',
		'EReferenceTickObservationMissing',
		'EMintRedeemSameTimestamp',
		'ERedeemProbabilityBelowMin',
		'ERedeemProceedsBelowMin',
		'EMintCostCapRequired',
		'EMarketNotPendingValuation',
		'EMintCostAboveMaxPayout',
		'ENotSettledRedeemKeeper',
		'EDelayedExecutionRequired',
		'EOrderFailsLimits',
		'EInsufficientMarketCash',
		'EInvalidOrderTiming',
		'EInvalidOrderTerms',
		'EWrongMarket',
		'EWrongStage',
		'ENotRecordOwner',
		'EEscrowMismatch',
		'EWrongPrice',
	],
	protocol_config: [
		'ETradingPaused',
		'EValuationInProgress',
		'EValuationNotInProgress',
		'EPackageVersionDisabled',
		'EVersionWatermarkNotAdvanced',
		'EProtocolFrozen',
		'ESnapshotInProgress',
		'ETradeWindowClosed',
		'ESettledRedeemKeeperAlreadyAdded',
		'ESettledRedeemKeeperNotFound',
		'EFlushOperatorAlreadyAdded',
		'EFlushOperatorNotFound',
		'ENotFlushOperator',
		'ECutoverNotReached',
		'EEwmaRetired',
		'EOrderFlowNotAllowed',
	],
	// Predict's live pricer, which every quote, plan and enqueue loads.
	pricing: [
		'EZeroForward',
		'ECannotBeNegative',
		'ENonPositiveVariance',
		'EInvalidRange',
		'EBlockScholesPriceStale',
		'EBlockScholesInputsInvalid',
		'EPythSpotInvalid',
		'EWrongPythFeed',
		'EWrongBlockScholesValueStore',
		'ELivePricingExpired',
		'EBlockScholesSVIStale',
		'EWrongBlockScholesSVIStore',
		'EBlockScholesPriceUnavailable',
		'EBlockScholesSVIUnavailable',
		'EBlockScholesMinVarianceInvalid',
		'EOracleWrittenInThisTransaction',
		'EBlockScholesInputTooWide',
		'EPythSpotUnavailable',
		'EPythSpotStale',
		'EPythForwardRequired',
	],
	// The order-flow package (`deepbook_predict_orders`).
	queue: [
		'EWrongDesk',
		'EWrongMarket',
		'EQueueStuck',
		'EQueueFull',
		'EAccountOrderCap',
		'EPastCutoff',
		'EMintCostCapRequired',
		'EFeeNotCovered',
		'EBelowMinSell',
		'ERecordNotOpen',
		'ENotRecordOwner',
		'EMarketNotSettled',
		'EMarketNotExpired',
	],
	desk: ['EPackageVersionDisabled', 'EVersionWatermarkNotAdvanced', 'EProtocolFrozen'],
	order_queue: ['ERecordNotOpen'],
	delayed_execution_config: [
		'EInvalidDelayMs',
		'EInvalidStallTimeoutMs',
		'EInvalidStuckThresholdMs',
		'EInvalidGapWaitMs',
		'EInvalidPythPriceBufferMs',
		'EInvalidSviMaxAgeMs',
		'EInvalidMintCapacity',
		'EInvalidSellCapacity',
		'EInvalidPerAccountCap',
		'EInvalidMinSellQuantity',
		'EInvalidOrderFee',
		'EInvalidSettleRefundBatch',
		'EInvalidSettlePayoutBatch',
		'EUnsupportedPythChannel',
		'EInvalidTiming',
		'EInvalidLimits',
	],
	// The math library (`deepbook_predict_math`).
	lazer_price: ['EPropertyNotRequested', 'EGenerationAfterEnvelope', 'EFeedMissing'],
	// Sessions (`deepbook_sessions`), which the `/sessions` Predict wrappers abort in.
	sessions: ['EInvalidSessionDuration', 'ESessionNotAuthorized', 'ESessionLimitExceeded'],
	session_config: ['EPackageVersionDisabled', 'EVersionWatermarkNotAdvanced'],
	// The shared account (`deepbook_account`).
	account_registry: ['EAppAlreadyAuthorized', 'EAppNotAuthorized', 'EAccountAlreadyExists'],
});

/**
 * The constant name of a plain `u64` abort `code` in `module`, from {@link ABORT_NAMES}, or null
 * when the module or the code is unknown.
 */
export function abortNameFor(module: string, code: bigint): string | null {
	// Own keys only: a module named like an `Object.prototype` member is simply unknown.
	if (!Object.hasOwn(ABORT_NAMES, module)) return null;
	const names = ABORT_NAMES[module];
	if (code < 0n || code >= BigInt(names.length)) return null;
	return names[Number(code)];
}

/**
 * Decode a `@mysten/sui` MoveAbort execution error into a {@link PredictMoveError}.
 * Returns null when `error` carries no MoveAbort (InsufficientGas, a size error, any
 * non-abort failure), so callers can fall back to a plain Error.
 *
 * `abortName` is the chain-decoded clever-error constant when the fullnode surfaces one, and
 * otherwise the name {@link ABORT_NAMES} gives the module's plain code (Predict's constants are
 * plain codes, so this is the usual path). It is null when neither knows the abort.
 * `code` stays a bigint — a clever-error abort code packs the module, line, and
 * constant index into the high bits of the u64 and would lose precision as a Number.
 */
export function decodeMoveAbort(error: MoveAbortError | null | undefined): PredictMoveError | null {
	const abort = error?.MoveAbort;
	if (!abort) return null;
	const module = abort.location?.module ?? '';
	const code = abort.abortCode != null ? BigInt(abort.abortCode) : 0n;
	const abortName = abort.cleverError?.constantName ?? abortNameFor(module, code);
	return new PredictMoveError(module, code, abortName);
}

// === Delayed execution (DBU-885) ===

/**
 * Why a queued-order builder refused to add an enqueue. The builder reads the market first and
 * throws this instead of building a transaction the queue or protocol gates would abort, so a
 * refused order never fails the rest of a transaction. Each code mirrors one on-chain refusal. The
 * order's own limits at the current price are checked only on chain (`EOrderFailsLimits`).
 */
export type PredictPreflightCode =
	/**
	 * Delayed execution isn't live: Predict's version watermark isn't raised
	 * (`ECutoverNotReached`), or Predict doesn't allowlist the order-flow package yet
	 * (`EOrderFlowNotAllowed`).
	 */
	| 'not-live'
	/** The market has no `MarketQueue` yet: `queue::create_and_share` hasn't run for it. */
	| 'no-queue'
	/**
	 * A version floor retired code this SDK calls: Predict's watermark is above the Predict
	 * version it was built for (`protocol_config::EPackageVersionDisabled`), or the order desk's
	 * floor is above its order-flow package (`desk::EPackageVersionDisabled`). Update the SDK.
	 */
	| 'retired'
	/** Trading is paused, the protocol is frozen, or minting is paused on this market. */
	| 'paused'
	/** The market's pricing is delayed (`queue_stuck`). Enqueue aborts `EQueueStuck`. */
	| 'stuck'
	/** The order's τ would land at or after the market's order cutoff (`EPastCutoff`). */
	| 'past-cutoff'
	/** The market has its maximum unfinished mints or sells (`EQueueFull`). */
	| 'queue-full'
	/** The account has its maximum unfinished orders in this market (`EAccountOrderCap`). */
	| 'account-cap'
	/**
	 * The account balance doesn't cover the order fee (`EFeeNotCovered`). A `read.planMint` plan
	 * also reports it when the balance doesn't cover the plan's `totalDebit`, since its limits assume
	 * the whole budget, or when the owner has no account yet. Prompt a top-up.
	 */
	| 'fee'
	/** A mint's cash need is above the market's spare cash (`EInsufficientMarketCash`). */
	| 'market-cash'
	/**
	 * The escrowed budget, or an exact-amount mint's premium cap, can't buy the minimum premium,
	 * so the order fails its limits. A budget `read.planMint` plan also reports it when what the
	 * budget buys without the fee subsidy, as admission prices it, has a premium below the minimum.
	 */
	| 'min-premium'
	/**
	 * The order's all-in cost without the fee subsidy is above its payout, so admission refuses it
	 * at any slippage (`EOrderFailsLimits`), or for a budget, the fill costs about its payout, where
	 * admission's sizing can't be previewed. Only `read.planMint` reports it, near a certain outcome.
	 */
	| 'cost-above-payout'
	/** A sell is below the policy minimum, or leaves a remainder below it (`EBelowMinSell`). */
	| 'below-min-sell'
	/** The record to sell is missing or not Open (`ERecordNotOpen`). */
	| 'record-not-open'
	/** The record to sell belongs to another account (`ENotRecordOwner`). */
	| 'not-record-owner';

/** A queued-order builder's refusal, raised before any transaction is built. */
export class PredictPreflightError extends Error {
	readonly code: PredictPreflightCode;

	constructor(code: PredictPreflightCode, message: string) {
		super(message);
		this.name = 'PredictPreflightError';
		this.code = code;
	}
}

// Readable text for the aborts a trader, an app or a filler meets on the delayed-execution
// paths, keyed by `module::EName` as `decodeMoveAbort` names it. The queue's own
// checks are in the order-flow companion's `queue` and `desk` modules; Predict's admission, fill
// and quote checks stay in `expiry_market` and `protocol_config`; the Lazer decode is in the math
// library's `lazer_price`.
const PREDICT_ERROR_TEXT: Readonly<Record<string, string>> = Object.freeze({
	// Placement (`queue::enqueue_*`).
	'queue::EQueueStuck': 'Pricing is delayed for this market. Try again shortly.',
	'queue::EQueueFull': "This market's order queue is full. Try again shortly.",
	'queue::EAccountOrderCap': 'You already have the most waiting orders this market allows.',
	'queue::EPastCutoff': 'This market no longer takes orders before its expiry.',
	'queue::EFeeNotCovered': "Your balance doesn't cover the order fee. Top up and retry.",
	'queue::EBelowMinSell': 'The sell is below the minimum size, or leaves a remainder below it.',
	'queue::ERecordNotOpen': "That position isn't open in this market anymore.",
	'queue::ENotRecordOwner': 'That position belongs to another account.',
	'queue::EMintCostCapRequired': 'Set a maximum cost for the order.',
	'queue::EWrongDesk': 'That order queue belongs to another order desk.',
	'queue::EWrongMarket': "That order queue doesn't belong to this market.",
	'queue::EMarketNotSettled': "The market hasn't settled yet.",
	'queue::EMarketNotExpired': "The market hasn't expired yet.",
	'desk::EPackageVersionDisabled':
		'This order-flow package version is retired. Update to an SDK that calls the current package.',
	'desk::EProtocolFrozen': 'The protocol is frozen.',
	// Predict's admission and quotes.
	'expiry_market::EDelayedExecutionRequired':
		'Immediate trades are retired on this market. Place a queued order instead.',
	'expiry_market::EOrderFailsLimits':
		"The market can't take this order at the current price: it misses its price limits, its price is outside the market's entry range, or its premium is below the minimum.",
	'expiry_market::EInsufficientMarketCash': "This market can't take an order this size right now.",
	'expiry_market::EMintCostCapRequired': 'Set a maximum cost for the order.',
	'expiry_market::EMintPaused': 'Minting is paused on this market.',
	'expiry_market::EInvalidOrderTiming': 'This market no longer takes orders before its expiry.',
	'expiry_market::EMarketNotSettled': "The market hasn't settled yet.",
	// Live pricing. The unavailable and stale aborts clear once the oracles write again.
	'pricing::EBlockScholesPriceUnavailable':
		'Pricing is briefly unavailable for this market. Try again in a moment.',
	'pricing::EBlockScholesSVIUnavailable':
		'Pricing is briefly unavailable for this market. Try again in a moment.',
	'pricing::EBlockScholesPriceStale': "This market's price feed is behind. Try again shortly.",
	'pricing::EBlockScholesSVIStale': "This market's price feed is behind. Try again shortly.",
	'pricing::EPythSpotUnavailable': "This market's live price is unavailable. Try again shortly.",
	'pricing::EPythSpotStale': "This market's live price is behind. Try again shortly.",
	'pricing::ELivePricingExpired': 'This market has reached its expiry.',
	// Filler (`queue::commit`, decoding the Lazer update).
	'lazer_price::EGenerationAfterEnvelope':
		'The Pyth update was generated after its own timestamp envelope.',
	'lazer_price::EFeedMissing': "The Pyth update doesn't carry this market's feed.",
	'lazer_price::EPropertyNotRequested':
		"The Pyth update doesn't carry the price property commit needs.",
	// Sessions and the shared account.
	'sessions::ESessionNotAuthorized':
		"This session key isn't authorized for the account, or its grant has expired.",
	'sessions::ESessionLimitExceeded':
		'The account holds the most session keys it can. Revoke expired ones, then grant again.',
	'sessions::EInvalidSessionDuration': 'A session must last more than 0 ms and at most 30 days.',
	'session_config::EPackageVersionDisabled':
		'This sessions package version is retired. Update to an SDK that calls the current package.',
	'account_registry::EAppNotAuthorized':
		"Trading through this app (such as Sessions) isn't enabled for accounts yet.",
	'account_registry::EAccountAlreadyExists': 'This address already has an account.',
	// Protocol gates.
	'protocol_config::ECutoverNotReached':
		"Queued orders aren't live yet: the protocol's version watermark hasn't been raised.",
	'protocol_config::EOrderFlowNotAllowed':
		"Queued orders aren't live yet: the protocol hasn't enabled the order-flow package.",
	'protocol_config::EPackageVersionDisabled':
		'This package version is retired. Update to an SDK that calls the current package.',
	'protocol_config::EProtocolFrozen': 'The protocol is frozen.',
	'protocol_config::ETradingPaused': 'Trading is paused.',
	'protocol_config::ESnapshotInProgress': 'A pool valuation is running. Try again in a moment.',
});

/**
 * Readable text for a decoded Move abort on the Predict paths, or `null` when the abort isn't
 * one this SDK describes (an unknown name, or an abort `decodeMoveAbort` couldn't name). Callers
 * fall back to `e.message` on `null`, so new contract errors degrade to the raw abort rather
 * than to a wrong message.
 */
export function describePredictError(e: PredictMoveError): string | null {
	if (!e.abortName) return null;
	return PREDICT_ERROR_TEXT[`${e.module}::${e.abortName}`] ?? null;
}
