// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createContext, createElement, useContext } from 'react';
import type { ReactNode } from 'react';

import type { DevWallet } from '../wallet/dev-wallet.js';

export const DevWalletContext = createContext<DevWallet | null>(null);

export interface DevWalletProviderProps {
	wallet: DevWallet;
	children: ReactNode;
}

/**
 * Provides a DevWallet instance to descendant components via React context.
 *
 * Use `useDevWalletInstance()` in child components to access the wallet.
 */
export function DevWalletProvider({ wallet, children }: DevWalletProviderProps) {
	return createElement(DevWalletContext.Provider, { value: wallet }, children);
}

/**
 * Access the DevWallet instance from context, or use the provided instance directly.
 *
 * @param wallet - Optional wallet instance. If provided, context is bypassed.
 * @throws If no wallet is provided and no DevWalletProvider is found.
 */
export function useDevWalletInstance(wallet?: DevWallet): DevWallet {
	const contextValue = useContext(DevWalletContext);

	if (wallet) {
		return wallet;
	}

	if (!contextValue) {
		throw new Error(
			'Could not find DevWalletContext. Ensure that you have set up the DevWalletProvider.',
		);
	}

	return contextValue;
}
