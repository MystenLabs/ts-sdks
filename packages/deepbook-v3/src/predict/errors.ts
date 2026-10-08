// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Typed errors for the Predict SDK.
//
// Two failure kinds cross the SDK boundary:
//   - PredictInputError — a caller gave us something we rejected before touching
//     the chain (unknown underlying, malformed argument, …).
//   - PredictMoveError — a Move `abort` surfaced by a read/simulate. The deployed
//     Predict packages are compiled with CLEVER ERRORS, so the fullnode decodes the
//     `E…` error-constant name out of the abort code's high bits and returns it on
//     the structured execution error. We read that name straight from chain instead
//     of maintaining a module→code→name table that goes stale on every redeploy.

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
	/** The `E…` constant name, decoded from the clever-error abort code by the
	 * fullnode, or null when the transport surfaced no name (a non-clever abort,
	 * or a JSON-RPC failure that carries only a line number). */
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
//     (`grpc/core.ts` parseMoveAbort) and GraphQL transports. This is the on-chain
//     name that replaces the old hand-maintained ABORT_TABLES. JSON-RPC surfaces only
//     a line number, so `constantName` (and thus `abortName`) is absent there.
export interface MoveAbortError {
	MoveAbort?: {
		abortCode?: string | number | bigint;
		location?: { module?: string };
		cleverError?: { constantName?: string };
	};
}

/**
 * Decode a `@mysten/sui` MoveAbort execution error into a {@link PredictMoveError}.
 * Returns null when `error` carries no MoveAbort (InsufficientGas, a size error, any
 * non-abort failure), so callers can fall back to a plain Error.
 *
 * `abortName` is taken straight from the chain-decoded clever-error constant; it is
 * null when the abort predates clever errors or the transport didn't surface a name.
 * `code` stays a bigint — a clever-error abort code packs the module, line, and
 * constant index into the high bits of the u64 and would lose precision as a Number.
 */
export function decodeMoveAbort(error: MoveAbortError | null | undefined): PredictMoveError | null {
	const abort = error?.MoveAbort;
	if (!abort) return null;
	const module = abort.location?.module ?? '';
	const code = abort.abortCode != null ? BigInt(abort.abortCode) : 0n;
	const abortName = abort.cleverError?.constantName ?? null;
	return new PredictMoveError(module, code, abortName);
}

// === Delayed execution (DBU-885) ===

/**
 * Why a queued-order builder refused to add an enqueue. The builder reads the market first and
 * throws this instead of building a transaction the chain would abort, so a refused order never
 * fails the rest of a transaction. Each code mirrors one on-chain refusal.
 */
export type PredictPreflightCode =
	/** Delayed execution isn't live: the watermark isn't raised, or the policy isn't set. */
	| 'not-live'
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
	/** The account balance doesn't cover the order fee (`EFeeNotCovered`). Prompt a top-up. */
	| 'fee'
	/** A mint's cash need is above the market's spare cash (`EInsufficientMarketCash`). */
	| 'market-cash'
	/** The escrowed budget can't buy the minimum premium, so the order fails its limits. */
	| 'min-premium'
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
// paths, keyed by `module::EName` as the fullnode decodes it from the clever-error code. Only the
// names matter, so a republish that renumbers codes doesn't stale this table.
const PREDICT_ERROR_TEXT: Readonly<Record<string, string>> = Object.freeze({
	// Placement (`enqueue_*`).
	'expiry_market::EDelayedExecutionRequired':
		'Immediate trades are retired on this market. Place a queued order instead.',
	'expiry_market::EQueueStuck': 'Pricing is delayed for this market. Try again shortly.',
	'expiry_market::EQueueFull': "This market's order queue is full. Try again shortly.",
	'expiry_market::EAccountOrderCap': 'You already have the most waiting orders this market allows.',
	'expiry_market::EPastCutoff': 'This market no longer takes orders before its expiry.',
	'expiry_market::EFeeNotCovered': "Your balance doesn't cover the order fee. Top up and retry.",
	'expiry_market::EOrderFailsLimits':
		'The order already misses its own limits at the current price.',
	'expiry_market::EInsufficientMarketCash': "This market can't take an order this size right now.",
	'expiry_market::EBelowMinSell':
		'The sell is below the minimum size, or leaves a remainder below it.',
	'expiry_market::ERecordNotOpen': "That position isn't open in this market anymore.",
	'expiry_market::ENotRecordOwner': 'That position belongs to another account.',
	'expiry_market::EMintCostCapRequired': 'Set a maximum cost for the order.',
	'expiry_market::EMintPaused': 'Minting is paused on this market.',
	'expiry_market::EMarketNotSettled': "The market hasn't settled yet.",
	// Filler (`commit`).
	'expiry_market::EGenerationAfterEnvelope':
		'The Pyth update was generated after its own timestamp envelope.',
	'expiry_market::EPythFeedMissing': "The Pyth update doesn't carry this market's feed.",
	'expiry_market::EPythPropertyNotRequested':
		"The Pyth update doesn't carry the price property commit needs.",
	'expiry_market::EUpdateDoesNotMatchQueue':
		"The Pyth update's channel or feed doesn't match the waiting cohort.",
	// Protocol gates.
	'protocol_config::ECutoverNotReached':
		"Queued orders aren't live yet: the protocol's version watermark hasn't been raised.",
	'protocol_config::EPolicyNotInitialized':
		"Delayed execution isn't configured on this deployment yet.",
	'protocol_config::EPackageVersionDisabled':
		'This package version is retired. Update to an SDK that calls the current package.',
	'protocol_config::EProtocolFrozen': 'The protocol is frozen.',
	'protocol_config::ETradingPaused': 'Trading is paused.',
	'protocol_config::ESnapshotInProgress': 'A pool valuation is running. Try again in a moment.',
	// Quotes. Enqueue no longer needs a fresh on-chain Pyth spot, so these mean "no preview".
	'pricing::EPythSpotUnavailable': 'Price preview unavailable right now. Orders still work.',
	'pricing::EPythSpotStale': 'Price preview unavailable right now. Orders still work.',
});

/**
 * Readable text for a decoded Move abort on the Predict paths, or `null` when the abort isn't
 * one this SDK describes (an unknown name, or a transport that surfaced no name). Callers
 * fall back to `e.message` on `null`, so new contract errors degrade to the raw abort rather
 * than to a wrong message.
 */
export function describePredictError(e: PredictMoveError): string | null {
	if (!e.abortName) return null;
	return PREDICT_ERROR_TEXT[`${e.module}::${e.abortName}`] ?? null;
}

/**
 * Whether a quote failed only because the on-chain Pyth spot is missing or stale. The live
 * quotes refuse the Block Scholes fallback, but enqueue doesn't need a fresh on-chain spot, so
 * show "no preview" and keep the order button enabled.
 */
export function isPreviewUnavailable(e: unknown): boolean {
	return (
		e instanceof PredictMoveError &&
		e.module === 'pricing' &&
		(e.abortName === 'EPythSpotUnavailable' || e.abortName === 'EPythSpotStale')
	);
}
