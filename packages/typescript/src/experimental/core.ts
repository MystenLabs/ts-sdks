// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Experimental_BaseClient } from './client.js';
import type { Experimental_SuiClientTypes } from './types.js';

export abstract class Experimental_CoreClient
	extends Experimental_BaseClient
	implements Experimental_SuiClientTypes.TransportMethods
{
	core = this;

	abstract getObjects(
		options: Experimental_SuiClientTypes.GetObjectsOptions,
	): Promise<Experimental_SuiClientTypes.GetObjectsResponse>;

	abstract getCoins(
		options: Experimental_SuiClientTypes.GetCoinsOptions,
	): Promise<Experimental_SuiClientTypes.GetCoinsResponse>;

	abstract getOwnedObjects(
		options: Experimental_SuiClientTypes.GetOwnedObjectsOptions,
	): Promise<Experimental_SuiClientTypes.GetOwnedObjectsResponse>;

	abstract getBalance(
		options: Experimental_SuiClientTypes.GetBalanceOptions,
	): Promise<Experimental_SuiClientTypes.GetBalanceResponse>;

	abstract getAllBalances(
		options: Experimental_SuiClientTypes.GetAllBalancesOptions,
	): Promise<Experimental_SuiClientTypes.GetAllBalancesResponse>;

	abstract getTransaction(
		options: Experimental_SuiClientTypes.GetTransactionOptions,
	): Promise<Experimental_SuiClientTypes.GetTransactionResponse>;

	abstract executeTransaction(
		options: Experimental_SuiClientTypes.ExecuteTransactionOptions,
	): Promise<Experimental_SuiClientTypes.ExecuteTransactionResponse>;

	abstract dryRunTransaction(
		options: Experimental_SuiClientTypes.DryRunTransactionOptions,
	): Promise<Experimental_SuiClientTypes.DryRunTransactionResponse>;

	abstract getReferenceGasPrice(): Promise<Experimental_SuiClientTypes.GetReferenceGasPriceResponse>;

	async waitForTransaction({
		signal,
		timeout = 60 * 1000,
		...input
	}: {
		/** An optional abort signal that can be used to cancel the wait. */
		signal?: AbortSignal;
		/** The amount of time to wait for transaction. Defaults to one minute. */
		timeout?: number;
	} & Experimental_SuiClientTypes.GetTransactionOptions): Promise<Experimental_SuiClientTypes.GetTransactionResponse> {
		const abortSignal = signal
			? AbortSignal.any([AbortSignal.timeout(timeout), signal])
			: AbortSignal.timeout(timeout);

		const abortPromise = new Promise((_, reject) => {
			abortSignal.addEventListener('abort', () => reject(abortSignal.reason));
		});

		abortPromise.catch(() => {
			// Swallow unhandled rejections that might be thrown after early return
		});

		// eslint-disable-next-line no-constant-condition
		while (true) {
			abortSignal.throwIfAborted();
			try {
				return await this.getTransaction({
					...input,
					signal: abortSignal,
				});
			} catch (e) {
				await Promise.race([new Promise((resolve) => setTimeout(resolve, 2_000)), abortPromise]);
			}
		}
	}
}
