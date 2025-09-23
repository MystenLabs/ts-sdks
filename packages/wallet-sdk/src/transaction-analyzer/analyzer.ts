// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/experimental';
import { ClientCache } from '@mysten/sui/experimental';
import { Transaction } from '@mysten/sui/transactions';
import { baseAnalyzers } from './base.js';
import type { BaseAnalysis } from './base.js';

export type Analyzer<Result, Analysis = object> = (
	tx: Transaction,
	client: ClientWithCoreApi,
) => (analyzer: TransactionAnalyzer<Analysis & BaseAnalysis>) => Result | PromiseLike<Result>;

export interface TransactionAnalysisIssue {
	message: string;
	error?: Error;
}

export class TransactionAnalyzer<
	T = BaseAnalysis,
	Client extends ClientWithCoreApi = ClientWithCoreApi,
> {
	#transaction: Transaction;
	#cache = new ClientCache();
	#client: Client;
	#issues: {
		message: string;
	}[] = [];

	#analyzers: {
		[k in keyof T]: (analyzer: this) => Promise<T[k]>;
	};

	private constructor(
		client: Client,
		transactionJson: string,
		analyzers: {
			[k in keyof T]: Analyzer<T[k], T>;
		},
	) {
		this.#client = client;
		this.#transaction = Transaction.from(transactionJson);

		this.#analyzers = Object.fromEntries(
			Object.entries(analyzers).map(([key, fn]) => [
				key,
				(fn as (tx: Transaction, client: Client) => unknown)(this.#transaction, this.#client),
			]),
		) as { [k in keyof T]: () => Promise<T[k]> };
	}

	static create<T, Client extends ClientWithCoreApi = ClientWithCoreApi>(
		client: Client,
		transaction: string,
		analyzers: {
			[k in keyof T]: Analyzer<T[k], T>;
		},
	) {
		return new TransactionAnalyzer(client, transaction, {
			...baseAnalyzers,
			...analyzers,
		}) as TransactionAnalyzer<T, Client>;
	}

	get<K extends keyof T>(key: K & string): Promise<T[K]> {
		return this.#cache.read([key], () => this.#analyzers[key](this)) as Promise<T[K]>;
	}

	getAll<const K extends (keyof T & string)[]>(...keys: K) {
		return Promise.all(keys.map((key) => this.get(key))) as Promise<{
			[K2 in keyof K]: T[K[K2]];
		}>;
	}

	addIssue(issue: TransactionAnalysisIssue) {
		this.#issues.push(issue);
	}
}
