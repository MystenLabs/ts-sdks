// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

export type HexString = string;
export type PriceFeedRequestConfig = {
	verbose?: boolean;
	binary?: boolean;
};
export type PriceServiceConnectionConfig = {
	timeout?: number;
	httpRetries?: number;
	/**
	 * Bearer token for Hermes deployments that authenticate. The endpoint serving Pyth's
	 * upgraded Core answers 401 without one.
	 *
	 * `accessToken` is chosen to converge with the in-flight `@mysten/suins` Pyth migration
	 * (ts-sdks#1158), which takes the same credential under this name. That is not yet
	 * published, so this is a convergence target rather than an existing convention.
	 */
	accessToken?: string;
};
export class PriceServiceConnection {
	private httpClient: AxiosInstance;
	/**
	 * Constructs a new Connection.
	 *
	 * @param endpoint endpoint URL to the price service.
	 * @param config Optional configuration for custom setups.
	 */
	constructor(endpoint: string, config?: PriceServiceConnectionConfig) {
		this.httpClient = axios.create({
			baseURL: endpoint,
			timeout: config?.timeout || 5000,
			headers: config?.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : undefined,
		});
		axiosRetry(this.httpClient, {
			retries: config?.httpRetries || 3,
			retryDelay: axiosRetry.exponentialDelay,
		});
	}
	/**
	 * Fetch the latest price update data for the given price IDs.
	 *
	 * Uses Hermes v2 (`/v2/updates/price/latest`). The v1 endpoint (`/api/latest_vaas`)
	 * is deprecated; it returned the same payload this reads out of `binary.data`.
	 *
	 * Hermes returns one accumulator message covering every requested feed, not one per
	 * feed, so the result is normally a single element regardless of `priceIds.length`.
	 *
	 * @param priceIds Array of hex-encoded price IDs.
	 * @returns Array of base64-encoded update messages.
	 */
	async getLatestVaas(priceIds: HexString[]): Promise<string[]> {
		let response;
		try {
			response = await this.httpClient.get('/v2/updates/price/latest', {
				params: {
					// Serialized explicitly rather than relying on axios's array encoding, which is
					// what Hermes expects and what a future axios major could change under us.
					'ids[]': priceIds,
					encoding: 'base64',
					parsed: false,
				},
			});
		} catch (error) {
			// An axios error carries `config.headers` — including `Authorization` — and both
			// `JSON.stringify(err)` and `err.toJSON()` serialize it. Callers log failed requests,
			// so letting the raw error escape would put the bearer token in their logs. Re-throw
			// a plain error carrying only what is useful for diagnosis.
			throw new Error(`Hermes request failed: ${describeRequestError(error)}`, {
				cause: undefined,
			});
		}

		const data = response.data?.binary?.data;
		if (!Array.isArray(data)) {
			throw new Error(
				`Unexpected Hermes response: expected 'binary.data' array from /v2/updates/price/latest, got ${JSON.stringify(
					response.data,
				)?.slice(0, 200)}`,
			);
		}

		return data;
	}
}

/**
 * A diagnosable one-line summary of a failed request that cannot contain the access token:
 * status and response body only, never the request config or its headers.
 */
function describeRequestError(error: unknown): string {
	const e = error as {
		response?: { status?: number; statusText?: string; data?: unknown };
		code?: string;
		message?: string;
	};
	if (e?.response) {
		const body =
			typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data);
		return `${e.response.status ?? '?'} ${e.response.statusText ?? ''} ${body?.slice(0, 200) ?? ''}`.trim();
	}
	// No response: a transport failure. `message` is a fixed axios string ("timeout of 5000ms
	// exceeded", "Network Error") that embeds no header material.
	return e?.code ? `${e.code} ${e.message ?? ''}`.trim() : (e?.message ?? 'unknown error');
}
