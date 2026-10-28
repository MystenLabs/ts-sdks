// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Codes a failed gRPC-web fetch or body read as `UNAVAILABLE`, which resumable streams retry,
 * instead of upstream's `INTERNAL`. `RpcError`s, errors after `signal` aborts, and `AbortError`s
 * (a custom fetch may combine the call signal with its own) are returned unchanged.
 */
export function toNetworkRpcError(error: unknown, signal: AbortSignal | null | undefined): unknown {
	if (signal?.aborted || error instanceof RpcError || isAbortError(error)) return error;
	return markConnectionLost(
		new RpcError(error instanceof Error ? error.message : 'Network stream failed', 'UNAVAILABLE'),
	);
}

const connectionLost = new WeakSet<object>();

/**
 * Marks an error as a lost connection rather than a server answer, so a stream can tell a network
 * failure from a server that reported itself `UNAVAILABLE`. Returns the error.
 */
export function markConnectionLost<E extends object>(error: E): E {
	connectionLost.add(error);
	return error;
}

/** Whether `error` was marked with `markConnectionLost`. */
export function isConnectionLost(error: unknown): boolean {
	return typeof error === 'object' && error !== null && connectionLost.has(error);
}

function isAbortError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		(error as { name?: unknown }).name === 'AbortError'
	);
}
