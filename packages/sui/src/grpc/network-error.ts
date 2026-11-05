// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * Codes a network failure of a gRPC-web fetch or body read (a `TypeError`, as fetch reports it)
 * as `UNAVAILABLE` instead of upstream's `INTERNAL`. Other errors, and failures after `signal`
 * aborts, are returned unchanged.
 */
export function toNetworkRpcError(error: unknown, signal: AbortSignal | null | undefined): unknown {
	if (signal?.aborted || !(error instanceof TypeError)) return error;
	return new RpcError(error.message, 'UNAVAILABLE');
}
