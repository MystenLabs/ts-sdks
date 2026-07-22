// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PACKAGE_VERSION } from '../version.js';
import { JsonRpcError, SuiHTTPStatusError } from './errors.js';

/**
 * An object defining headers to be passed to the RPC server
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export type HttpHeaders = { [header: string]: string };

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export interface JsonRpcHTTPTransportOptions {
	fetch?: typeof fetch;
	url: string;
	rpc?: {
		headers?: HttpHeaders;
		url?: string;
	};
}

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export interface JsonRpcTransportRequestOptions {
	method: string;
	params: unknown[];
	signal?: AbortSignal;
}

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export interface JsonRpcTransport {
	request<T = unknown>(input: JsonRpcTransportRequestOptions): Promise<T>;
}

/**
 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
 */
export class JsonRpcHTTPTransport implements JsonRpcTransport {
	#requestId = 0;
	#options: JsonRpcHTTPTransportOptions;

	/**
	 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
	 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
	 */
	constructor(options: JsonRpcHTTPTransportOptions) {
		this.#options = options;
	}

	/**
	 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
	 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
	 */
	fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
		const fetchFn = this.#options.fetch ?? fetch;

		if (!fetchFn) {
			throw new Error(
				'The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport.',
			);
		}

		return fetchFn(input, init);
	}

	/**
	 * @deprecated JSON-RPC APIs are deprecated in the Sui TypeScript SDK. Use `SuiGrpcClient`
	 * from `@mysten/sui/grpc` or `SuiGraphQLClient` from `@mysten/sui/graphql` instead.
	 */
	async request<T>(input: JsonRpcTransportRequestOptions): Promise<T> {
		this.#requestId += 1;

		const res = await this.fetch(this.#options.rpc?.url ?? this.#options.url, {
			method: 'POST',
			signal: input.signal,
			headers: {
				'Content-Type': 'application/json',
				'Client-Sdk-Type': 'typescript',
				'Client-Sdk-Version': PACKAGE_VERSION,
				'Client-Request-Method': input.method,
				...this.#options.rpc?.headers,
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: this.#requestId,
				method: input.method,
				params: input.params,
			}),
		});

		if (!res.ok) {
			throw new SuiHTTPStatusError(
				`Unexpected status code: ${res.status}`,
				res.status,
				res.statusText,
			);
		}

		const data = await res.json();

		if ('error' in data && data.error != null) {
			throw new JsonRpcError(data.error.message, data.error.code);
		}

		return data.result;
	}
}
