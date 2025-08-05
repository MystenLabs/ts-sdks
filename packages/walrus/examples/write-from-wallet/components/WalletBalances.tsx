// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useDAppKit, useSuiClient } from '@mysten/dapp-kit-react';
import { useState, useEffect, useCallback } from 'react';
import { fromBase64, MIST_PER_SUI, parseStructTag } from '@mysten/sui/utils';
import { coinWithBalance, Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { TESTNET_WALRUS_PACKAGE_CONFIG } from '../../../src/index.js';

interface WalletBalancesProps {
	onError: (error: string) => void;
	onTransaction: (digest: string) => void;
	isDisabled?: boolean;
	keypairAddress?: string;
	secretKey?: string;
	refreshTrigger?: number;
}

export function WalletBalances({
	onError,
	onTransaction,
	isDisabled = false,
	keypairAddress,
	secretKey,
	refreshTrigger,
}: WalletBalancesProps) {
	const currentAccount = useCurrentAccount();
	const dAppKit = useDAppKit();
	const suiClient = useSuiClient();
	const [isFunding, setIsFunding] = useState(false);
	const [isReturning, setIsReturning] = useState(false);
	const [isSwapping, setIsSwapping] = useState(false);
	const [walBalance, setWalBalance] = useState<string>('0');
	const [suiBalance, setSuiBalance] = useState<string>('0');

	const formatBalance = (balance: string, decimals: number = 9): string => {
		const num = Number(balance) / Math.pow(10, decimals);
		return num.toFixed(4);
	};

	useEffect(() => {
		async function fetchBalances() {
			const addressToCheck = keypairAddress || currentAccount?.address;
			if (!addressToCheck) return;

			const [suiBal, walBal] = await Promise.all([
				suiClient.core.getBalance({ address: addressToCheck, coinType: '0x2::sui::SUI' }),
				suiClient.core.getBalance({
					address: addressToCheck,
					coinType: `0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL`,
				}),
			]);

			setSuiBalance(suiBal.balance.balance.toString());
			setWalBalance(walBal.balance.balance.toString());
		}

		fetchBalances().catch(onError);
	}, [refreshTrigger, keypairAddress, currentAccount, suiClient, onError]);

	const fundKeypair = useCallback(async () => {
		if (!currentAccount || !keypairAddress) return;

		setIsFunding(true);
		onError('');

		try {
			// Create a transaction to send 1 SUI to the keypair
			const tx = new Transaction();
			const [coin] = tx.splitCoins(tx.gas, [1n * MIST_PER_SUI]);
			tx.transferObjects([coin], keypairAddress);

			// Sign and execute the transaction
			const signedTx = await dAppKit.signTransaction({ transaction: tx });
			const result = await suiClient.core.executeTransaction({
				transaction: fromBase64(signedTx.bytes),
				signatures: [signedTx.signature],
			});

			onTransaction(result.transaction.digest);
		} catch (error) {
			const errorMessage = `Failed to fund keypair: ${error instanceof Error ? error.message : 'Unknown error'}`;
			onError(errorMessage);
		} finally {
			setIsFunding(false);
		}
	}, [currentAccount, keypairAddress, dAppKit, suiClient, onError, onTransaction]);

	const returnFunds = useCallback(async () => {
		if (!currentAccount || !secretKey || !keypairAddress) return;

		setIsReturning(true);

		try {
			const keypair = Ed25519Keypair.fromSecretKey(secretKey);
			const tx = new Transaction();
			tx.setSender(keypairAddress);

			// Get all coins and transfer them back to the connected wallet
			const coins = await suiClient.core.getCoins({
				address: keypairAddress,
				coinType: '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL',
			});

			if (coins.objects.length > 0) {
				// Merge coins of the same type if there are multiple
				if (coins.objects.length > 1) {
					tx.mergeCoins(
						coins.objects[0].id,
						coins.objects.slice(1).map((c) => c.id),
					);
				}
				tx.transferObjects([tx.gas, coins.objects[0].id], currentAccount.address);
			}

			const { digest } = await keypair.signAndExecuteTransaction({
				transaction: tx,
				client: suiClient,
			});

			// Wait for transaction to be processed
			await suiClient.core.waitForTransaction({
				digest,
			});

			onTransaction(digest);
		} catch (error) {
			const errorMessage = `Failed to return funds: ${error instanceof Error ? error.message : 'Unknown error'}`;
			onError(errorMessage);
		} finally {
			setIsReturning(false);
		}
	}, [currentAccount, secretKey, keypairAddress, suiClient, onError, onTransaction]);

	const swapSuiForWal = useCallback(async () => {
		if (!secretKey || !keypairAddress) return;

		setIsSwapping(true);

		try {
			const keypair = Ed25519Keypair.fromSecretKey(secretKey);
			const tx = new Transaction();
			tx.setSender(keypairAddress);

			const { object: exchange } = await suiClient.core.getObject({
				objectId: TESTNET_WALRUS_PACKAGE_CONFIG.exchangeIds[0],
			});

			const exchangePackageId = parseStructTag(exchange.type).address;
			const wal = tx.moveCall({
				package: exchangePackageId,
				module: 'wal_exchange',
				function: 'exchange_all_for_wal',
				arguments: [
					tx.object(TESTNET_WALRUS_PACKAGE_CONFIG.exchangeIds[0]),
					coinWithBalance({
						balance: MIST_PER_SUI / 2n,
					}),
				],
			});

			tx.transferObjects([wal], keypairAddress);

			// Sign and execute with the keypair
			const txBytes = await tx.build({ client: suiClient });
			const signedTx = await keypair.signTransaction(txBytes);
			const result = await suiClient.core.executeTransaction({
				transaction: txBytes,
				signatures: [signedTx.signature],
			});

			onTransaction(result.transaction.digest);
		} catch (error) {
			console.error('Swap failed:', error);
			onError(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsSwapping(false);
		}
	}, [secretKey, keypairAddress, suiClient, onError, onTransaction]);

	return (
		<div style={{ marginBottom: '15px' }}>
			<h3 style={{ margin: '0 0 10px 0' }}>
				{keypairAddress ? 'Keypair Balances' : 'Wallet Balances'}
			</h3>
			<div style={{ marginBottom: '10px' }}>
				<strong>SUI:</strong> {formatBalance(suiBalance)} SUI
				<span style={{ margin: '0 15px' }}>•</span>
				<strong>WAL:</strong> {formatBalance(walBalance)} WAL
			</div>
			<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
				<button
					type="button"
					onClick={fundKeypair}
					disabled={isFunding || isDisabled || !keypairAddress}
					style={{
						padding: '8px 16px',
						backgroundColor: isFunding || isDisabled || !keypairAddress ? '#ccc' : '#007bff',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: isFunding || isDisabled || !keypairAddress ? 'not-allowed' : 'pointer',
						fontSize: '14px',
					}}
				>
					{isFunding ? 'Funding...' : 'Fund with 1 SUI'}
				</button>

				<button
					type="button"
					onClick={swapSuiForWal}
					disabled={isSwapping || isDisabled || !secretKey}
					style={{
						padding: '8px 16px',
						backgroundColor: isSwapping || isDisabled || !secretKey ? '#ccc' : '#28a745',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: isSwapping || isDisabled || !secretKey ? 'not-allowed' : 'pointer',
						fontSize: '14px',
					}}
				>
					{isSwapping ? 'Swapping...' : 'Swap 0.5 SUI for WAL'}
				</button>

				<button
					type="button"
					onClick={returnFunds}
					disabled={isReturning || isDisabled || !secretKey}
					style={{
						padding: '8px 16px',
						backgroundColor: isReturning || isDisabled || !secretKey ? '#ccc' : '#dc3545',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: isReturning || isDisabled || !secretKey ? 'not-allowed' : 'pointer',
						fontSize: '14px',
					}}
				>
					{isReturning ? 'Returning...' : 'Return All Funds'}
				</button>
			</div>
		</div>
	);
}
