// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Classifies an error thrown while fetching a gRPC-web response or reading its body.
 *
 * The upstream transport reports these as `INTERNAL`, the same status as a server failure or a
 * protobuf decode error. A failed fetch or body read is a network failure, so it is reported as
 * `UNAVAILABLE`, which resumable streams retry. An `RpcError` (a server status, protocol violation
 * or decode error) is returned unchanged, as is any error once `signal` has aborted, so aborts keep
 * the signal-aware normalization applied by the transport. An `AbortError` is also returned
 * unchanged even when `signal` has not aborted: a custom fetch may combine the call signal with its
 * own (for example `AbortSignal.any`), and that cancellation is not a network failure.
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
