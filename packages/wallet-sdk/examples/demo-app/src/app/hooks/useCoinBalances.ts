// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit-react';
import type { CoinWithMetadata } from '../types/coins.js';

interface UseCoinBalancesReturn {
	coinBalances: CoinWithMetadata[];
	loadingBalances: boolean;
	error: string | null;
	refetchBalances: () => Promise<void>;
}

export function useCoinBalances(accountAddress?: string): UseCoinBalancesReturn {
	const suiClient = useSuiClient();
	const [coinBalances, setCoinBalances] = useState<CoinWithMetadata[]>([]);
	const [loadingBalances, setLoadingBalances] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadCoinBalances = useCallback(async () => {
		if (!accountAddress) {
			setCoinBalances([]);
			return;
		}

		setLoadingBalances(true);
		setError(null);

		try {
			const balances = await suiClient.getAllBalances({ owner: accountAddress });
			const balancesWithMetadata = await Promise.all(
				balances
					.filter((balance) => BigInt(balance.totalBalance) > 0n)
					.map(async (balance): Promise<CoinWithMetadata> => {
						// Handle SUI specially since it's always available
						if (balance.coinType === '0x2::sui::SUI') {
							return {
								...balance,
								metadata: null,
								name: 'Sui',
								symbol: 'SUI',
							};
						}

						try {
							const metadata = await suiClient.getCoinMetadata({ coinType: balance.coinType });

							return {
								...balance,
								metadata,
								name: metadata?.name || balance.coinType.split('::').pop() || 'Unknown',
								symbol:
									metadata?.symbol ||
									balance.coinType.split('::').pop()?.toUpperCase() ||
									'UNKNOWN',
							};
						} catch (metadataError) {
							// If metadata fetch fails, still include the balance with basic info
							return {
								...balance,
								metadata: null,
								name: balance.coinType.split('::').pop() || 'Unknown',
								symbol: balance.coinType.split('::').pop()?.toUpperCase() || 'UNKNOWN',
							};
						}
					}),
			);

			setCoinBalances(balancesWithMetadata);
		} catch (err) {
			console.error('Failed to load coin balances:', err);
			setError(err instanceof Error ? err.message : 'Failed to load balances');
		} finally {
			setLoadingBalances(false);
		}
	}, [accountAddress, suiClient]);

	useEffect(() => {
		loadCoinBalances();
	}, [loadCoinBalances]);

	return {
		coinBalances,
		loadingBalances,
		error,
		refetchBalances: loadCoinBalances,
	};
}
