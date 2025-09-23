// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useCallback } from 'react';
import type { CoinBalance, CoinMetadata, SuiClient } from '@mysten/sui/client';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { formatBalance } from '../../utils/format.js';

interface CoinWithMetadata extends CoinBalance {
	metadata?: CoinMetadata | null;
	name: string;
	symbol: string;
	iconUrl?: string;
}

interface BalancesListProps {
	account: ReadonlyWalletAccount;
	suiClient: SuiClient;
}

export function BalancesList({ account, suiClient }: BalancesListProps) {
	const [balances, setBalances] = useState<CoinWithMetadata[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const isSuiCoin = (coinType: string) => {
		return coinType === '0x2::sui::SUI';
	};

	const getCoinIcon = (coinType: string, metadata?: CoinMetadata | null) => {
		if (isSuiCoin(coinType)) {
			// Use the official SUI icon
			return (
				<img
					src="https://strapi-dev.scand.app/uploads/sui_c07df05f00.png"
					alt="SUI"
					width="20"
					height="20"
					className="rounded-full"
				/>
			);
		}

		if (metadata?.iconUrl) {
			return (
				<img
					src={metadata.iconUrl}
					width="20"
					height="20"
					className="rounded-full"
					alt={metadata.symbol || 'Coin'}
				/>
			);
		}

		// Default coin icon
		return <div className="flex text-gray-500">?</div>;
	};

	const fetchBalances = useCallback(async () => {
		setIsLoading(true);
		try {
			const balanceData = await suiClient.getAllBalances({
				owner: account.address,
			});

			// Always include SUI coin even if balance is 0
			const suiBalance = balanceData.find((b) => isSuiCoin(b.coinType));
			const otherBalances = balanceData.filter((b) => !isSuiCoin(b.coinType));

			// If no SUI balance found, add it with 0 balance
			const allBalances = suiBalance
				? balanceData
				: [{ coinType: '0x2::sui::SUI', totalBalance: '0', coinObjectCount: 0 }, ...otherBalances];

			// Fetch metadata for each coin type
			const balancesWithMetadata: CoinWithMetadata[] = await Promise.all(
				allBalances.map(async (balance) => {
					try {
						let metadata: CoinMetadata | null = null;
						let name = 'Unknown';
						let symbol = 'UNKNOWN';
						let iconUrl: string | undefined;

						if (isSuiCoin(balance.coinType)) {
							name = 'Sui';
							symbol = 'SUI';
						} else {
							try {
								metadata = await suiClient.getCoinMetadata({ coinType: balance.coinType });
								if (metadata) {
									name = metadata.name || balance.coinType.split('::').pop() || 'Unknown';
									symbol = metadata.symbol || 'UNKNOWN';
									iconUrl = metadata.iconUrl || undefined;
								}
							} catch (error) {
								// Metadata fetch failed, use fallback
								name = balance.coinType.split('::').pop() || 'Unknown';
								symbol = name.toUpperCase();
							}
						}

						return {
							...balance,
							metadata,
							name,
							symbol,
							iconUrl,
						} as CoinWithMetadata;
					} catch (error) {
						console.error('Failed to fetch metadata for', balance.coinType, error);
						return {
							...balance,
							metadata: null,
							name: balance.coinType.split('::').pop() || 'Unknown',
							symbol: balance.coinType.split('::').pop()?.toUpperCase() || 'UNKNOWN',
						} as CoinWithMetadata;
					}
				}),
			);

			// Sort balances: SUI first, then by balance value (descending)
			const sortedBalances = balancesWithMetadata.sort((a, b) => {
				if (isSuiCoin(a.coinType)) return -1;
				if (isSuiCoin(b.coinType)) return 1;

				// Parse balance values and sort by value (descending)
				const aValue = parseFloat(a.totalBalance) / Math.pow(10, a.metadata?.decimals || 9);
				const bValue = parseFloat(b.totalBalance) / Math.pow(10, b.metadata?.decimals || 9);
				return bValue - aValue;
			});

			setBalances(sortedBalances);
		} catch (error) {
			console.error('Failed to fetch balances:', error);
		} finally {
			setIsLoading(false);
		}
	}, [account.address, suiClient]);

	useEffect(() => {
		fetchBalances();
		const interval = setInterval(fetchBalances, 10000); // Refresh every 10 seconds
		return () => clearInterval(interval);
	}, [fetchBalances]);

	if (isLoading && balances.length === 0) {
		return (
			<div className="p-6 flex items-center justify-center">
				<div className="flex items-center gap-2 text-gray-500">
					<div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
					Loading balances...
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{balances.length === 0 ? (
				<div className="p-6 text-center text-gray-500">
					<div className="text-4xl mb-2">💰</div>
					<div className="text-sm">No balances found</div>
				</div>
			) : (
				<div className="divide-y divide-gray-100">
					{balances.map((balance, index) => {
						const decimals = balance.metadata?.decimals ?? 9;
						const formattedBalance = formatBalance(balance.totalBalance, decimals);
						const hasBalance = parseFloat(balance.totalBalance) > 0;

						return (
							<div
								key={`${balance.coinType}-${index}`}
								className={`p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
									!hasBalance ? 'opacity-60' : ''
								}`}
							>
								<div className="flex-shrink-0">
									{getCoinIcon(balance.coinType, balance.metadata)}
								</div>

								<div className="flex-1 min-w-0">
									<div className="font-medium text-gray-900 text-sm truncate">{balance.name}</div>
									<div className="text-xs text-gray-500 uppercase">{balance.symbol}</div>
								</div>

								<div className="flex-shrink-0 text-right">
									<div
										className={`text-sm font-medium ${hasBalance ? 'text-gray-900' : 'text-gray-400'}`}
									>
										{formattedBalance}
									</div>
									{hasBalance && <div className="text-xs text-gray-500">{balance.symbol}</div>}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Refresh Button */}
			<div className="p-3 border-t border-gray-100 bg-gray-50">
				<button
					onClick={fetchBalances}
					disabled={isLoading}
					className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors border-none cursor-pointer ${
						isLoading
							? 'bg-gray-200 text-gray-400 cursor-not-allowed'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
					}`}
				>
					{isLoading ? (
						<div className="flex items-center justify-center gap-2">
							<div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
							Refreshing...
						</div>
					) : (
						<div className="flex items-center justify-center gap-1">
							<span>🔄</span>
							Refresh Balances
						</div>
					)}
				</button>
			</div>
		</div>
	);
}
