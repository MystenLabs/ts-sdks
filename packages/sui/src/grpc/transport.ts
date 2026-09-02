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

/**
 * Rewrites the error in place, which keeps `instanceof RpcError`, the trailers and the stack, and
 * gives the same result on every promise the call rejects.
 *
 * An aborted call takes its status from the reason, and its message is left alone: what it holds is
 * the reason's own text, not `grpc-message`. A failure that merely raced the abort is relabelled
 * with it, which is the price of reading the signal rather than tracking where the failure came
 * from; the alternative is wrapping every request and response body to watch them.
 */
function normalizeGrpcError(error: unknown, signal: AbortSignal | undefined): void {
	if (!(error instanceof RpcError)) return;

	if (
		signal?.aborted &&
		(error.code === GrpcStatusCode[GrpcStatusCode.INTERNAL] ||
			error.code === GrpcStatusCode[GrpcStatusCode.CANCELLED])
	) {
		error.code = abortStatus(signal.reason);

		return;
	}

	decodeStatusMessageOnce(error);
}

function normalizeRejections(promises: Promise<unknown>[], signal: AbortSignal | undefined) {
	for (const promise of promises) {
		// Registered before the call is returned, so it runs before the consumer's own await. The
		// original promise still rejects; this only changes the error it rejects with.
		promise.then(undefined, (error: unknown) => normalizeGrpcError(error, signal));
	}
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

		// A finite stream is often read through `responses` without awaiting `status`. Listeners run
		// synchronously on error, so this lands before a `for await` resumes.
		call.responses.onError((error) => normalizeGrpcError(error, options.abort));
		normalizeRejections([call.headers, call.status, call.trailers], options.abort);

		return call;
	}
}
