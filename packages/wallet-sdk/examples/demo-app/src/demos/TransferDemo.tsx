// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useConnection, useSuiClient } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState, useEffect } from 'react';
import { useTransactionExecution } from '../hooks/useTransactionExecution.js';
import { useLocalStorageString, useLocalStorageBoolean } from '../hooks/useLocalStorage.js';
import { Alert } from '../components/Alert.js';
import { formatAddress, formatBalance } from '../utils/format.js';
import type { CoinBalance, CoinMetadata } from '@mysten/sui/client';
import { autoApprovalPolicy } from '@mysten/wallet-sdk';
import { createTransferPolicy } from '../utils/policyHelpers.js';

interface CoinWithMetadata extends CoinBalance {
	metadata?: CoinMetadata | null;
	name: string;
	symbol: string;
}

export function TransferDemo() {
	const currentAccount = useCurrentAccount();
	const connection = useConnection();
	const suiClient = useSuiClient();
	const { executeTransaction, isExecuting, error, setError } = useTransactionExecution();
	// Persistent form state using localStorage
	const [recipient, setRecipient] = useLocalStorageString('transfer_demo_recipient', '');
	const [amount, setAmount] = useLocalStorageString('transfer_demo_amount', '');
	const [transferAll, setTransferAll] = useLocalStorageBoolean('transfer_demo_transfer_all', false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [walletAccounts, setWalletAccounts] = useState<Array<{ address: string; label?: string }>>(
		[],
	);
	const [showAddressSelector, setShowAddressSelector] = useState(false);
	const [coinBalances, setCoinBalances] = useState<CoinWithMetadata[]>([]);
	const [selectedCoinType, setSelectedCoinType] = useLocalStorageString(
		'transfer_demo_coin_type',
		'0x2::sui::SUI',
	);
	const [loadingBalances, setLoadingBalances] = useState(false);

	// Load wallet accounts
	useEffect(() => {
		const loadWalletAccounts = async () => {
			if (connection.wallet && currentAccount) {
				// Get wallet accounts
				try {
					const accounts = connection.wallet.accounts;
					const accountsWithLabels = accounts.map((account, index: number) => ({
						address: account.address,
						label: account.label || `Account ${index + 1}`,
					}));
					setWalletAccounts(accountsWithLabels);
				} catch (err) {
					console.warn('Failed to load wallet accounts:', err);
					// Fallback to current account
					setWalletAccounts([{ address: currentAccount.address, label: 'Current Account' }]);
				}
			}
		};

		loadWalletAccounts();
	}, [connection.wallet, currentAccount]);

	// Load coin balances
	useEffect(() => {
		const loadCoinBalances = async () => {
			if (!currentAccount || !suiClient) return;

			setLoadingBalances(true);
			try {
				const balanceData = await suiClient.getAllBalances({
					owner: currentAccount.address,
				});

				// Filter out zero balances and add metadata
				const balancesWithMetadata = await Promise.all(
					balanceData
						.filter((balance) => BigInt(balance.totalBalance) > 0n)
						.map(async (balance) => {
							let metadata: CoinMetadata | null = null;
							let name: string;
							let symbol: string;

							if (balance.coinType === '0x2::sui::SUI') {
								name = 'Sui';
								symbol = 'SUI';
							} else {
								try {
									metadata = await suiClient.getCoinMetadata({ coinType: balance.coinType });
									name = metadata?.name || balance.coinType.split('::').pop() || 'Unknown';
									symbol = metadata?.symbol || 'UNKNOWN';
								} catch (error) {
									console.warn('Failed to fetch metadata for', balance.coinType);
									name = balance.coinType.split('::').pop() || 'Unknown';
									symbol = balance.coinType.split('::').pop()?.toUpperCase() || 'UNKNOWN';
								}
							}

							return {
								...balance,
								metadata,
								name,
								symbol,
							} as CoinWithMetadata;
						}),
				);

				// Sort: SUI first, then by balance value
				const sortedBalances = balancesWithMetadata.sort((a, b) => {
					if (a.coinType === '0x2::sui::SUI') return -1;
					if (b.coinType === '0x2::sui::SUI') return 1;
					return Number(BigInt(b.totalBalance) - BigInt(a.totalBalance));
				});

				setCoinBalances(sortedBalances);
			} catch (error) {
				console.error('Failed to fetch coin balances:', error);
			} finally {
				setLoadingBalances(false);
			}
		};

		loadCoinBalances();
	}, [currentAccount, suiClient]);

	const selectedCoin = coinBalances.find((coin) => coin.coinType === selectedCoinType);

	const handleTransfer = async () => {
		if (!currentAccount) return;
		if (!recipient) {
			setError('Please select a recipient address');
			return;
		}

		if (!transferAll && !amount) {
			setError('Please enter an amount or select "Transfer All"');
			return;
		}

		try {
			const tx = new Transaction();

			// Add AutoApprovalPolicy intent with realistic policy
			const transferAmount = parseFloat(amount) || 1.0;
			const policyData = createTransferPolicy(
				Math.max(transferAmount * 2, 0.25), // Budget is at least 2x the transfer amount or 0.25 SUI minimum
				10, // Allow up to 10 transactions
				24, // Valid for 24 hours
			);

			tx.add(
				autoApprovalPolicy(policyData, (data) => {
					console.log('🔒 Wallet: Auto-approval policy detected:', data);
				}),
			);

			const isSui = selectedCoinType === '0x2::sui::SUI';

			if (transferAll) {
				if (isSui) {
					// Transfer all available gas for SUI
					tx.transferObjects([tx.gas], recipient);
					await executeTransaction(tx);
					setSuccessMessage(`Successfully transferred all SUI to ${formatAddress(recipient)}`);
				} else {
					// Transfer all available balance for other coins
					if (!selectedCoin) {
						setError('Selected coin not found');
						return;
					}

					// Get all coins of this type
					const coins = await suiClient.getCoins({
						owner: currentAccount.address,
						coinType: selectedCoinType,
					});

					if (coins.data.length === 0) {
						setError('No coins of this type found');
						return;
					}

					// Transfer all coin objects
					const coinObjects = coins.data.map((coin) => coin.coinObjectId);
					tx.transferObjects(
						coinObjects.map((id) => tx.object(id)),
						recipient,
					);

					await executeTransaction(tx);
					setSuccessMessage(
						`Successfully transferred all ${selectedCoin.symbol} to ${formatAddress(recipient)}`,
					);
				}
			} else {
				const amountNum = parseFloat(amount);
				if (isNaN(amountNum) || amountNum <= 0) {
					setError('Please enter a valid amount greater than 0');
					return;
				}

				if (isSui) {
					// SUI transfer with splitCoins from gas
					const [coin] = tx.splitCoins(tx.gas, [amountNum * 1_000_000_000]);
					tx.transferObjects([coin], recipient);
				} else {
					// Other coin transfer
					if (!selectedCoin) {
						setError('Selected coin not found');
						return;
					}

					const decimals = selectedCoin.metadata?.decimals ?? 6;
					const transferAmount = BigInt(amountNum * Math.pow(10, decimals));

					// Get coins of this type
					const coins = await suiClient.getCoins({
						owner: currentAccount.address,
						coinType: selectedCoinType,
					});

					if (coins.data.length === 0) {
						setError('No coins of this type found');
						return;
					}

					// Use the first coin and split if needed
					const primaryCoin = tx.object(coins.data[0].coinObjectId);

					if (transferAmount < BigInt(coins.data[0].balance)) {
						// Split the coin
						const [splitCoin] = tx.splitCoins(primaryCoin, [transferAmount]);
						tx.transferObjects([splitCoin], recipient);
					} else if (transferAmount === BigInt(coins.data[0].balance)) {
						// Transfer the whole coin
						tx.transferObjects([primaryCoin], recipient);
					} else {
						// Need to merge multiple coins first
						const allCoinObjects = coins.data.map((coin) => tx.object(coin.coinObjectId));
						if (allCoinObjects.length > 1) {
							tx.mergeCoins(allCoinObjects[0], allCoinObjects.slice(1));
						}
						const [splitCoin] = tx.splitCoins(allCoinObjects[0], [transferAmount]);
						tx.transferObjects([splitCoin], recipient);
					}
				}

				await executeTransaction(tx);
				setSuccessMessage(
					`Successfully transferred ${amount} ${selectedCoin?.symbol || 'tokens'} to ${formatAddress(recipient)}`,
				);
			}

			// Refresh coin balances after transfer (keep form inputs intact)
			setTimeout(() => {
				const refreshBalances = async () => {
					if (currentAccount && suiClient) {
						const balanceData = await suiClient.getAllBalances({
							owner: currentAccount.address,
						});
						// Re-process balances (simplified version)
						const filteredBalances = balanceData.filter(
							(balance) => BigInt(balance.totalBalance) > 0n,
						);
						const balancesWithBasicInfo = filteredBalances.map((balance) => ({
							...balance,
							name:
								balance.coinType === '0x2::sui::SUI'
									? 'Sui'
									: balance.coinType.split('::').pop() || 'Unknown',
							symbol:
								balance.coinType === '0x2::sui::SUI'
									? 'SUI'
									: balance.coinType.split('::').pop()?.toUpperCase() || 'UNKNOWN',
						}));
						setCoinBalances(balancesWithBasicInfo as CoinWithMetadata[]);
					}
				};
				refreshBalances();
			}, 2000); // Wait 2 seconds for transaction to be processed
		} catch (err) {
			console.error('Transfer failed:', err);
		}
	};

	if (!currentAccount) {
		return (
			<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
				<p>Please connect your wallet to use the transfer demo</p>
			</div>
		);
	}

	return (
		<div>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '12px',
					padding: '32px',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
					maxWidth: '500px',
					margin: '0 auto',
				}}
			>
				<h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#333' }}>
					Send Tokens
				</h3>
				<p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
					Transfer tokens to another address. Gas fees will apply.
				</p>

				{error && <Alert type="error" message={error} onClose={() => setError(null)} />}
				{successMessage && (
					<Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
				)}

				<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					{/* Coin Type Selector */}
					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '8px',
								fontSize: '14px',
								fontWeight: '500',
								color: '#333',
							}}
						>
							Coin Type
						</label>
						{loadingBalances ? (
							<div style={{ padding: '10px 12px', color: '#666', fontSize: '14px' }}>
								Loading coin balances...
							</div>
						) : (
							<select
								value={selectedCoinType}
								onChange={(e) => setSelectedCoinType(e.target.value)}
								style={{
									width: '100%',
									padding: '10px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
									fontSize: '14px',
									backgroundColor: 'white',
									cursor: 'pointer',
									boxSizing: 'border-box',
								}}
							>
								{coinBalances.map((coin) => (
									<option key={coin.coinType} value={coin.coinType}>
										{coin.name} ({coin.symbol}) -{' '}
										{formatBalance(
											coin.totalBalance,
											coin.metadata?.decimals ?? (coin.coinType === '0x2::sui::SUI' ? 9 : 6),
										)}{' '}
										{coin.symbol}
									</option>
								))}
							</select>
						)}
					</div>

					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '8px',
								fontSize: '14px',
								fontWeight: '500',
								color: '#333',
							}}
						>
							Recipient Address
						</label>
						<div style={{ display: 'flex', gap: '8px' }}>
							<input
								type="text"
								value={recipient}
								onChange={(e) => setRecipient(e.target.value)}
								placeholder="0x... or select from your wallet"
								style={{
									flex: 1,
									padding: '10px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
									fontSize: '14px',
									fontFamily: 'monospace',
									boxSizing: 'border-box',
								}}
							/>
							<button
								onClick={() => setShowAddressSelector(!showAddressSelector)}
								style={{
									padding: '10px 16px',
									backgroundColor: '#f5f5f5',
									border: '1px solid #ddd',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px',
								}}
							>
								📋
							</button>
						</div>

						{showAddressSelector && walletAccounts.length > 0 && (
							<div
								style={{
									marginTop: '8px',
									border: '1px solid #ddd',
									borderRadius: '6px',
									backgroundColor: '#fafafa',
									maxHeight: '200px',
									overflowY: 'auto',
								}}
							>
								{walletAccounts.map((account, index) => (
									<button
										key={account.address}
										onClick={() => {
											setRecipient(account.address);
											setShowAddressSelector(false);
										}}
										style={{
											width: '100%',
											padding: '12px',
											border: 'none',
											backgroundColor: 'transparent',
											textAlign: 'left',
											cursor: 'pointer',
											borderBottom: index < walletAccounts.length - 1 ? '1px solid #eee' : 'none',
										}}
										onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e3f2fd')}
										onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
									>
										<div style={{ fontWeight: '500', marginBottom: '4px' }}>{account.label}</div>
										<div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
											{formatAddress(account.address)}
										</div>
									</button>
								))}
							</div>
						)}
					</div>

					<div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
							<input
								type="checkbox"
								id="transferAll"
								checked={transferAll}
								onChange={(e) => {
									setTransferAll(e.target.checked);
									if (e.target.checked) {
										setAmount('');
									}
								}}
							/>
							<label
								htmlFor="transferAll"
								style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}
							>
								Transfer All {selectedCoin?.symbol || 'tokens'}{' '}
								{selectedCoinType === '0x2::sui::SUI' ? '(uses tx.gas)' : '(all coin objects)'}
							</label>
						</div>

						{!transferAll && (
							<div>
								<label
									style={{
										display: 'block',
										marginBottom: '8px',
										fontSize: '14px',
										fontWeight: '500',
										color: '#333',
									}}
								>
									Amount ({selectedCoin?.symbol || 'tokens'})
								</label>
								<input
									type="text"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									placeholder="0.1"
									style={{
										width: '100%',
										padding: '10px 12px',
										border: '1px solid #ddd',
										borderRadius: '6px',
										fontSize: '14px',
										boxSizing: 'border-box',
									}}
								/>
							</div>
						)}
					</div>

					<button
						onClick={handleTransfer}
						disabled={isExecuting || !recipient || (!transferAll && !amount)}
						style={{
							backgroundColor:
								isExecuting || !recipient || (!transferAll && !amount) ? '#90caf9' : '#2196F3',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							padding: '12px 24px',
							cursor:
								isExecuting || !recipient || (!transferAll && !amount) ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							opacity: isExecuting || !recipient || (!transferAll && !amount) ? 0.7 : 1,
							transition: 'all 0.2s ease',
						}}
					>
						{isExecuting
							? 'Transferring...'
							: transferAll
								? `Transfer All ${selectedCoin?.symbol || 'tokens'}`
								: `Transfer ${selectedCoin?.symbol || 'tokens'}`}
					</button>
				</div>
			</div>
		</div>
	);
}
