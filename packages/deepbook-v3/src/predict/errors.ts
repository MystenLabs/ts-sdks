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
