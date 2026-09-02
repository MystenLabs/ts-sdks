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

interface CallAbort {
	/** What the call runs against: the caller's signal, the deadline below, or both composed. */
	signal: AbortSignal | undefined;
	/** The deadline imposed for `options.timeout`, if there was one. */
	deadline: AbortSignal | undefined;
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
function isDeadlineAbort({ signal, deadline }: CallAbort): boolean {
	if (deadline?.aborted && signal?.reason === deadline.reason) return true;

	return signal?.reason instanceof DOMException && signal.reason.name === 'TimeoutError';
}

/**
 * Codes an aborted call. The upstream transport uses `CANCELLED` only for an `AbortError`, so a
 * timeout or a custom abort reason arrives as `INTERNAL` and gets retried as a server failure.
 */
function applyAbortStatus(error: RpcError, abort: CallAbort): void {
	if (!abort.signal?.aborted || !isAbortFailure(error, abort.signal)) return;

	// Any other code came from the server, or from an abort reason the caller coded themselves.
	if (
		error.code !== GrpcStatusCode[GrpcStatusCode.INTERNAL] &&
		error.code !== GrpcStatusCode[GrpcStatusCode.CANCELLED]
	) {
		return;
	}

	error.code = isDeadlineAbort(abort)
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
}

/**
 * Rewrites the error in place, which keeps `instanceof RpcError`, the trailers and the stack, and
 * gives the same result on every promise the call rejects.
 */
function normalizeGrpcError(error: unknown, abort: CallAbort): void {
	if (!(error instanceof RpcError)) return;

	// Coded first, because decoding rewrites the message `isAbortFailure` compares.
	applyAbortStatus(error, abort);
	decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], abort: CallAbort) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await. The
		// original promise still rejects; this only changes the error it rejects with.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, abort));
	}
}

/**
 * Enforces `options.timeout` locally. The upstream transport only sends the `grpc-timeout` header,
 * which does not help when the connection stalls.
 *
 * The options are copied rather than written to. `mergeRpcOptions` returns the transport's
 * `defaultOptions` by reference for a call that passes no options of its own, so assigning `abort`
 * would apply one call's deadline to every later call.
 */
function withDeadline(options: RpcOptions): { options: RpcOptions; abort: CallAbort } {
	const unbounded = { options, abort: { signal: options.abort, deadline: undefined } };
	if (options.timeout == null) return unbounded;

	const durationMs =
		typeof options.timeout === 'number' ? options.timeout : options.timeout.getTime() - Date.now();

	// The upstream transport rejects an expired deadline itself, before sending anything.
	if (durationMs <= 0) return unbounded;

	const deadline = AbortSignal.timeout(durationMs);
	const signal = options.abort ? AbortSignal.any([options.abort, deadline]) : deadline;

	return { options: { ...options, abort: signal }, abort: { signal, deadline } };
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
		const { options: callOptions, abort } = withDeadline(options);
		const call = super.unary(method, input, callOptions);

		normalizeRejections([call.headers, call.response, call.status, call.trailers], abort);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		// No deadline is imposed, so a subscription without a `timeout` stays unbounded.
		const { options: callOptions, abort } = withDeadline(options);
		const call = super.serverStreaming(method, input, callOptions);

		// A finite stream is often read through `responses` without awaiting `status`. Listeners run
		// synchronously on error, so this lands before a `for await` resumes.
		call.responses.onError((error) => normalizeGrpcError(error, abort));
		normalizeRejections([call.headers, call.status, call.trailers], abort);

		return call;
	}
}
