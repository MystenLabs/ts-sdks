// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { onMount, task } from 'nanostores';
import type { DAppKitStores } from '../store.js';
import type { StateStorage } from '../../utils/storage.js';
import { type UiWallet } from '@wallet-standard/ui';
import { getWalletUniqueIdentifier } from '../../utils/wallets.js';

import { internalConnectWallet } from '../actions/connect-wallet.js';

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

				const savedWalletAccount = await task(() => {
					return getSavedWalletAccount({
						storage,
						storageKey,
						wallets,
					});
				});

				if (savedWalletAccount) {
					$baseConnection.set({
						status: 'connected',
						currentAccount: savedWalletAccount,
					});
				}
			},
		);
	});
}

async function getSavedWalletAccount({
	storage,
	storageKey,
	wallets,
}: {
	storage: StateStorage;
	storageKey: string;
	wallets: readonly UiWallet[];
}) {
	const savedWalletIdAndAddress = await storage.getItem(storageKey);
	if (!savedWalletIdAndAddress) {
		return null;
	}

	const [savedWalletId, savedAccountAddress] = savedWalletIdAndAddress.split(':');
	if (!savedWalletId || !savedAccountAddress) {
		return null;
	}

	const targetWallet = wallets.find(
		(wallet) => getWalletUniqueIdentifier(wallet) === savedWalletId,
	);

	if (!targetWallet) {
		return null;
	}

	const existingAccount = targetWallet.accounts.find(
		(account) => account.address === savedAccountAddress,
	);

	if (existingAccount) {
		return existingAccount;
	}

	// For wallets that don't pre-populate the accounts array on page load,
	// we need to silently request authorization and get the account directly.
	const alreadyAuthorizedAccounts = await internalConnectWallet(targetWallet, [], {
		silent: true,
	});

	return (
		alreadyAuthorizedAccounts.find((account) => account.address === savedAccountAddress) ?? null
	);
}
