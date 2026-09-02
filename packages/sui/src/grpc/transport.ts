// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Marks an error this module has already normalized. A single failed call rejects its headers,
 * response, status and trailers with the *same* error object, so without a marker a message that
 * legitimately reads `a%20b` would be rewritten once per promise.
 */
const NORMALIZED = Symbol('@mysten/sui/grpc/normalized-error');

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

/**
 * Makes a transport error readable and correctly coded, in place, at most once.
 *
 * Mutating rather than re-wrapping keeps `instanceof RpcError`, the status code, trailing metadata,
 * the service and method names and the original stack, and means every promise a call rejects —
 * plus its response stream — surfaces the same normalized error.
 */
function normalizeGrpcError(error: unknown, abort?: AbortSignal): void {
	if (!(error instanceof RpcError) || NORMALIZED in error) return;
	Object.defineProperty(error, NORMALIZED, { value: true, configurable: true });

	error.message = decodeGrpcStatusMessage(error.message);

	// The transport codes an aborted call `CANCELLED` only for an `AbortError`. `AbortSignal.timeout`
	// aborts with a `TimeoutError`, which falls through to `INTERNAL` — indistinguishable from a
	// server-side failure, and retried as one. A deadline the caller set is a deadline exceeded.
	if (
		abort?.aborted &&
		(abort.reason as { name?: unknown } | null | undefined)?.name === 'TimeoutError' &&
		(error.code === GrpcStatusCode[GrpcStatusCode.INTERNAL] ||
			error.code === GrpcStatusCode[GrpcStatusCode.CANCELLED])
	) {
		error.code = GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED];
	}
}

function normalizeRejections(abort: AbortSignal | undefined, promises: Promise<unknown>[]) {
	for (const promise of promises) {
		// Registered before the call is handed back, so this runs ahead of any consumer's continuation
		// and the consumer's own `await` sees the rewritten error. Swallowing here is what the handler
		// is for: the original promise still rejects for whoever awaits it.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, abort));
	}
}

/**
 * Wraps a transport so that every error it produces is normalized once, at the wire boundary,
 * before any consumer sees it — `client.core` methods, the generated service clients, and any
 * interceptors the caller installed alike.
 */
export function withNormalizedErrors(transport: RpcTransport): RpcTransport {
	return {
		mergeOptions(options) {
			return transport.mergeOptions(options);
		},

		unary(method, input, options) {
			const call = transport.unary(method, input, options);

			normalizeRejections(options.abort, [call.headers, call.response, call.status, call.trailers]);

			return call;
		},

		serverStreaming(method, input, options) {
			const call = transport.serverStreaming(method, input, options);

			// grpc-web pushes a failure into the response stream, and a finite stream is often consumed
			// through `responses` alone, without awaiting `status`. Listeners run synchronously when the
			// stream errors, so this rewrites the error before a `for await` resumes on it.
			call.responses.onError((error) => normalizeGrpcError(error, options.abort));
			normalizeRejections(options.abort, [call.headers, call.status, call.trailers]);

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
