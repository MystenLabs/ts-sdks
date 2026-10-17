// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Internal: none of this is exported from `@mysten/sui/grpc`.

import type {
	MethodInfo,
	RpcMetadata,
	RpcOptions,
	RpcStatus,
	RpcTransport,
} from '@protobuf-ts/runtime-rpc';

/**
 * A server-streaming call whose messages are read from the network only as `responses` is pulled.
 * `responses` has a single consumer, and `return()` cancels the call. `status` and `trailers`
 * settle only once the stream ends, fails or is cancelled.
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

/** Starts an on-demand server-streaming call. Interceptors are not applied. */
export type PullServerStreaming = <I extends object, O extends object>(
	method: MethodInfo<I, O>,
	input: I,
	options?: RpcOptions,
) => ServerStreamingIterableCall<I, O>;

/** The key of the on-demand server-streaming method on transports that have one. */
export const PULL_SERVER_STREAMING = Symbol('PullServerStreaming');

export interface PullServerStreamingTransport extends RpcTransport {
	[PULL_SERVER_STREAMING]: PullServerStreaming;
}

/**
 * The transport's on-demand server-streaming method, or `undefined` when it has none or has
 * interceptors, which only run through `serverStreaming`.
 */
export function pullServerStreaming(transport: RpcTransport): PullServerStreaming | undefined {
	const method = (transport as Partial<PullServerStreamingTransport>)[PULL_SERVER_STREAMING];
	if (typeof method !== 'function') return undefined;
	if (transport.mergeOptions({}).interceptors?.length) return undefined;
	return method.bind(transport) as PullServerStreaming;
}

const nonRetryable = new WeakSet<object>();

/** Marks `error` as failing the same way on every attempt, so a retrying caller surfaces it. */
export function markNonRetryable<E extends object>(error: E): E {
	nonRetryable.add(error);
	return error;
}

/** Whether `error` was marked with `markNonRetryable`. */
export function isNonRetryable(error: unknown): boolean {
	return typeof error === 'object' && error !== null && nonRetryable.has(error);
}
