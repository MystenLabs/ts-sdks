// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit-react';
import { useState, useEffect, useCallback } from 'react';
import type { CoinBalance, SuiObjectData } from '@mysten/sui/client';
import { ConnectWalletPrompt } from '../../components/ui/ConnectWalletPrompt.js';
import { DemoLayout } from '../../components/ui/DemoLayout.js';
import { formatBalance } from '../../utils/format.js';

export function WalletDemo() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const [balances, setBalances] = useState<CoinBalance[]>([]);
	const [nfts, setNfts] = useState<SuiObjectData[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchWalletData = useCallback(async () => {
		if (!currentAccount) return;

		setIsLoading(true);
		try {
			const balanceData = await suiClient.getAllBalances({
				owner: currentAccount.address,
			});
			setBalances(balanceData);

			const objects = await suiClient.getOwnedObjects({
				owner: currentAccount.address,
				options: {
					showContent: true,
					showDisplay: true,
					showType: true,
				},
			});

			const nftObjects = objects.data
				.filter((obj) => obj.data?.display?.data)
				.map((obj) => obj.data as SuiObjectData);

			setNfts(nftObjects);
		} catch (error) {
			console.error('Failed to fetch wallet data:', error);
		} finally {
			setIsLoading(false);
		}
	}, [currentAccount, suiClient]);

	useEffect(() => {
		fetchWalletData();
	}, [fetchWalletData]);

	if (!currentAccount) {
		return (
			<ConnectWalletPrompt icon="👛" description="Please connect your wallet to view your assets" />
		);
	}

	return (
		<DemoLayout maxWidth="lg">
			{/* Token Balances Section */}
			<div className="bg-white rounded-xl shadow-sm p-6">
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-xl font-semibold text-gray-800">💰 Token Balances</h3>
					<button
						onClick={fetchWalletData}
						disabled={isLoading}
						className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isLoading ? 'Loading...' : '🔄 Refresh'}
					</button>
				</div>

				{balances.length === 0 ? (
					<div className="text-center py-12 text-gray-500">
						<div className="text-4xl mb-4">💸</div>
						<p>No token balances found</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{balances.map((balance, index) => {
							const coinType = balance.coinType.split('::').pop() || 'Unknown';
							const formattedBalance = formatBalance(balance.totalBalance);

							return (
								<div
									key={`${balance.coinType}-${index}`}
									className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200"
								>
									<div className="text-lg font-semibold text-blue-800 mb-2">{coinType}</div>
									<div className="text-2xl font-bold text-blue-900 mb-2 font-mono">
										{formattedBalance}
									</div>
									<div className="text-xs text-blue-600 truncate">{balance.coinType}</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* NFTs Section */}
			<div className="bg-white rounded-xl shadow-sm p-6">
				<h3 className="text-xl font-semibold text-gray-800 mb-6">🎨 NFT Collection</h3>

				{nfts.length === 0 ? (
					<div className="text-center py-12 text-gray-500">
						<div className="text-4xl mb-4">🖼️</div>
						<p>No NFTs found in your wallet</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{nfts.map((nft) => {
							const display = nft.display?.data;
							return (
								<div
									key={nft.objectId}
									className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
								>
									<div className="aspect-square bg-gray-100">
										{display?.image_url ? (
											<img
												src={display.image_url}
												alt={display?.name || 'NFT'}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-gray-400">
												<div className="text-center">
													<div className="text-2xl mb-2">🖼️</div>
													<div className="text-sm">No Image</div>
												</div>
											</div>
										)}
									</div>
									<div className="p-3">
										<div className="font-medium text-gray-800 truncate mb-1">
											{display?.name || 'Unnamed NFT'}
										</div>
										{display?.description && (
											<div className="text-sm text-gray-500 line-clamp-2">
												{display.description}
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</DemoLayout>
	);
}
