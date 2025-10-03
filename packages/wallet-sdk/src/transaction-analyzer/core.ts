// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import { TransactionDataBuilder } from '@mysten/sui/transactions';
import type { ClientWithCoreApi } from '@mysten/sui/experimental';
import type { AnalyzerResult } from './analyzer.js';
import { createAnalyzer } from './analyzer.js';

export const bytes = createAnalyzer({
	cacheKey: 'bytes@1.0.0',
	analyze:
		(options: { client: ClientWithCoreApi }, transaction: Transaction) =>
		async (): Promise<AnalyzerResult<Uint8Array>> => {
			try {
				return {
					result: await transaction.build({ client: options.client }),
				};
			} catch {
				return { issues: [{ message: 'Failed to build transaction' }] };
			}
		},
});

export const data = createAnalyzer({
	dependencies: { bytes },
	analyze:
		(_, tx) =>
		({ bytes }) => {
			if (bytes.issues) {
				return { issues: bytes.issues };
			}

			return { result: tx.getData() };
		},
});

export const digest = createAnalyzer({
	dependencies: { bytes },
	analyze:
		() =>
		({ bytes }) => {
			if (bytes.issues) {
				return { issues: bytes.issues };
			}

			return { result: TransactionDataBuilder.getDigestFromBytes(bytes.result) };
		},
});

export const dryRun = createAnalyzer({
	cacheKey: 'dryRun@1.0.0',
	dependencies: { bytes },
	analyze:
		(options: { client: ClientWithCoreApi }) =>
		async ({ bytes }) => {
			if (bytes.issues) {
				return { issues: bytes.issues };
			}

			try {
				return {
					result: await options.client.core.dryRunTransaction({ transaction: bytes.result }),
				};
			} catch {
				return { issues: [{ message: 'Failed to dry run transaction' }] };
			}
		},
});

export const balanceChanges = createAnalyzer({
	dependencies: { dryRun },
	analyze:
		() =>
		({ dryRun }) => {
			if (dryRun.issues) {
				return { issues: dryRun.issues };
			}

			return { result: dryRun.result.transaction.balanceChanges || [] };
		},
});
