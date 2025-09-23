// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit-react';

const WAL_COIN_TYPE =
	'0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';

interface UseWalrusBalancesReturn {
	walBalance: string;
	suiBalance: string;
	isLoading: boolean;
	error: string | null;
	refetchBalances: () => Promise<void>;
}

export function useWalrusBalances(accountAddress?: string): UseWalrusBalancesReturn {
	const suiClient = useSuiClient();
	const [walBalance, setWalBalance] = useState<string>('0');
	const [suiBalance, setSuiBalance] = useState<string>('0');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadBalances = useCallback(async () => {
		if (!accountAddress) return;

		setIsLoading(true);
		setError(null);

		try {
			const [suiBalanceRes, walBalanceRes] = await Promise.all([
				suiClient.getBalance({ owner: accountAddress }),
				suiClient.getBalance({
					owner: accountAddress,
					coinType: WAL_COIN_TYPE,
				}),
			]);

			setSuiBalance(suiBalanceRes.totalBalance);
			setWalBalance(walBalanceRes.totalBalance);
		} catch (err) {
			console.error('Failed to load balances:', err);
			setError(err instanceof Error ? err.message : 'Failed to load balances');
		} finally {
			setIsLoading(false);
		}
	}, [accountAddress, suiClient]);

	useEffect(() => {
		loadBalances();
	}, [loadBalances]);

	return {
		walBalance,
		suiBalance,
		isLoading,
		error,
		refetchBalances: loadBalances,
	};
}
