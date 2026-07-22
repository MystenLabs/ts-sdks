// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

const CODE_TO_ERROR_TYPE: Record<number, string> = {
	'-32700': 'ParseError',
	'-32701': 'OversizedRequest',
	'-32702': 'OversizedResponse',
	'-32600': 'InvalidRequest',
	'-32601': 'MethodNotFound',
	'-32602': 'InvalidParams',
	'-32603': 'InternalError',
	'-32604': 'ServerBusy',
	'-32000': 'CallExecutionFailed',
	'-32001': 'UnknownError',
	'-32003': 'SubscriptionClosed',
	'-32004': 'SubscriptionClosedWithError',
	'-32005': 'BatchesNotSupported',
	'-32006': 'TooManySubscriptions',
	'-32050': 'TransientError',
	'-32002': 'TransactionExecutionClientError',
};

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export class SuiHTTPTransportError extends Error {}

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export class JsonRpcError extends SuiHTTPTransportError {
	code: number;
	type: string;

	constructor(message: string, code: number) {
		super(message);
		this.code = code;
		this.type = CODE_TO_ERROR_TYPE[code] ?? 'ServerError';
	}
}

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export class SuiHTTPStatusError extends SuiHTTPTransportError {
	status: number;
	statusText: string;

	constructor(message: string, status: number, statusText: string) {
		super(message);
		this.status = status;
		this.statusText = statusText;
	}
}
