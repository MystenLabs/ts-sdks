// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit-react';
import { useState, useEffect, useCallback } from 'react';
import type { CoinBalance, SuiObjectData } from '@mysten/sui/client';
import { formatBalance } from '../utils/format.js';

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
			<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
				<p>Please connect your wallet to view your assets</p>
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '12px',
					padding: '24px',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '16px',
					}}
				>
					<h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Token Balances</h3>
					<button
						onClick={fetchWalletData}
						disabled={isLoading}
						style={{
							backgroundColor: '#f5f5f5',
							border: '1px solid #ddd',
							borderRadius: '6px',
							padding: '6px 12px',
							cursor: isLoading ? 'not-allowed' : 'pointer',
							fontSize: '13px',
							fontWeight: '500',
						}}
					>
						{isLoading ? 'Loading...' : 'Refresh'}
					</button>
				</div>

				{balances.length === 0 ? (
					<div
						style={{
							padding: '20px',
							backgroundColor: '#f9f9f9',
							borderRadius: '8px',
							textAlign: 'center',
							color: '#666',
						}}
					>
						No token balances found
					</div>
				) : (
					<div style={{ display: 'grid', gap: '8px' }}>
						{balances.map((balance, index) => {
							const coinType = balance.coinType.split('::').pop() || 'Unknown';
							const formattedBalance = formatBalance(balance.totalBalance);

							return (
								<div
									key={`${balance.coinType}-${index}`}
									style={{
										padding: '12px 16px',
										backgroundColor: '#fff',
										border: '1px solid #e0e0e0',
										borderRadius: '8px',
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<div>
										<div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
											{coinType}
										</div>
										<div
											style={{
												fontSize: '11px',
												color: '#999',
												marginTop: '2px',
												fontFamily: 'monospace',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												maxWidth: '300px',
											}}
										>
											{balance.coinType}
										</div>
									</div>
									<div
										style={{
											fontSize: '16px',
											fontWeight: '600',
											color: '#333',
											fontFamily: 'monospace',
										}}
									>
										{formattedBalance}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '12px',
					padding: '24px',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
				}}
			>
				<h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>NFTs</h3>

				{nfts.length === 0 ? (
					<div
						style={{
							padding: '20px',
							backgroundColor: '#f9f9f9',
							borderRadius: '8px',
							textAlign: 'center',
							color: '#666',
						}}
					>
						No NFTs found
					</div>
				) : (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
							gap: '12px',
						}}
					>
						{nfts.map((nft) => {
							const display = nft.display?.data;
							return (
								<div
									key={nft.objectId}
									style={{
										border: '1px solid #e0e0e0',
										borderRadius: '8px',
										overflow: 'hidden',
										backgroundColor: '#fff',
										transition: 'transform 0.2s ease',
										cursor: 'pointer',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'scale(1.02)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = 'scale(1)';
									}}
								>
									{display?.image_url ? (
										<img
											src={display.image_url}
											alt={display?.name || 'NFT'}
											style={{
												width: '100%',
												height: '150px',
												objectFit: 'cover',
											}}
										/>
									) : (
										<div
											style={{
												width: '100%',
												height: '150px',
												backgroundColor: '#f0f0f0',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: '#999',
												fontSize: '12px',
											}}
										>
											No Image
										</div>
									)}
									<div style={{ padding: '8px' }}>
										<div
											style={{
												fontSize: '13px',
												fontWeight: '600',
												color: '#333',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{display?.name || 'Unnamed NFT'}
										</div>
										{display?.description && (
											<div
												style={{
													fontSize: '11px',
													color: '#666',
													marginTop: '4px',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
												}}
											>
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
		</div>
	);
}
