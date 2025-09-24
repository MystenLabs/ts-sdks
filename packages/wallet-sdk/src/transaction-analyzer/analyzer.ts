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
) => (
	analyzer: Omit<TransactionAnalyzer<Analysis & BaseAnalysis>, '#analyzers' | 'analyze'>,
) => Result | PromiseLike<Result>;

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
		) as { [k in keyof T]: (analyzer: this) => Promise<T[k]> };
	}

	static create<T = object, Client extends ClientWithCoreApi = ClientWithCoreApi>(
		client: Client,
		transaction: string,
		analyzers: {
			[k in keyof T]: Analyzer<T[k], T>;
		},
	): TransactionAnalyzer<T & BaseAnalysis, Client> {
		return new TransactionAnalyzer<T & BaseAnalysis, Client>(client, transaction, {
			...baseAnalyzers,
			...analyzers,
		} as never);
	}

	get = <K extends keyof T>(key: K & string): Promise<T[K]> => {
		return this.#cache.read([key], () => this.#analyzers[key](this)) as Promise<T[K]>;
	};

	getAll = <const K extends (keyof T & string)[]>(...keys: K) => {
		return Promise.all(keys.map((key) => this.get(key))) as Promise<{
			[K2 in keyof K]: T[K[K2]];
		}>;
	};

	addIssue = (issue: TransactionAnalysisIssue) => {
		this.#issues.push(issue);
	};

	analyze = async () => {
		const results = Object.fromEntries(
			await Promise.all(
				Object.keys(this.#analyzers).map(async (key) => [
					key,
					await this.get(key as keyof T & string),
				]),
			),
		) as T;

		return {
			results,
			issues: this.#issues,
		};
	};
}
