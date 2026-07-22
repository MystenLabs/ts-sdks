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
	 * Fetch latest VAAs of given price IDs.
	 *
	 * @param priceIds Array of hex-encoded price IDs.
	 * @returns Array of base64 encoded VAAs.
	 */
	async getLatestVaas(priceIds: HexString[]): Promise<string[]> {
		const response = await this.httpClient.get('/v2/updates/price/latest', {
			params: {
				'ids[]': priceIds,
				encoding: 'base64',
				parsed: false,
			},
		});
		return response.data.binary.data;
	}
}
