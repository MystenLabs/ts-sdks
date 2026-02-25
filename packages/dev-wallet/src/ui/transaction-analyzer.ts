// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type { AnalyzedCommand, CoinFlow } from '@mysten/wallet-sdk';
import { analyze, analyzers } from '@mysten/wallet-sdk';

export interface TransactionAnalysis {
	commands: AnalyzedCommand[];
	coinFlows: CoinFlow[] | null;
}

export interface FallbackCommand {
	$kind: string;
	detail?: string;
}

export type AnalysisResult =
	| { kind: 'rich'; analysis: TransactionAnalysis }
	| { kind: 'fallback'; commands: FallbackCommand[] }
	| { kind: 'none' };

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
	// Try wallet-sdk analyzer (rich analysis with coin flows + function metadata)
	if (client) {
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
		} catch {
			// Fall through to fallback
		}
	}

	// Fallback: direct Transaction parsing (works without gas coins)
	try {
		const tx = Transaction.from(txData);
		const data = tx.getData();
		const commands: FallbackCommand[] = [];

		for (const cmd of data.commands) {
			switch (cmd.$kind) {
				case 'SplitCoins':
					commands.push({
						$kind: 'SplitCoins',
						detail: `${cmd.SplitCoins.amounts.length} split${cmd.SplitCoins.amounts.length !== 1 ? 's' : ''} from ${cmd.SplitCoins.coin.$kind === 'GasCoin' ? 'gas coin' : 'coin'}`,
					});
					break;
				case 'TransferObjects':
					commands.push({
						$kind: 'TransferObjects',
						detail: `${cmd.TransferObjects.objects.length} object${cmd.TransferObjects.objects.length !== 1 ? 's' : ''}`,
					});
					break;
				case 'MergeCoins':
					commands.push({
						$kind: 'MergeCoins',
						detail: `${cmd.MergeCoins.sources.length} source${cmd.MergeCoins.sources.length !== 1 ? 's' : ''}`,
					});
					break;
				case 'MoveCall':
					commands.push({
						$kind: 'MoveCall',
						detail: `${cmd.MoveCall.package}::${cmd.MoveCall.module}::${cmd.MoveCall.function}`,
					});
					break;
				case 'Publish':
					commands.push({ $kind: 'Publish', detail: 'New package' });
					break;
				case 'Upgrade':
					commands.push({ $kind: 'Upgrade', detail: 'Package upgrade' });
					break;
				default:
					commands.push({ $kind: cmd.$kind });
					break;
			}
		}

		if (commands.length > 0) {
			return { kind: 'fallback', commands };
		}
	} catch {
		// Parsing failed — no analysis available
	}

	return { kind: 'none' };
}
