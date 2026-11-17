// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// This entry point only exists so packages that still import it keep loading; every API throws.

export type * from './types.js';

const MESSAGE =
	'JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead.';

function unsupported(): never {
	throw new Error(MESSAGE);
}

/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export class SuiJsonRpcClient {
	constructor(..._args: unknown[]) {
		unsupported();
	}
}

/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export class JsonRpcHTTPTransport {
	constructor(..._args: unknown[]) {
		unsupported();
	}
}

/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export class SuiHTTPTransportError extends Error {
	constructor(..._args: unknown[]) {
		super(MESSAGE);
		unsupported();
	}
}

/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export class JsonRpcError extends SuiHTTPTransportError {}

/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export class SuiHTTPStatusError extends SuiHTTPTransportError {}

/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export function getJsonRpcFullnodeUrl(..._args: unknown[]): never {
	unsupported();
}

// Returns false instead of throwing: callers use it to pick a code path, and no client can exist.
/** @deprecated JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead. */
export function isSuiJsonRpcClient(_client: unknown): _client is SuiJsonRpcClient {
	return false;
}
