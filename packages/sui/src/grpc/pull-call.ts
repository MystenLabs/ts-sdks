// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The types, the symbol and `markNonRetryable` are re-exported from `@mysten/sui/grpc/pull-transport`
// for transport implementations, with `markConnectionLost` and `isConnectionLost`.

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

/**
 * Starts an on-demand server-streaming call. `options` are the call's own; the transport merges its
 * defaults into them. Interceptors are not applied.
 */
export type PullServerStreaming = <I extends object, O extends object>(
	method: MethodInfo<I, O>,
	input: I,
	options?: RpcOptions,
) => ServerStreamingIterableCall<I, O>;

/** The key of the on-demand server-streaming method on transports that have one. */
export const PULL_SERVER_STREAMING = Symbol('PullServerStreaming');

/**
 * A transport that ledger streams read on demand. `SuiGrpcClient` uses the method when the transport
 * has no interceptors, and `serverStreaming` otherwise.
 *
 * Failures reject `responses.next()`, `headers`, `status` and `trailers` with one `RpcError` whose
 * `code` is a `GrpcStatusCode` name and whose message is already percent-decoded. A call that loses
 * its connection fails with `UNAVAILABLE`, and an aborted call with the status
 * `grpcStatusFromAbortReason` gives for the signal's reason. Ledger streams retry transient codes
 * such as `UNAVAILABLE`, so mark a failure that would recur on every attempt with
 * `markNonRetryable`.
 *
 * Mark a connection that broke after the server answered (such as a reset stream) with
 * `markConnectionLost`: streams then report it as `Disconnected` and reconnect without spending
 * their retry budget after progress. An unmarked `UNAVAILABLE` reads as a server that reported
 * itself unavailable. `@mysten/grpc-node-transport` marks reset streams and grpc-js's
 * `Connection dropped` failures.
 */
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
