// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { AnalyzedCommand, CoinFlow } from '@mysten/wallet-sdk';
import { analyze, analyzers } from '@mysten/wallet-sdk';

export interface TransactionAnalysis {
	commands: AnalyzedCommand[];
	coinFlows: CoinFlow[] | null;
}

type AnalysisResult =
	| { kind: 'rich'; analysis: TransactionAnalysis }
	| { kind: 'error'; message: string };

/**
 * Analyze a transaction using wallet-sdk (rich analysis with coin flows),
 * falling back to direct Transaction parsing if unavailable.
 *
 * Pure async function — independently testable without Lit.
 */
export async function analyzeTransaction(
	txData: string,
	client?: ClientWithCoreApi | null,
): Promise<AnalysisResult> {
	if (!client) {
		return { kind: 'error', message: 'No client available to analyze transaction' };
	}

	try {
		const result = await analyze(
			{ commands: analyzers.commands, coinFlows: analyzers.coinFlows },
			{ client, transaction: txData },
		);
		if (result.commands.result) {
			return {
				kind: 'rich',
				analysis: {
					commands: result.commands.result,
					coinFlows: result.coinFlows.result?.outflows ?? null,
				},
			};
		}

		// Surface the issues from the analyzer if available
		const issues = result.commands.issues ?? result.coinFlows.issues ?? [];
		if (issues.length > 0) {
			return {
				kind: 'error',
				message: issues.map((i: { message: string }) => i.message).join('\n'),
			};
		}
		return { kind: 'error', message: 'Transaction analysis returned no results' };
	} catch (e) {
		const raw = e instanceof Error ? e.message : String(e);
		// Provide more context for common failure modes
		let message: string;
		if (raw.includes('fetch') || raw.includes('network') || raw.includes('ECONNREFUSED')) {
			message = `Network error: ${raw}`;
		} else if (raw.includes('deserialize') || raw.includes('BCS') || raw.includes('parse')) {
			message = `Invalid transaction data: ${raw}`;
		} else {
			message = raw;
		}
		return { kind: 'error', message };
	}
}
