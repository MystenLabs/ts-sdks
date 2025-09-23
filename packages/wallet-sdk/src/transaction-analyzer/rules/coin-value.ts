// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Analyzer } from '../analyzer.js';
import type { CoinFlow } from './coin-flows.js';

export interface CoinValueAnalyzerOptions {
	getCoinPrices: (coinTypes: string[]) => Promise<
		{
			coinType: string;
			decimals: number;
			price: number | null;
		}[]
	>;
}

export interface CoinValueAnalysis {
	coinTypesWithoutPrice: string[];
	total: number | null;
	coinTypes: {
		coinType: string;
		total: number;
		decimals: number;
		price: number;
	}[];
}

export function createCoinValueAnalyzer({ getCoinPrices }: CoinValueAnalyzerOptions): Analyzer<
	CoinValueAnalysis,
	{
		coinFlows: CoinFlow[];
	}
> {
	return () => async (analyzer) => {
		const coinFlows = await analyzer.get('coinFlows');
		const prices = await getCoinPrices(coinFlows.map((cf) => cf.coinType));

		let total = 0;
		const coinTypesWithoutPrice: string[] = [];

		const coinTypes: {
			coinType: string;
			total: number;
			decimals: number;
			price: number;
		}[] = [];

		for (const flow of coinFlows) {
			if (flow.amount < 0n) {
				const result = prices.find((p) => p.coinType === flow.coinType);

				if (result?.price != null) {
					const amount = (Number(flow.amount) / 10 ** result.decimals) * result.price;
					total += amount;
					coinTypes.push({
						coinType: flow.coinType,
						total: amount,
						decimals: result.decimals,
						price: result.price,
					});
				} else {
					coinTypesWithoutPrice.push(flow.coinType);
				}
			}
		}

		return {
			total: total || null,
			coinTypesWithoutPrice,
			coinTypes: coinTypes,
		};
	};
}
