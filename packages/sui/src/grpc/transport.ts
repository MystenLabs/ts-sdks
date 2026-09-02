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

/**
 * A failed call rejects four promises with the same error object, so only decode it once. Registered
 * globally rather than module-local, so a transport from another installed copy of this package is
 * still recognised as having decoded.
 */
const MESSAGE_DECODED = Symbol.for('@mysten/sui/grpc/decoded-status-message');

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
 * Whether one of this package's transports has decoded the error's status text, in any installed
 * copy. False says nothing about the text itself: a transport this package did not build may hold
 * the wire form, or may have decoded it already.
 */
export function hasDecodedStatusMessage(error: object): boolean {
	return MESSAGE_DECODED in error;
}

/**
 * The status an abort should carry. The upstream transport uses `CANCELLED` only for an
 * `AbortError`, so a timeout or a reason of the caller's own arrives as `INTERNAL` and gets retried
 * as a server failure.
 *
 * The reason is caller-supplied data, read by shape rather than by `instanceof`: a second copy of
 * `@protobuf-ts/runtime-rpc`, or a signal from another realm, would fail an identity check and lose
 * the status. A reason carrying a gRPC status says what it is, and one named `TimeoutError` — which
 * is what `AbortSignal.timeout` aborts with — declares a deadline.
 */
function abortStatus(reason: unknown): string {
	const { code, name } = (reason ?? {}) as { code?: unknown; name?: unknown };

	// `in` would also accept a numeric key of the enum's reverse mapping, or anything on the object
	// prototype; a status name is the one that maps to a number.
	if (
		typeof code === 'string' &&
		typeof GrpcStatusCode[code as keyof typeof GrpcStatusCode] === 'number'
	) {
		return code;
	}

	return name === 'TimeoutError'
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
 * Records that the request, rather than the server, is what failed — and whether the abort is what
 * did it. Spec fetch rejects with the signal's reason itself; node-fetch substitutes its own
 * `AbortError`.
 */
function markLocalFailure(error: unknown, signal: AbortSignal | undefined, state: CallState): void {
	state.failedLocally = true;

	if (
		signal?.aborted &&
		(error === signal.reason || (error as { name?: unknown } | null)?.name === 'AbortError')
	) {
		state.abortCode = abortStatus(signal.reason);
	}
}

/**
 * Wraps `fetch` so a failure of the request itself is known as such, whether it happened before the
 * response arrived or while its body was being read. Read here rather than inferred from the error
 * afterwards: a status the server answered with is parsed from a body that arrived intact, so it
 * can never be taken for a cancellation, nor its text for a local diagnostic.
 *
 * Errors raised while parsing that body — a truncated frame, a message that will not decode — are
 * upstream's own, and still read as wire text, as is a failure in a body this cannot wrap.
 */
function observingFetch(
	base: typeof globalThis.fetch,
	signal: AbortSignal | undefined,
	state: CallState,
): typeof globalThis.fetch {
	return async (input, init) => {
		let response: Response;

		try {
			response = await base(input, init);
		} catch (error) {
			markLocalFailure(error, signal, state);

			throw error;
		}

		// Upstream reads a `node-fetch` body through `Symbol.asyncIterator` rather than `getReader`.
		// Those are passed through untouched: a body failure there reads as it did before.
		if (typeof response.body?.getReader !== 'function') return response;

		const source = response.body;
		let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
		const body = new ReadableStream<Uint8Array>(
			{
				async pull(controller) {
					try {
						// Acquired on the first read, since taking a reader starts the source.
						reader ??= source.getReader();

						const { done, value } = await reader.read();

						if (done) controller.close();
						else controller.enqueue(value);
					} catch (error) {
						markLocalFailure(error, signal, state);
						controller.error(error);
					}
				},
				cancel(reason) {
					return reader ? reader.cancel(reason) : source.cancel(reason);
				},
			},
			// Nothing is read until the transport asks for it, so a body that fails on its own cannot
			// mark the call local while upstream is answering from a header status.
			{ highWaterMark: 0 },
		);

		// Handed back as a plain object rather than a `Response`: constructing one from a stream starts
		// draining it immediately, which would read a body the transport may never ask for and buffer
		// a subscription's stream without bound. Upstream reads only these four properties.
		return {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
			body,
		} as unknown as Response;
	};
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
