// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAnalyzer } from '../analyzer.js';
import { coinFlows } from './coin-flows.js';

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
	total: number;
	coinTypes: {
		coinType: string;
		decimals: number;
		price: number;
		amount: bigint;
		convertedAmount: number;
	}[];
}

export const coinValue = createAnalyzer({
	dependencies: { coinFlows },
	analyze:
		({ getCoinPrices }: CoinValueAnalyzerOptions) =>
		async ({ coinFlows }) => {
			if (coinFlows.issues) {
				return { issues: coinFlows.issues };
			}

			const prices = await getCoinPrices(coinFlows.result.outflows.map((cf) => cf.coinType));

			let total = 0;
			const coinTypesWithoutPrice: string[] = [];

			const coinTypes: {
				coinType: string;
				decimals: number;
				price: number;
				amount: bigint;
				convertedAmount: number;
			}[] = [];

			for (const flow of coinFlows.result.outflows) {
				if (flow.amount > 0n) {
					const result = prices.find((p) => p.coinType === flow.coinType);

					if (result?.price != null) {
						const amount = (Number(flow.amount) / 10 ** result.decimals) * result.price;
						total += amount;
						coinTypes.push({
							coinType: flow.coinType,
							decimals: result.decimals,
							price: result.price,
							amount: flow.amount,
							convertedAmount: amount,
						});
					} else {
						coinTypesWithoutPrice.push(flow.coinType);
					}
				}
			}

			return {
				result: {
					total: total,
					coinTypesWithoutPrice,
					coinTypes: coinTypes,
				},
			};
		},
});
