// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionData } from '@mysten/sui/transactions';
import { TransactionDataBuilder } from '@mysten/sui/transactions';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { Analyzer, AnalyzerOutput } from '../analyzer.js';
import { createAnalyzer } from '../analyzer.js';

export const bytes = createAnalyzer({
	cacheKey: 'bytes@1.0.0',
	analyze:
		(options: { client: ClientWithCoreApi }, transaction: Transaction) =>
		async (): Promise<AnalyzerOutput<Uint8Array>> => {
			try {
				return {
					result: await transaction.build({ client: options.client }),
				};
			} catch {
				return { issues: [{ message: 'Failed to build transaction' }] };
			}
		},
}) as Analyzer<Uint8Array, { client: ClientWithCoreApi }>;

export const data = createAnalyzer({
	dependencies: { bytes },
	analyze: (_, tx) => (): { result: TransactionData } => {
		return { result: tx.getData() };
	},
}) as Analyzer<TransactionData, { client: ClientWithCoreApi }, { bytes: Uint8Array }>;

export const digest = createAnalyzer({
	dependencies: { bytes },
	analyze:
		() =>
		({ bytes }) => {
			return { result: TransactionDataBuilder.getDigestFromBytes(bytes) };
		},
}) as Analyzer<string, { client: ClientWithCoreApi }, { bytes: Uint8Array }>;

export const transactionResponse = createAnalyzer({
	cacheKey: 'transactionResponse@1.0.0',
	dependencies: { bytes },
	analyze:
		(options: { client: ClientWithCoreApi; transactionResponse?: SuiClientTypes.Transaction }) =>
		async ({ bytes }): Promise<AnalyzerOutput<SuiClientTypes.Transaction>> => {
			try {
				const result = await options.client.core.simulateTransaction({ transaction: bytes });
				return {
					result: options.transactionResponse ?? result.Transaction ?? result.FailedTransaction,
				};
			} catch {
				return { issues: [{ message: 'Failed to dry run transaction' }] };
			}
		},
}) as Analyzer<
	SuiClientTypes.Transaction,
	{ client: ClientWithCoreApi; transactionResponse?: SuiClientTypes.Transaction },
	{ bytes: Uint8Array }
>;

export const balanceChanges = createAnalyzer({
	dependencies: { transactionResponse },
	analyze:
		() =>
		({ transactionResponse }) => {
			return { result: transactionResponse.balanceChanges || [] };
		},
}) as Analyzer<
	SuiClientTypes.BalanceChange[],
	{ client: ClientWithCoreApi; transactionResponse?: SuiClientTypes.Transaction },
	{ transactionResponse: SuiClientTypes.Transaction }
>;
