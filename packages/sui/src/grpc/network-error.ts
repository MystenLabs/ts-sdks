// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Codes a failed gRPC-web fetch or body read as `UNAVAILABLE`, which resumable streams retry,
 * instead of upstream's `INTERNAL`. `RpcError`s, errors after `signal` aborts, and `AbortError`s
 * (a custom fetch may combine the call signal with its own) are returned unchanged. `stage` says
 * whether the request failed before a response (`request`) or the response body broke
 * (`response`), which streams report differently.
 */
export function toNetworkRpcError(
	error: unknown,
	signal: AbortSignal | null | undefined,
	stage: 'request' | 'response',
): unknown {
	if (signal?.aborted || error instanceof RpcError || isAbortError(error)) return error;
	const rpcError = new RpcError(
		error instanceof Error ? error.message : 'Network stream failed',
		'UNAVAILABLE',
	);
	return stage === 'request' ? markRequestFailed(rpcError) : markConnectionLost(rpcError);
}

const requestFailures = new WeakSet<object>();
const connectionLost = new WeakSet<object>();

function markRequestFailed<E extends object>(error: E): E {
	requestFailures.add(error);
	return error;
}

/** Whether a request failed before the server answered (from `toNetworkRpcError`). */
export function isRequestFailed(error: unknown): boolean {
	return typeof error === 'object' && error !== null && requestFailures.has(error);
}

/**
 * Marks an error as a connection that broke after the server answered, such as a reset stream or
 * a failed body read, so a stream can tell it from a server that reported itself `UNAVAILABLE`.
 * Returns the error.
 */
export function markConnectionLost<E extends object>(error: E): E {
	connectionLost.add(error);
	return error;
}

/** Whether `error` was marked with `markConnectionLost`. */
export function isConnectionLost(error: unknown): boolean {
	return typeof error === 'object' && error !== null && connectionLost.has(error);
}

/** Whether `error` is an `AbortError`, read by shape so another realm's error matches. */
export function isAbortError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		(error as { name?: unknown }).name === 'AbortError'
	);
}

const httpStatuses = new WeakMap<object, number>();

/** Records the HTTP status of a non-2xx response an error was coded from. Returns the error. */
export function markHttpStatus<E extends object>(error: E, status: number): E {
	httpStatuses.set(error, status);
	return error;
}

/** The HTTP status recorded with `markHttpStatus`, if any. */
export function httpStatusOf(error: unknown): number | undefined {
	return typeof error === 'object' && error !== null ? httpStatuses.get(error) : undefined;
}
