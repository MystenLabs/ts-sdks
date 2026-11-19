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

/** Errors whose message is already plain text, so it is not percent-decoded again. */
export const plainMessageErrors = new WeakSet<RpcError>();

/**
 * The error for a call the caller aborted. Its message is the caller's own text, which was never
 * percent-encoded on the wire. The code is applied from the reason later.
 */
export function abortRpcError(reason: unknown): RpcError {
	const error =
		reason instanceof RpcError ? reason : new RpcError(abortMessage(reason), 'CANCELLED');
	plainMessageErrors.add(error);
	return error;
}

function abortMessage(reason: unknown): string {
	if (typeof reason === 'string') return reason;
	return reason instanceof Error ? reason.message : 'The operation was aborted';
}
