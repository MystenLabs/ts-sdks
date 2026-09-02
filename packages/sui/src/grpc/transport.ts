// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcStatusCode, GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type {
	MethodInfo,
	RpcOptions,
	ServerStreamingCall,
	UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Marks an error whose message has already been decoded. One failed call rejects its headers,
 * response, status and trailers with the *same* error object, so without a marker a message that
 * legitimately reads `a%20b` would be rewritten once per promise.
 *
 * This records a property of the message, not of the call: whether text has already been decoded
 * does not depend on who is asking. Nothing call-specific is stored on the error — {@link
 * applyAbortStatus} re-derives its answer every time.
 */
const MESSAGE_DECODED = Symbol('@mysten/sui/grpc/decoded-status-message');

/**
 * `grpc-message` is percent-encoded on the wire, and `GrpcWebFetchTransport` reads the header
 * verbatim (https://github.com/timostamm/protobuf-ts/pull/739, and the same complaint in
 * https://github.com/timostamm/protobuf-ts/issues/631), so status text otherwise reaches callers as
 * `Object%20not%20found%3A%200x1` — or, for a non-ASCII message, as raw UTF-8 escapes.
 *
 * A node is a correct percent-encoder — it escapes a literal `%` as `%25` — so decoding exactly
 * once is right: `gas budget 100%25 consumed` is readable text, and `read_mask path: a%2520b`
 * really does end in `a%20b`. A message that fails to decode was not written by a percent-encoder,
 * so it is kept verbatim rather than failing a call over its status text.
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
 * Codes a call that ended because its own signal aborted.
 *
 * The transport codes an aborted call `CANCELLED` only when the abort reason is an `AbortError`.
 * `AbortSignal.timeout` aborts with a `TimeoutError`, and `AbortController.abort(reason)` takes an
 * arbitrary reason, so both fall through to `INTERNAL` — indistinguishable from a server-side
 * failure, and retried as one. A deadline the caller set is a deadline exceeded; every other abort
 * is a cancellation.
 *
 * Idempotent without recording anything: re-running against the same signal reaches the same
 * answer, and a code outside the two the transport uses for an abort is left alone.
 */
function applyAbortStatus(error: RpcError, abort: AbortSignal | undefined): void {
	if (!abort?.aborted) return;

	// A status the server actually answered with outranks the abort: it describes why the call
	// failed, where the abort only says the caller stopped waiting.
	if (
		error.code !== GrpcStatusCode[GrpcStatusCode.INTERNAL] &&
		error.code !== GrpcStatusCode[GrpcStatusCode.CANCELLED]
	) {
		return;
	}

	const timedOut = (abort.reason as { name?: unknown } | null | undefined)?.name === 'TimeoutError';

	error.code = timedOut
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
}

/**
 * Makes a transport error readable and correctly coded, in place.
 *
 * Mutating rather than re-wrapping keeps `instanceof RpcError`, trailing metadata, the service and
 * method names and the original stack, and means every promise a call rejects — plus its response
 * stream — surfaces the same normalized error.
 */
function normalizeGrpcError(error: unknown, abort: AbortSignal | undefined): void {
	if (!(error instanceof RpcError)) return;

	decodeStatusMessageOnce(error);
	applyAbortStatus(error, abort);
}

function normalizeRejections(promises: Promise<unknown>[], abort: AbortSignal | undefined) {
	for (const promise of promises) {
		// Registered before the call is handed back, so this runs ahead of any consumer's continuation
		// and the consumer's own `await` sees the rewritten error. Swallowing here is what the handler
		// is for: the original promise still rejects for whoever awaits it.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, abort));
	}
}

/**
 * `GrpcWebFetchTransport` with the two error defects it has as of `@protobuf-ts/grpcweb-transport`
 * 2.11.1 repaired: status text arrives decoded, and a call cut short by its own signal is coded
 * `DEADLINE_EXCEEDED` or `CANCELLED` rather than `INTERNAL`.
 *
 * Both belong to the transport — it is the layer that reads the wire — so this is where
 * `SuiGrpcClient` applies them, and every consumer of a call is served by one pass: `client.core`,
 * the generated service clients, a response stream and any interceptor the caller installed.
 *
 * `SuiGrpcClient` builds one of these by default. Construct it directly when you need transport
 * options the client does not take, or pass it as `transport`. A plain `GrpcWebFetchTransport`
 * imported from `@protobuf-ts/grpcweb-transport` still behaves the way that package behaves; the
 * client does not reach into a transport it was handed.
 */
export class SuiGrpcWebTransport extends GrpcWebFetchTransport {
	override unary<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): UnaryCall<I, O> {
		const call = super.unary(method, input, options);

		normalizeRejections([call.headers, call.response, call.status, call.trailers], options.abort);

		return call;
	}

	override serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCall<I, O> {
		const call = super.serverStreaming(method, input, options);

		// grpc-web pushes a failure into the response stream, and a finite stream is often consumed
		// through `responses` alone, without awaiting `status`. Listeners run synchronously when the
		// stream errors, so this rewrites the error before a `for await` resumes on it.
		call.responses.onError((error) => normalizeGrpcError(error, options.abort));
		normalizeRejections([call.headers, call.status, call.trailers], options.abort);

		return call;
	}
}
