// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/experimental';
import { useEffect, useState } from 'react';
import type { WalletRequest } from '../core/DemoWallet.js';
import { autoApprovalAnalyzer, analyze, analyzers } from '@mysten/wallet-sdk';

function analyzeTransaction(client: ClientWithCoreApi, walletRequest: WalletRequest) {
	return analyze(
		{
			autoApproval: autoApprovalAnalyzer,
			commands: analyzers.commands,
			moveFunctions: analyzers.moveFunctions,
			transactionResponse: analyzers.transactionResponse,
			data: analyzers.data,
			coins: analyzers.coins,
			inputs: analyzers.inputs,
		},
		{
			client,
			transaction: walletRequest.data,
			getCoinPrices: async (coinTypes: string[]) => {
				// Provide mock prices for demo purposes
				// In a real app, you would fetch these from a price API
				return coinTypes.map((coinType) => {
					// Normalize the coin type for comparison
					const normalizedType = coinType.toLowerCase();

					// Check for SUI coin
					if (
						normalizedType.includes('::sui::sui') ||
						normalizedType === '0x2::sui::sui' ||
						normalizedType ===
							'0x0000000000000000000000000000000000000000000000000000000000000002::sui::sui'
					) {
						return {
							coinType,
							decimals: 9, // SUI has 9 decimals
							price: 3.5, // Mock SUI price in USD
						};
					}

					// Check for WAL coin
					if (normalizedType.includes('::wal::wal')) {
						return {
							coinType,
							decimals: 9, // WAL has 9 decimals
							price: 0.5, // Mock WAL price in USD
						};
					}

					// Return null for unknown coins (no price available)
					return {
						coinType,
						decimals: 9, // Default to 9 decimals
						price: null,
					};
				});
			},
		},
	);
}

export type WalletTransactionAnalysis = Awaited<ReturnType<typeof analyzeTransaction>>;

export function useAnalysis(client: ClientWithCoreApi, walletRequest: WalletRequest) {
	const [analysis, setAnalysis] = useState<WalletTransactionAnalysis | null>(null);
	useEffect(() => {
		async function runAnalyzeTransaction() {
			if (!client || !walletRequest) return;

			try {
				const analysis = await analyzeTransaction(client, walletRequest);

				setAnalysis(analysis);
			} catch (error) {
				console.error('Error analyzing transaction:', error);
			}
		}

		runAnalyzeTransaction();
	}, [client, walletRequest]);

	return analysis;
}
