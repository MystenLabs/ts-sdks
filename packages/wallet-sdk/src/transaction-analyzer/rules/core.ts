// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
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
			} catch (error) {
				// Building can throw for many reasons (object resolution, a missing client,
				// a malformed transaction) — keep the underlying detail instead of a generic
				// message, and attach the error for programmatic inspection.
				return {
					issues: [
						{
							message: `Failed to build transaction: ${(error as Error).message}`,
							error: error as Error,
						},
					],
				};
			}
		},
});

export const data = createAnalyzer({
	dependencies: { bytes },
	analyze: (_, tx) => () => {
		return { result: tx.getData() };
	},
});

export const digest = createAnalyzer({
	dependencies: { bytes },
	analyze:
		() =>
		({ bytes }) => {
			return { result: TransactionDataBuilder.getDigestFromBytes(bytes) };
		},
});

/**
 * The *extra* simulate fields {@link transactionResponse} can fetch. `effects` is
 * always included (this analyzer and its dependents rely on it), so it's omitted
 * here and can't be turned off — `Include` only ever widens what's fetched.
 */
type SimulateExtraInclude = Omit<SuiClientTypes.SimulateTransactionInclude, 'effects'>;

/**
 * {@link transactionResponse}'s request-scoped options for a given extra-`Include`.
 * `transactionResponse` and `include` are mutually exclusive *in effect*: injecting a
 * pre-computed response skips the dry-run, so `include` (which only shapes a
 * simulation) is ignored — inject one or the other, not both. When simulating,
 * `include` is required exactly when `Include` names a field that must be present (so
 * a dependent that needs, say, `balanceChanges` forces it to be passed). `effects` is
 * always added on top either way.
 *
 * The exclusivity can't be a type-level union here: the analyzer framework merges a
 * dependency's options with `UnionToIntersection`, which would collapse the two
 * branches to `never` and break every dependent. So both stay optional and the
 * precedence is enforced at runtime.
 */
type TransactionResponseOptions<Include extends SimulateExtraInclude> = {
	client: ClientWithCoreApi;
	/**
	 * Inject a pre-computed response to skip the dry-run entirely (e.g. a host that
	 * already simulated). Must carry at least the requested fields. Takes precedence
	 * over `include` — providing both ignores `include`.
	 */
	transactionResponse?: SuiClientTypes.Transaction<Include & { effects: true }>;
} & ({} extends Include ? { include?: Include } : { include: Include });

// One shared instance — the dry-run logic lives here, once. `transactionResponse()`
// hands this exact instance back, retyped per `Include`, so every consumer keeps the
// same identity and `cacheKey` (deduped to a single simulation per run) instead of
// each spinning up a copy. The runtime reads `include` off the shared options, so the
// data fetched always matches what the call actually requested.
const transactionResponseAnalyzer = createAnalyzer({
	cacheKey: 'transactionResponse@1.0.0',
	dependencies: { bytes },
	analyze:
		(options: TransactionResponseOptions<SimulateExtraInclude>) =>
		async ({ bytes }): Promise<AnalyzerOutput<SuiClientTypes.Transaction<{ effects: true }>>> => {
			// An injected response skips the dry-run — `include` doesn't apply (it only
			// shapes a simulation), which is why the two are mutually exclusive.
			if (options.transactionResponse) {
				return { result: options.transactionResponse };
			}
			try {
				const result = await options.client.core.simulateTransaction({
					transaction: bytes,
					// `effects` is forced last so a caller-supplied `include` can only add to
					// it, never drop the effects that `simulationSucceeds` (and others) read.
					include: { ...options.include, effects: true },
				});
				return {
					result: result.Transaction ?? result.FailedTransaction,
				};
			} catch (error) {
				// Simulation throws for many reasons (object/version resolution, gas
				// estimation, an unreachable node) — surface the underlying detail rather
				// than a generic message, and attach the error for programmatic inspection.
				return {
					issues: [
						{
							message: `Failed to dry run transaction: ${(error as Error).message}`,
							error: error as Error,
						},
					],
				};
			}
		},
});

/**
 * The dry-run analyzer, generic over the *extra* simulate `include` fields. Calling
 * it returns the one shared analyzer instance (above) retyped for `Include`, so its
 * result exposes exactly the fields you asked for and `include` becomes a required
 * option when `Include` names one — all without duplicating the analyzer or running
 * the simulation more than once. `effects` is always included.
 *
 * ```ts
 * // Reusable, deduped, and typed to what you requested:
 * createAnalyzer({
 *   dependencies: { tx: transactionResponse<{ balanceChanges: true }>() },
 *   analyze: () => ({ tx }) => ({ result: tx.balanceChanges }), // typed `BalanceChange[]`
 * });
 * ```
 */
export function transactionResponse<Include extends SimulateExtraInclude = {}>(): Analyzer<
	SuiClientTypes.Transaction<Include & { effects: true }>,
	TransactionResponseOptions<Include>,
	{ bytes: Uint8Array }
> {
	return transactionResponseAnalyzer as unknown as Analyzer<
		SuiClientTypes.Transaction<Include & { effects: true }>,
		TransactionResponseOptions<Include>,
		{ bytes: Uint8Array }
	>;
}

export const balanceChanges = createAnalyzer({
	dependencies: { transactionResponse: transactionResponse<{ balanceChanges: true }>() },
	analyze:
		() =>
		({ transactionResponse }) => {
			return { result: transactionResponse.balanceChanges };
		},
});
