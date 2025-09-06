// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { onMount, task } from 'nanostores';
import type { DAppKitStores } from '../store.js';
import type { StateStorage } from '../../utils/storage.js';
import type { UiWallet } from '@wallet-standard/ui';
import { getWalletUniqueIdentifier } from '../../utils/wallets.js';

/**
 * Attempts to connect to a previously authorized wallet account on mount and when new wallets are registered.
 */
export function autoConnectWallet({
	stores: { $baseConnection, $compatibleWallets },
	storage,
	storageKey,
}: {
	stores: DAppKitStores;
	storage: StateStorage;
	storageKey: string;
}) {
	onMount($compatibleWallets, () => {
		return $compatibleWallets.listen(
			async (wallets, oldWallets: readonly UiWallet[] | undefined) => {
				if (oldWallets && oldWallets.length > wallets.length) return;

				const connection = $baseConnection.get();
				if (connection.status !== 'disconnected') return;

				const savedWalletData = await task(() => {
					return getSavedWalletData({
						storage,
						storageKey,
						wallets,
					});
				});

				if (savedWalletData) {
					$baseConnection.set({
						status: 'connected',
						currentAccount: savedWalletData.account,
						supportedIntents: savedWalletData.supportedIntents,
					});
				}
			},
		);
	});
}

async function getSavedWalletData({
	storage,
	storageKey,
	wallets,
}: {
	storage: StateStorage;
	storageKey: string;
	wallets: readonly UiWallet[];
}) {
	const savedData = await storage.getItem(storageKey);
	if (!savedData) {
		return null;
	}

	let accountKey: string;
	let supportedIntents: string[] = [];

	// Handle both new JSON format and legacy simple string format
	try {
		const parsedData = JSON.parse(savedData);
		if (parsedData.accountKey && Array.isArray(parsedData.supportedIntents)) {
			accountKey = parsedData.accountKey;
			supportedIntents = parsedData.supportedIntents;
		} else {
			// Fall back to legacy format
			accountKey = savedData;
		}
	} catch {
		// Legacy format (simple string)
		accountKey = savedData;
	}

	const [savedWalletId, savedAccountAddress] = accountKey.split(':');
	if (!savedWalletId || !savedAccountAddress) {
		return null;
	}

	for (const wallet of wallets) {
		if (getWalletUniqueIdentifier(wallet) === savedWalletId) {
			for (const account of wallet.accounts) {
				if (account.address === savedAccountAddress) {
					return {
						account,
						supportedIntents,
					};
				}
			}
		}
	}

	return null;
}
