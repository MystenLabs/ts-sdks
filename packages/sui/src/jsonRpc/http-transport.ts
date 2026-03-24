// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PACKAGE_VERSION, TARGETED_RPC_VERSION } from '../version.js';
import { JsonRpcError, SuiHTTPStatusError } from './errors.js';

/**
 * An object defining headers to be passed to the RPC server
 */
export type HttpHeaders = { [header: string]: string };

export interface JsonRpcHTTPTransportOptions {
	fetch?: typeof fetch;
	url: string;
	rpc?: {
		headers?: HttpHeaders;
		url?: string;
	};
}

export interface JsonRpcTransportRequestOptions {
	method: string;
	params: unknown[];
	signal?: AbortSignal;
}

export interface JsonRpcTransport {
	request<T = unknown>(input: JsonRpcTransportRequestOptions): Promise<T>;
}

export class JsonRpcHTTPTransport implements JsonRpcTransport {
	#requestId = 0;
	#options: JsonRpcHTTPTransportOptions;

	constructor(options: JsonRpcHTTPTransportOptions) {
		this.#options = options;
	}

	fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
		const fetchFn = this.#options.fetch ?? fetch;

		if (!fetchFn) {
			throw new Error(
				'The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport.',
			);
		}

		return fetchFn(input, init);
	}

	async request<T>(input: JsonRpcTransportRequestOptions): Promise<T> {
		this.#requestId += 1;

		const res = await this.fetch(this.#options.rpc?.url ?? this.#options.url, {
			method: 'POST',
			signal: input.signal,
			headers: {
				'Content-Type': 'application/json',
				'Client-Sdk-Type': 'typescript',
				'Client-Sdk-Version': PACKAGE_VERSION,
				'Client-Target-Api-Version': TARGETED_RPC_VERSION,
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
