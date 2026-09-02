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

/**
 * The status an abort should carry. The upstream transport uses `CANCELLED` only for an
 * `AbortError`, so a timeout or a reason of the caller's own arrives as `INTERNAL` and gets retried
 * as a server failure. A reason that is already an `RpcError` says what it is, and a `DOMException`
 * named `TimeoutError` is what `AbortSignal.timeout` aborts with.
 */
function abortStatus(reason: unknown): string {
	if (reason instanceof RpcError) return reason.code;

	return reason instanceof DOMException && reason.name === 'TimeoutError'
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
}

/** What one call learned from its own request, rather than guessed at from the error afterwards. */
interface CallState {
	/** Set when no response arrived, so the failure holds local text rather than `grpc-message`. */
	failedLocally: boolean;
	/** The status to give a call the abort ended. */
	abortCode: string | undefined;
}

/**
 * Wraps `fetch` so a request that never returned a response is known as such, and so is an abort
 * that ended it. Read here rather than inferred from the error afterwards: a status the server
 * answered with arrives as a resolved response, so it can never be taken for a cancellation.
 *
 * A failure after the response arrives, such as an abort while a stream is being read, is not
 * covered, and keeps whatever status the upstream transport gives it.
 */
function observingFetch(
	base: typeof globalThis.fetch,
	signal: AbortSignal | undefined,
	state: CallState,
): typeof globalThis.fetch {
	return (input, init) =>
		base(input, init).catch((error: unknown) => {
			state.failedLocally = true;
			// Spec fetch rejects with the reason itself; node-fetch substitutes its own `AbortError`.
			if (
				signal?.aborted &&
				(error === signal.reason || (error instanceof Error && error.name === 'AbortError'))
			) {
				state.abortCode = abortStatus(signal.reason);
			}

			throw error;
		});
}

/**
 * Rewrites the error in place, which keeps `instanceof RpcError`, the trailers and the stack, and
 * gives the same result on every promise the call rejects.
 */
function normalizeGrpcError(error: unknown, state: CallState): void {
	if (!(error instanceof RpcError)) return;

	if (state.abortCode) error.code = state.abortCode;

	// Local text — an abort reason, or something like `request to http://host/a%2Fb failed` — is not
	// `grpc-message`, and holds nothing to decode.
	if (!state.failedLocally) decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], state: CallState) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await. The
		// original promise still rejects; this only changes the error it rejects with.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, state));
	}
}

/**
 * The options one call runs with, copied rather than written to: `mergeRpcOptions` returns the
 * transport's `defaultOptions` by reference for a call that passes none of its own, so assigning to
 * them would leak one call's `fetch` into every later call.
 */
function prepareCall(options: RpcOptions): { options: RpcOptions; state: CallState } {
	const { fetch: callerFetch } = options as RpcOptions & { fetch?: typeof globalThis.fetch };
	const state: CallState = { failedLocally: false, abortCode: undefined };
	const fetch = observingFetch(callerFetch ?? globalThis.fetch, options.abort, state);

	return { options: { ...options, fetch } as RpcOptions, state };
}

/**
 * `GrpcWebFetchTransport` from `@protobuf-ts/grpcweb-transport`, subclassed to fix two defects it
 * has as of 2.11.1: status messages are left percent-encoded, and a call ended by a timeout or a
 * custom abort reason is coded `INTERNAL`. Fixing them here covers every consumer of a call.
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
		const { options: callOptions, state } = prepareCall(options);
		const call = super.serverStreaming(method, input, callOptions);

		// A finite stream is often read through `responses` without awaiting `status`. Listeners run
		// synchronously on error, so this lands before a `for await` resumes.
		call.responses.onError((error) => normalizeGrpcError(error, state));
		normalizeRejections([call.headers, call.status, call.trailers], state);

		return call;
	}
}
