// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Experimental_SuiClient } from './client.js';
import type { Experimental_SuiClientTypes } from './types.js';

export abstract class Experimental_CoreClient
	extends Experimental_SuiClient
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
}
