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
					style={{ borderRadius: '50%' }}
				/>
			);
		}

		if (metadata?.iconUrl) {
			return (
				<img
					src={metadata.iconUrl}
					width="20"
					height="20"
					style={{ borderRadius: '50%' }}
					alt={metadata.symbol || 'Coin'}
				/>
			);
		}

		// Default coin icon
		return (
			<div
				style={{
					width: '20px',
					height: '20px',
					borderRadius: '50%',
					backgroundColor: '#ddd',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '10px',
					fontWeight: '600',
					color: '#666',
				}}
			>
				?
			</div>
		);
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

	return (
		<div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '12px',
				}}
			>
				<h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>Balances</h4>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{isLoading && <span style={{ fontSize: '11px', color: '#999' }}>Updating...</span>}
					<button
						onClick={fetchBalances}
						disabled={isLoading}
						style={{
							padding: '2px 6px',
							backgroundColor: '#f0f0f0',
							border: '1px solid #ddd',
							borderRadius: '3px',
							fontSize: '10px',
							cursor: isLoading ? 'not-allowed' : 'pointer',
							transition: 'background-color 0.2s ease',
						}}
						onMouseEnter={(e) => {
							if (!isLoading) {
								e.currentTarget.style.backgroundColor = '#e0e0e0';
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = '#f0f0f0';
						}}
					>
						🔄
					</button>
				</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				{balances.map((balance, index) => {
					const decimals = balance.metadata?.decimals ?? 9;
					const formattedBalance = formatBalance(balance.totalBalance, decimals);

					return (
						<div
							key={`${balance.coinType}-${index}`}
							style={{
								padding: '12px',
								backgroundColor: '#fff',
								border: '1px solid #e0e0e0',
								borderRadius: '6px',
								display: 'flex',
								alignItems: 'center',
								gap: '12px',
							}}
						>
							{getCoinIcon(balance.coinType, balance.metadata)}

							<div style={{ flex: 1 }}>
								<div
									style={{
										fontSize: '13px',
										fontWeight: '500',
										color: '#333',
										marginBottom: '2px',
									}}
								>
									{balance.name}
								</div>
								<div style={{ fontSize: '11px', color: '#999' }}>{balance.symbol}</div>
							</div>

							<div
								style={{
									fontSize: '14px',
									fontWeight: '600',
									color: '#333',
									fontFamily: 'monospace',
									textAlign: 'right',
								}}
							>
								{formattedBalance}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
