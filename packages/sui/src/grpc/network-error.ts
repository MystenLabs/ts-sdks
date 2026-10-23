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
	return new RpcError(
		error instanceof Error ? error.message : 'Network stream failed',
		'UNAVAILABLE',
	);
}

function isAbortError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		(error as { name?: unknown }).name === 'AbortError'
	);
}
