// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Internal: none of this is exported from `@mysten/sui/grpc`.

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import type { MethodInfo, RpcOptions, RpcTransport } from '@protobuf-ts/runtime-rpc';

/**
 * A server-streaming call whose messages are read from the network only as `responses` is pulled.
 * `responses` has a single consumer, and `return()` cancels the call.
 */
export interface ServerStreamingIterableCall<O extends object = object> {
	readonly responses: AsyncIterableIterator<O>;
}

/** Starts an on-demand server-streaming call. Interceptors are not applied. */
export type PullServerStreaming = <I extends object, O extends object>(
	method: MethodInfo<I, O>,
	input: I,
	options?: RpcOptions,
) => ServerStreamingIterableCall<O>;

/** The key of the on-demand server-streaming method on transports that have one. */
export const PULL_SERVER_STREAMING = Symbol('PullServerStreaming');

export interface PullServerStreamingTransport extends RpcTransport {
	[PULL_SERVER_STREAMING]: PullServerStreaming;
}

/**
 * The transport's on-demand server-streaming method, or `undefined` when it has none, uses the
 * text format, or has interceptors, which only run through `serverStreaming`.
 */
export function pullServerStreaming(transport: RpcTransport): PullServerStreaming | undefined {
	const method = (transport as Partial<PullServerStreamingTransport>)[PULL_SERVER_STREAMING];
	if (typeof method !== 'function') return undefined;
	const options: Partial<GrpcWebOptions> = transport.mergeOptions({});
	if (options.interceptors?.length || options.format === 'text') return undefined;
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
