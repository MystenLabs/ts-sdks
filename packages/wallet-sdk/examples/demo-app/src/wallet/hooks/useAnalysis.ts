// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/experimental';
import { useEffect, useState } from 'react';
import type { WalletRequest } from '../core/DemoWallet.js';
import type { AutoApprovalAnalysis, CoinValueAnalysis } from '@mysten/wallet-sdk';
import {
	createCoinValueAnalyzer,
	operationTypeAnalyzer,
	TransactionAnalyzer,
} from '@mysten/wallet-sdk';

export function useAnalysis(client: ClientWithCoreApi, walletRequest: WalletRequest) {
	const [analysis, setAnalysis] = useState<AutoApprovalAnalysis | null>(null);
	useEffect(() => {
		async function analyze() {
			if (!client || !walletRequest) return;

			try {
				const analyzer = TransactionAnalyzer.create<{
					coinValues: CoinValueAnalysis;
					operationType: string | null;
				}>(client, walletRequest.data, {
					operationType: operationTypeAnalyzer,
					coinValues: createCoinValueAnalyzer({
						getCoinPrices: async (_coinTypes: string[]) => {
							return [];
						},
					}),
				});

				setAnalysis(await analyzer.analyze());
			} catch (error) {
				console.error('Error analyzing transaction:', error);
			}
		}

		analyze();
	}, [client, walletRequest]);

	return analysis;
}
