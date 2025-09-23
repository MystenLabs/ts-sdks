// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { createContext, useContext, useRef, useEffect, useState } from 'react';
import type { SuiChain } from '@mysten/wallet-standard';
import { SUI_TESTNET_CHAIN } from '@mysten/wallet-standard';
import { getWallets } from '@mysten/wallet-standard';
import { DemoWalletImpl } from '../core/DemoWalletImpl.js';
import type { WalletRequest } from '../core/DemoWalletImpl.js';
import { useWalletAccount } from '../hooks/useWalletAccount.js';

interface WalletContextType {
	walletInstance: DemoWalletImpl | null;
	activeNetwork: SuiChain;
	setActiveNetwork: (network: SuiChain) => void;
	walletRequest: WalletRequest | null;
	setWalletRequest: (request: WalletRequest | null) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
	const context = useContext(WalletContext);
	if (!context) {
		throw new Error('useWallet must be used within a WalletProvider');
	}
	return context;
}

interface WalletProviderProps {
	children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
	const { accounts, activeAccount, activeKeypair, keypairs } = useWalletAccount();

	const walletRef = useRef<DemoWalletImpl | null>(null);
	const [walletRequest, setWalletRequest] = useState<WalletRequest | null>(null);
	const [activeNetwork, setActiveNetwork] = useState<SuiChain>(SUI_TESTNET_CHAIN);

	// Register wallet once on mount, but only when we have accounts
	useEffect(() => {
		if (!activeKeypair || !activeAccount) return;

		// Only create wallet if it doesn't exist
		if (!walletRef.current) {
			// Create demo wallet instance with all accounts and keypairs
			const wallet = new DemoWalletImpl(
				activeKeypair,
				activeAccount,
				setWalletRequest,
				accounts,
				keypairs,
				activeNetwork,
			);

			// Register the wallet
			const walletsApi = getWallets();
			const unregister = walletsApi.register(wallet);

			walletRef.current = wallet;

			console.warn(
				'Your application is currently using the demo wallet. Make sure that this wallet is disabled in production.',
			);

			// Store unregister function for cleanup
			walletRef.current.unregister = unregister;
		} else {
			// Wallet exists, only update which account is used for signing internally
			walletRef.current.updateSigningAccount(activeKeypair);

			// Only update available accounts when the accounts list actually changes
			if (walletRef.current.accounts.length !== accounts.length) {
				walletRef.current.updateAvailableAccounts(accounts, keypairs);
			}
		}

		// Update the active network
		if (walletRef.current && walletRef.current.activeNetwork !== activeNetwork) {
			walletRef.current.updateActiveNetwork(activeNetwork);
		}
	}, [activeKeypair, activeAccount, accounts, keypairs, activeNetwork]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (walletRef.current?.unregister) {
				walletRef.current.unregister();
			}
		};
	}, []);

	// Handle network changes
	const handleSetActiveNetwork = (network: SuiChain) => {
		setActiveNetwork(network);
		if (walletRef.current) {
			walletRef.current.updateActiveNetwork(network);
		}
	};

	return (
		<WalletContext.Provider
			value={{
				walletInstance: walletRef.current,
				activeNetwork,
				setActiveNetwork: handleSetActiveNetwork,
				walletRequest,
				setWalletRequest,
			}}
		>
			{children}
		</WalletContext.Provider>
	);
}
