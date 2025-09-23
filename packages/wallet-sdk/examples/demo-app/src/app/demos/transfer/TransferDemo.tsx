// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit-react';
import { useState } from 'react';
import { useTransactionExecution } from '../../hooks/useTransactionExecution.js';
import { useCoinBalances } from '../../hooks/useCoinBalances.js';
import { useWalletAccounts } from '../../hooks/useWalletAccounts.js';
import { useTransferForm } from '../../hooks/useTransferForm.js';
import {
	createTransferAllSuiTransaction,
	createTransferSuiAmountTransaction,
	createTransferAllCoinsTransaction,
	createTransferCoinAmountTransaction,
} from './transactions.js';
import { Alert } from '../../components/ui/Alert.js';
import { Input } from '../../components/ui/Input.js';
import { Card, CardContent, CardHeader } from '../../components/ui/Card.js';
import { ConnectWalletPrompt } from '../../components/ui/ConnectWalletPrompt.js';
import { DemoLayout } from '../../components/ui/DemoLayout.js';
import { formatAddress, formatBalance } from '../../utils/format.js';

export function TransferDemo() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const { executeTransaction, isExecuting, error, setError } = useTransactionExecution();
	const { coinBalances, loadingBalances } = useCoinBalances(currentAccount?.address);
	const { walletAccounts } = useWalletAccounts();

	// Persistent form state using localStorage via custom hook
	const [formData, formActions] = useTransferForm();
	const { recipient, amount, transferAll, selectedCoinType } = formData;
	const { setRecipient, setAmount, setTransferAll, setSelectedCoinType } = formActions;
	
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [showAddressSelector, setShowAddressSelector] = useState(false);

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
			const isSui = selectedCoinType === '0x2::sui::SUI';

			let tx;
			if (transferAll) {
				if (isSui) {
					// Transfer all SUI
					tx = createTransferAllSuiTransaction({
						senderAddress: currentAccount.address,
						recipient,
						coinType: selectedCoinType,
					});
					await executeTransaction(tx);
					setSuccessMessage(`Successfully transferred all SUI to ${formatAddress(recipient)}`);
				} else {
					// Transfer all other coins
					if (!selectedCoin) {
						setError('Selected coin not found');
						return;
					}

					tx = await createTransferAllCoinsTransaction(
						{
							senderAddress: currentAccount.address,
							recipient,
							coinType: selectedCoinType,
						},
						suiClient,
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
					// Transfer specific SUI amount
					tx = createTransferSuiAmountTransaction({
						senderAddress: currentAccount.address,
						recipient,
						coinType: selectedCoinType,
						amount: amountNum,
					});
				} else {
					// Transfer specific amount of other coins
					if (!selectedCoin) {
						setError('Selected coin not found');
						return;
					}

					tx = await createTransferCoinAmountTransaction(
						{
							senderAddress: currentAccount.address,
							recipient,
							coinType: selectedCoinType,
							amount: amountNum,
							coinMetadata: selectedCoin.metadata,
						},
						suiClient,
					);
				}

				await executeTransaction(tx);
				setSuccessMessage(
					`Successfully transferred ${amount} ${selectedCoin?.symbol || 'tokens'} to ${formatAddress(recipient)}`,
				);
			}
		} catch (err) {
			console.error('Transfer failed:', err);
		}
	};

	if (!currentAccount) {
		return (
			<ConnectWalletPrompt
				icon="💸"
				description="Please connect your wallet to use the transfer demo"
			/>
		);
	}

	return (
		<DemoLayout>
			{error && <Alert type="error" message={error} onClose={() => setError(null)} />}
			{successMessage && (
				<Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
			)}

			<Card variant="elevated">
				<CardHeader>
					<h3 className="text-xl font-semibold text-gray-800 mb-2">Send Tokens</h3>
					<p className="text-gray-600">Transfer tokens to another address. Gas fees will apply.</p>
				</CardHeader>

				<CardContent className="space-y-6">
					{/* Coin Type Selector */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Coin Type</label>
						{loadingBalances ? (
							<div className="px-3 py-2.5 bg-gray-50 rounded-lg text-gray-500">
								Loading coin balances...
							</div>
						) : (
							<select
								value={selectedCoinType}
								onChange={(e) => setSelectedCoinType(e.target.value)}
								className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

					{/* Recipient Address */}
					<div className="relative">
						<div className="flex gap-2">
							<Input
								label="Recipient Address"
								type="text"
								value={recipient}
								onChange={(e) => setRecipient(e.target.value)}
								placeholder="0x... or select from your wallet"
								className="flex-1"
							/>
							<button
								onClick={() => setShowAddressSelector(!showAddressSelector)}
								className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								title="Select from wallet accounts"
							>
								📋
							</button>
						</div>

						{showAddressSelector && walletAccounts.length > 0 && (
							<div className="absolute top-full left-0 right-0 mt-2 border border-gray-200 bg-white rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
								{walletAccounts.map((account) => (
									<button
										key={account.address}
										onClick={() => {
											setRecipient(account.address);
											setShowAddressSelector(false);
										}}
										className="w-full p-3 text-left hover:bg-blue-50 transition-colors border-none cursor-pointer first:rounded-t-lg last:rounded-b-lg"
									>
										<div className="font-medium mb-1">{account.label}</div>
										<div className="text-sm text-gray-500">{formatAddress(account.address)}</div>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Transfer All Option */}
					<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
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
							className="mt-1"
						/>
						<label htmlFor="transferAll" className="text-sm text-gray-700 cursor-pointer">
							<span className="font-medium">Transfer All {selectedCoin?.symbol || 'tokens'}</span>
							<br />
							<span className="text-xs text-gray-500">
								{selectedCoinType === '0x2::sui::SUI'
									? 'Uses tx.gas function'
									: 'Transfers all coin objects'}
							</span>
						</label>
					</div>

					{/* Amount Input */}
					{!transferAll && (
						<Input
							label={`Amount (${selectedCoin?.symbol || 'tokens'})`}
							type="text"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.1"
						/>
					)}

					{/* Submit Button */}
					<button
						onClick={handleTransfer}
						disabled={isExecuting || !recipient || (!transferAll && !amount)}
						className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isExecuting
							? 'Transferring...'
							: transferAll
								? `Transfer All ${selectedCoin?.symbol || 'tokens'}`
								: `Transfer ${selectedCoin?.symbol || 'tokens'}`}
					</button>
				</CardContent>
			</Card>
		</DemoLayout>
	);
}
