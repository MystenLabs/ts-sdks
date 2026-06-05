// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { analyze, createAnalyzer, type Analyzer } from '@mysten/wallet-sdk';

/**
 * The analyzer-map shape accepted by the `@mysten/wallet-sdk` `analyze` function.
 *
 * Anchored to the public `analyze` value's first parameter: it's the only bound
 * that is satisfiable by any user `createAnalyzer(...)` map AND preserves each
 * analyzer's result-type generic so it can be projected into validators.
 */
export type AnalyzerMap = Parameters<typeof analyze>[0];

/**
 * The current on-chain epoch — a small analyzer so `boundedExpiration` doesn't
 * fetch it inline (and it dedupes if several validators depend on it).
 */
export const currentEpoch = createAnalyzer({
	cacheKey: 'sponsor:currentEpoch@1',
	analyze: (options: { client: ClientWithCoreApi }) => async () => {
		const { systemState } = await options.client.core.getCurrentSystemState();
		return { result: BigInt(systemState.epoch) };
	},
});

/**
 * The *unwrapped* analysis a validator's `run` receives: each declared analyzer's
 * result value, keyed by name. A failed dependency never reaches `run` (it
 * short-circuits to `ANALYSIS_FAILED`), so these are always resolved values.
 */
export type AnalysisResults<TMap extends AnalyzerMap> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[K in keyof TMap]: TMap[K] extends Analyzer<infer R, any, any> ? R : never;
};
