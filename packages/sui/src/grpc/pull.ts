// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	MethodInfo,
	RpcMetadata,
	RpcOptions,
	RpcStatus,
	RpcTransport,
} from '@protobuf-ts/runtime-rpc';

/**
 * A server-streaming call whose response messages are read from the network only as `responses`
 * is pulled.
 *
 * `responses` has a single consumer. `return()` (a `break` out of `for await`) cancels the call,
 * including a read that is in progress. `status` and `trailers` settle once the consumer reaches
 * the end of the stream, or when the call fails or is cancelled; a call that is never iterated
 * settles only `headers`.
 */
export interface ServerStreamingIterableCall<I extends object = object, O extends object = object> {
	readonly method: MethodInfo<I, O>;
	readonly requestHeaders: Readonly<RpcMetadata>;
	readonly request: Readonly<I>;
	readonly responses: AsyncIterableIterator<O>;
	/** Settles once response headers arrive, or rejects with the call's error. */
	readonly headers: Promise<RpcMetadata>;
	readonly status: Promise<RpcStatus>;
	readonly trailers: Promise<RpcMetadata>;
}

/**
 * An `RpcTransport` that can also run a server-streaming call on demand. `SuiGrpcClient` ledger
 * streams use this method when the transport has it and no interceptors are configured, since
 * interceptors receive push-based `ServerStreamingCall`s; otherwise they read `serverStreaming`
 * into a bounded buffer.
 *
 * `options` are already merged with `mergeOptions`. Errors should be `RpcError`s coded as
 * `normalizeGrpcError` codes them, so retries treat every transport the same way.
 */
export interface PullServerStreamingTransport extends RpcTransport {
	serverStreamingIterable<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingIterableCall<I, O>;
}

// Registered globally so another installed copy of this package sees the same marker.
const NON_RETRYABLE = Symbol.for('@mysten/sui/grpc/non-retryable');

/**
 * Marks `error` so ledger streams surface it instead of retrying, whatever its status code. Used for
 * failures that recur on every attempt, such as a response message over the size limit.
 */
export function markNonRetryable<E extends object>(error: E): E {
	Object.defineProperty(error, NON_RETRYABLE, { value: true, configurable: true });
	return error;
}

/** Whether `error` was marked with `markNonRetryable`. */
export function isNonRetryable(error: unknown): boolean {
	return typeof error === 'object' && error !== null && NON_RETRYABLE in error;
}

/** Whether `transport` implements `serverStreamingIterable`. */
export function supportsServerStreamingIterable(
	transport: RpcTransport,
): transport is PullServerStreamingTransport {
	return (
		typeof (transport as Partial<PullServerStreamingTransport>).serverStreamingIterable ===
		'function'
	);
}
