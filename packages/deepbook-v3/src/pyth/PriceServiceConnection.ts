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
	 * upgraded Core answers 401 without one. Named to match `@mysten/suins` and Pyth's own
	 * client, which take the same credential under the same name.
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
		const response = await this.httpClient.get('/v2/updates/price/latest', {
			params: {
				// Serialized explicitly rather than relying on axios's array encoding, which is
				// what Hermes expects and what a future axios major could change under us.
				'ids[]': priceIds,
				encoding: 'base64',
				parsed: false,
			},
		});

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
