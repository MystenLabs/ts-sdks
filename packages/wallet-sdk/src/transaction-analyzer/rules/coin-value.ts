// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAnalyzer } from '../analyzer.js';
import { balanceFlows } from './balance-flows.js';

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

export const coinValues = createAnalyzer({
	dependencies: { balanceFlows },
	analyze:
		({ getCoinPrices }: CoinValueAnalyzerOptions) =>
		async ({ balanceFlows }) => {
			const outflows = balanceFlows.sender
				.filter((f) => f.amount < 0n)
				.map((f) => ({ coinType: f.coinType, amount: -f.amount }));

			const prices = await getCoinPrices(outflows.map((cf) => cf.coinType));

			let total = 0;
			const coinTypesWithoutPrice: string[] = [];
			const coinTypes: CoinValueAnalysis['coinTypes'] = [];

			for (const flow of outflows) {
				const price = prices.find((p) => p.coinType === flow.coinType);
				if (price?.price != null) {
					const convertedAmount = (Number(flow.amount) / 10 ** price.decimals) * price.price;
					total += convertedAmount;
					coinTypes.push({
						coinType: flow.coinType,
						decimals: price.decimals,
						price: price.price,
						amount: flow.amount,
						convertedAmount,
					});
				} else {
					coinTypesWithoutPrice.push(flow.coinType);
				}
			}

			return { result: { total, coinTypesWithoutPrice, coinTypes } };
		},
});
