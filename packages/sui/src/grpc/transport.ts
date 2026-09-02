// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport as UpstreamGrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type {
	MethodInfo,
	RpcOptions,
	ServerStreamingCall,
	UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';

/** What `setTimeout` takes before it overflows and fires on the next tick instead. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

/** A failed call rejects four promises with the same error object, so only decode it once. */
const MESSAGE_DECODED = Symbol('@mysten/sui/grpc/decoded-status-message');

/**
 * Decodes `grpc-message`, which is percent-encoded on the wire and which the upstream transport
 * does not decode (https://github.com/timostamm/protobuf-ts/pull/739). The server escapes a literal
 * `%` as `%25`, so one decode is correct. Text that fails to decode is returned unchanged.
 */
function decodeGrpcStatusMessage(message: string): string {
	if (!message.includes('%')) return message;

	try {
		return decodeURIComponent(message);
	} catch {
		return message;
	}
}

function decodeStatusMessageOnce(error: RpcError): void {
	if (MESSAGE_DECODED in error) return;
	Object.defineProperty(error, MESSAGE_DECODED, { value: true, configurable: true });

	error.message = decodeGrpcStatusMessage(error.message);
}

/**
 * Whether this package's transport has decoded the error's status text. False says nothing about
 * the text itself: a transport this package did not build may hold the wire form, or may have
 * decoded it already.
 */
export function hasDecodedStatusMessage(error: RpcError): boolean {
	return MESSAGE_DECODED in error;
}

interface CallState {
	/** What the call runs against: the caller's signal, the deadline below, or both composed. */
	signal: AbortSignal | undefined;
	/** The deadline imposed for `options.timeout`, if there was one. */
	deadline: AbortSignal | undefined;
	/**
	 * Set when the fetch rejected, so the failure was built from a local error rather than read off
	 * the wire and holds no percent-encoded text.
	 */
	fetchFailed: boolean;
}

/** Reports a fetch that never delivered a response. The request itself is untouched. */
function observingFetch(base: typeof globalThis.fetch, state: CallState): typeof globalThis.fetch {
	return (input, init) =>
		base(input, init).catch((error: unknown) => {
			state.fetchFailed = true;

			throw error;
		});
}

/**
 * A `grpc-timeout` value the server will accept. The header takes at most eight digits, and the
 * upstream transport always writes milliseconds, so anything above about 27 hours goes out
 * malformed. Rounded up, so the deadline sent is never shorter than the one asked for.
 */
function grpcTimeoutHeader(durationMs: number): string | undefined {
	for (const [scale, unit] of [
		[1, 'm'],
		[1000, 'S'],
		[60_000, 'M'],
		[3_600_000, 'H'],
	] as const) {
		const value = Math.ceil(durationMs / scale);
		if (value <= 99_999_999) return `${value}${unit}`;
	}

	return undefined;
}

/**
 * Whether the abort is what failed the call. `signal.aborted` is not enough, because headers
 * resolve before a later server failure propagates, so a call can be aborted while failing for an
 * unrelated reason.
 *
 * An error built from an abort carries no metadata, so anything holding response metadata is a
 * status the server answered with. Past that, the transport turns an abort into either `CANCELLED`,
 * for a reason named `AbortError`, or an `INTERNAL` carrying the reason's own text; some fetch
 * implementations (node-fetch) substitute a generic `AbortError` for the reason, which is why the
 * code is checked as well as the text.
 */
function isAbortFailure(error: RpcError, signal: AbortSignal): boolean {
	// The reason itself, which the transport passes through when it is already an `RpcError`.
	if ((error as unknown) === signal.reason) return true;

	if (Object.keys(error.meta).length > 0) return false;
	if (error.code === GrpcStatusCode[GrpcStatusCode.CANCELLED]) return true;

	const reason = signal.reason;

	return error.message === (reason instanceof Error ? reason.message : `${reason}`);
}

/**
 * Whether the abort was a deadline. A deadline this transport imposed is matched by identity, since
 * `AbortSignal.any` forwards the reason of the signal that fired. Otherwise the caller's reason
 * decides: a `DOMException` named `TimeoutError`, which is what `AbortSignal.timeout` aborts with,
 * counts as a deadline they declared.
 */
function isDeadlineAbort({ signal, deadline }: CallState): boolean {
	if (deadline?.aborted && signal?.reason === deadline.reason) return true;

	return signal?.reason instanceof DOMException && signal.reason.name === 'TimeoutError';
}

/**
 * Codes an aborted call. The upstream transport uses `CANCELLED` only for an `AbortError`, so a
 * timeout or a custom abort reason arrives as `INTERNAL` and gets retried as a server failure.
 */
function applyAbortStatus(error: RpcError, abort: CallState): boolean {
	if (!abort.signal?.aborted || !isAbortFailure(error, abort.signal)) return false;

	// The caller has already said what the status is. Copied rather than left alone, because a fetch
	// that substitutes its own `AbortError` for the reason (node-fetch) never propagates theirs.
	if (abort.signal.reason instanceof RpcError) {
		error.code = abort.signal.reason.code;

		return true;
	}

	// Any other code came from the server.
	if (
		error.code !== GrpcStatusCode[GrpcStatusCode.INTERNAL] &&
		error.code !== GrpcStatusCode[GrpcStatusCode.CANCELLED]
	) {
		return false;
	}

	error.code = isDeadlineAbort(abort)
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];

	return true;
}

/**
 * Rewrites the error in place, which keeps `instanceof RpcError`, the trailers and the stack, and
 * gives the same result on every promise the call rejects.
 */
function normalizeGrpcError(error: unknown, state: CallState): void {
	if (!(error instanceof RpcError)) return;

	// An error the abort produced carries the reason's own text, not `grpc-message`, so it is coded
	// and left as it reads. Coding runs first either way, since decoding would rewrite the message
	// `isAbortFailure` compares.
	if (applyAbortStatus(error, state)) return;

	// A fetch that never delivered a response failed with a local message, such as `request to
	// http://host/a%2Fb failed`, which is not wire text to decode.
	if (state.fetchFailed) return;

	decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], state: CallState) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await. The
		// original promise still rejects; this only changes the error it rejects with.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, state));
	}
}

/**
 * Builds the options one call runs with: a deadline for `options.timeout`, a `grpc-timeout` header
 * the server will accept, and a `fetch` that reports a request which never delivered a response.
 *
 * The upstream transport only sends the header, which does not help when the connection stalls, and
 * always writes it in milliseconds, which is malformed above eight digits.
 *
 * The options are copied rather than written to. `mergeRpcOptions` returns the transport's
 * `defaultOptions` by reference for a call that passes no options of its own, so assigning to them
 * would leak one call's deadline and fetch into every later call.
 */
function prepareCall(options: RpcOptions): { options: RpcOptions; state: CallState } {
	const { fetch: callerFetch, meta } = options as RpcOptions & { fetch?: typeof globalThis.fetch };
	const durationMs = timeoutDurationMs(options);

	// Past the timer ceiling `setTimeout` fires on the next tick, which would end the call at once,
	// so those deadlines are left to the server. The upstream transport rejects an expired one
	// itself, before sending anything.
	const deadline =
		durationMs !== undefined && durationMs > 0 && durationMs <= MAX_TIMER_DELAY_MS
			? AbortSignal.timeout(durationMs)
			: undefined;
	const signal =
		deadline && options.abort
			? AbortSignal.any([options.abort, deadline])
			: (deadline ?? options.abort);
	const state: CallState = { signal, deadline, fetchFailed: false };

	// Written here only when the transport would write it malformed, so the common path is untouched.
	const header =
		durationMs !== undefined && durationMs > 99_999_999 ? grpcTimeoutHeader(durationMs) : undefined;

	return {
		options: {
			...options,
			abort: signal,
			fetch: observingFetch(callerFetch ?? globalThis.fetch, state),
			...(header && { timeout: undefined, meta: { ...meta, 'grpc-timeout': header } }),
		} as RpcOptions,
		state,
	};
}

function timeoutDurationMs(options: RpcOptions): number | undefined {
	if (options.timeout == null) return undefined;

	return typeof options.timeout === 'number'
		? options.timeout
		: options.timeout.getTime() - Date.now();
}

/**
 * `GrpcWebFetchTransport` from `@protobuf-ts/grpcweb-transport`, subclassed to fix three defects it
 * has as of 2.11.1: status messages are left percent-encoded, a timeout or a custom abort reason is
 * coded `INTERNAL`, and `timeout` is only advertised to the server. Fixing them here covers every
 * consumer of a call.
 *
 * `SuiGrpcClient` builds one by default. Construct it directly to share a transport between clients
 * or to subclass it further, then pass it as `transport`. A transport imported from
 * `@protobuf-ts/grpcweb-transport` keeps that package's behaviour.
 */
export class GrpcWebFetchTransport extends UpstreamGrpcWebFetchTransport {
	override unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): UnaryCall<I, O> {
		const { options: callOptions, state } = prepareCall(options);
		const call = super.unary(method, input, callOptions);

		normalizeRejections([call.headers, call.response, call.status, call.trailers], state);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		// No deadline is imposed, so a subscription without a `timeout` stays unbounded.
		const { options: callOptions, state } = prepareCall(options);
		const call = super.serverStreaming(method, input, callOptions);

		// A finite stream is often read through `responses` without awaiting `status`. Listeners run
		// synchronously on error, so this lands before a `for await` resumes.
		call.responses.onError((error) => normalizeGrpcError(error, state));
		normalizeRejections([call.headers, call.status, call.trailers], state);

		return call;
	}
}
