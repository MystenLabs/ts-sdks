// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { onMount, task } from 'nanostores';
import type { DAppKitStores } from '../store.js';
import type { StateStorage } from '../../utils/storage.js';
import type { UiWallet } from '@wallet-standard/ui';
import { getWalletUniqueIdentifier } from '../../utils/wallets.js';

import {
	getSupportedIntentsFromFeature,
	internalConnectWallet,
} from '../actions/connect-wallet.js';
import type { Networks } from '../../utils/networks.js';

/**
 * Attempts to connect to a previously authorized wallet account on mount and when new wallets are registered.
 */
export function autoConnectWallet({
	networks,
	stores: { $baseConnection, $compatibleWallets },
	storage,
	storageKey,
}: {
	networks: Networks;
	stores: DAppKitStores;
	storage: StateStorage;
	storageKey: string;
}) {
	onMount($compatibleWallets, () => {
		return $compatibleWallets.subscribe(
			async (wallets, oldWallets: readonly UiWallet[] | undefined) => {
				if (oldWallets && oldWallets.length > wallets.length) return;

				const connection = $baseConnection.get();
				if (connection.status !== 'disconnected') return;

				const savedWalletAccount = await task(() => {
					return getSavedWalletAccount({
						networks,
						storage,
						storageKey,
						wallets,
					});
				});

				if (savedWalletAccount) {
					$baseConnection.set({
						status: 'connected',
						currentAccount: savedWalletAccount.account,
						supportedIntents: savedWalletAccount.supportedIntents,
					});
				}
			},
		);
	});
}

async function getSavedWalletAccount({
	networks,
	storage,
	storageKey,
	wallets,
}: {
	networks: Networks;
	storage: StateStorage;
	storageKey: string;
	wallets: readonly UiWallet[];
}) {
	const savedWalletIdAndAddress = await storage.getItem(storageKey);
	if (!savedWalletIdAndAddress) {
		return null;
	}

	const [savedWalletId, savedAccountAddress, savedIntents] = savedWalletIdAndAddress.split(':');
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
		const supportedIntents = savedIntents ? savedIntents.split(',') : null;

		return {
			account: existingAccount,
			supportedIntents: supportedIntents ?? (await getSupportedIntentsFromFeature(targetWallet)),
		};
	}

	// For wallets that don't pre-populate the accounts array on page load,
	// we need to silently request authorization and get the account directly.
	const { accounts: alreadyAuthorizedAccounts, supportedIntents } = await internalConnectWallet(
		targetWallet,
		networks,
		{
			silent: true,
		},
	);

	const account = alreadyAuthorizedAccounts.find(
		(account) => account.address === savedAccountAddress,
	);

	return account ? { account, supportedIntents } : null;
}
