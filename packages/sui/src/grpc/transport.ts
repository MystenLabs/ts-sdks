// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Marks an error whose message this module has already decoded. A single failed call rejects its
 * headers, response, status and trailers with the *same* error object, so without a marker a
 * message that legitimately reads `a%20b` would be rewritten once per promise.
 *
 * Only the decode is recorded here, because it is a property of the message: decoding text that
 * has already been decoded is what the marker exists to prevent, and the answer does not depend on
 * which call is asking. Nothing call-specific is stored on the error — see {@link applyAbortStatus}.
 */
const MESSAGE_DECODED = Symbol('@mysten/sui/grpc/decoded-status-message');

/**
 * `grpc-message` is percent-encoded on the wire, and the grpc-web transport reads the header
 * verbatim (https://github.com/timostamm/protobuf-ts/pull/739), so status text otherwise reaches
 * callers as `Object%20not%20found%3A%200x1`.
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
 * Remembers the code the transport produced, before {@link applyAbortStatus} derived anything from
 * it. That is a property of the error rather than of a call, so recording it keeps re-derivation
 * stable without pinning one call's outcome to a shared error object.
 */
const TRANSPORT_STATUS_CODE = Symbol('@mysten/sui/grpc/transport-status-code');

function transportStatusCode(error: RpcError): string {
	if (!(TRANSPORT_STATUS_CODE in error)) {
		Object.defineProperty(error, TRANSPORT_STATUS_CODE, { value: error.code, configurable: true });
	}

	return (error as unknown as Record<symbol, string>)[TRANSPORT_STATUS_CODE];
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
 * Derived from the signal of the call being normalized on every pass rather than recorded on the
 * error, so a transport that reuses one error instance across calls cannot have the first call
 * decide the code every later call observes. Re-deriving is stable: the same call and signal always
 * produce the same code.
 */
function applyAbortStatus(error: RpcError, abort: AbortSignal | undefined): void {
	if (!abort?.aborted) return;

	// A status the server actually answered with outranks the abort: it describes why the call
	// failed, where the abort only says the caller stopped waiting. Read from the code the transport
	// produced, not the current one, so a code this function derived for an earlier call is never
	// mistaken for one the server sent.
	const code = transportStatusCode(error);
	if (
		code !== GrpcStatusCode[GrpcStatusCode.INTERNAL] &&
		code !== GrpcStatusCode[GrpcStatusCode.CANCELLED]
	) {
		return;
	}

	const timedOut = (abort.reason as { name?: unknown } | null | undefined)?.name === 'TimeoutError';

	error.code = timedOut
		? GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]
		: GrpcStatusCode[GrpcStatusCode.CANCELLED];
}

interface NormalizeOptions {
	/**
	 * Whether the message still holds the percent-encoded wire form. True for grpc-web, which reads
	 * `grpc-message` verbatim; false for a transport that decodes for itself, where decoding again
	 * would rewrite a status that really does contain `%20`.
	 */
	decodeMessages: boolean;
	abort: AbortSignal | undefined;
}

/**
 * Makes a transport error readable and correctly coded, in place.
 *
 * Mutating rather than re-wrapping keeps `instanceof RpcError`, trailing metadata, the service and
 * method names and the original stack, and means every promise a call rejects — plus its response
 * stream — surfaces the same normalized error.
 */
function normalizeGrpcError(error: unknown, { decodeMessages, abort }: NormalizeOptions): void {
	if (!(error instanceof RpcError)) return;

	if (decodeMessages) {
		decodeStatusMessageOnce(error);
	}

	applyAbortStatus(error, abort);
}

function normalizeRejections(promises: Promise<unknown>[], options: NormalizeOptions) {
	for (const promise of promises) {
		// Registered before the call is handed back, so this runs ahead of any consumer's continuation
		// and the consumer's own `await` sees the rewritten error. Swallowing here is what the handler
		// is for: the original promise still rejects for whoever awaits it.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, options));
	}
}

export interface NormalizedTransportOptions {
	/**
	 * Decode percent-encoded status messages. Set only for transports that hand `grpc-message`
	 * through in its wire form.
	 */
	decodeMessages: boolean;
}

/**
 * Wraps a transport so that every error it produces is normalized at the wire boundary, before any
 * consumer sees it — `client.core` methods, the generated service clients, and any interceptors the
 * caller installed alike.
 */
export function withNormalizedErrors(
	transport: RpcTransport,
	{ decodeMessages }: NormalizedTransportOptions,
): RpcTransport {
	return {
		mergeOptions(options) {
			return transport.mergeOptions(options);
		},

		unary(method, input, options) {
			const call = transport.unary(method, input, options);
			const normalizeOptions = { decodeMessages, abort: options.abort };

			normalizeRejections(
				[call.headers, call.response, call.status, call.trailers],
				normalizeOptions,
			);

			return call;
		},

		serverStreaming(method, input, options) {
			const call = transport.serverStreaming(method, input, options);
			const normalizeOptions = { decodeMessages, abort: options.abort };

			// grpc-web pushes a failure into the response stream, and a finite stream is often consumed
			// through `responses` alone, without awaiting `status`. Listeners run synchronously when the
			// stream errors, so this rewrites the error before a `for await` resumes on it.
			call.responses.onError((error) => normalizeGrpcError(error, normalizeOptions));
			normalizeRejections([call.headers, call.status, call.trailers], normalizeOptions);

			return call;
		},

		clientStreaming(method, options) {
			return transport.clientStreaming(method, options);
		},

		duplex(method, options) {
			return transport.duplex(method, options);
		},
	};
}
