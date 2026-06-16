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
 * How long to keep advertising the `reconnecting` state while waiting for a saved
 * wallet to register before giving up. This bounds the restore window so consumers
 * don't wait forever when the saved wallet was uninstalled or never registers.
 */
export const AUTO_CONNECT_RESTORE_TIMEOUT = 5000;

/**
 * Attempts to connect to a previously authorized wallet account on mount and when new wallets are registered.
 *
 * To let consumers distinguish "restoring a saved session" from "logged out" during
 * the async restore window, this eagerly moves the connection into the `reconnecting`
 * state on mount whenever a persisted session exists — even before the saved wallet
 * has registered — and settles back to `disconnected` if the restore can't complete.
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
		let done = false;
		let unsubscribe: (() => void) | undefined;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		// Terminal: we've either restored the session or determined there's nothing
		// to restore. Stop listening for further wallet registrations.
		const stop = () => {
			done = true;
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			unsubscribe?.();
		};

		// Bounded fallback: stop advertising `reconnecting` so consumers aren't stuck
		// if the saved wallet never registers, but keep listening so a slow-registering
		// wallet (e.g. an async-registered zkLogin wallet) can still restore later.
		const stopReconnecting = () => {
			if ($baseConnection.get().status === 'reconnecting') {
				$baseConnection.set({ status: 'disconnected', currentAccount: null });
			}
		};

		const tryRestore = (wallets: readonly UiWallet[]) =>
			task(async () => {
				if (done) return;

				const { status } = $baseConnection.get();
				// A manual connect takes precedence; only auto-connect while idle or
				// while we're still mid-restore.
				if (status !== 'disconnected' && status !== 'reconnecting') {
					stop();
					return;
				}

				const savedWalletAccount = await getSavedWalletAccount({
					networks,
					storage,
					storageKey,
					wallets,
				});

				if (done) return;

				if (savedWalletAccount) {
					$baseConnection.set({
						status: 'connected',
						currentAccount: savedWalletAccount.account,
						supportedIntents: savedWalletAccount.supportedIntents,
					});
					stop();
				}
			});

		unsubscribe = $compatibleWallets.subscribe(
			(wallets, oldWallets: readonly UiWallet[] | undefined) => {
				// subscribe on a computed store may fire with undefined due to nanostores
				// reading the underlying atom's uninitialized value instead of computing it.
				if (!wallets) return;
				if (oldWallets && oldWallets.length > wallets.length) return;
				void tryRestore(wallets);
			},
		);

		// Eagerly enter `reconnecting` when there's a persisted session to restore,
		// independent of wallet-registration timing, so the restore window is
		// observable from mount. If there's nothing saved, settle immediately.
		void task(async () => {
			const hasSavedSession = Boolean(await storage.getItem(storageKey));
			if (done) return;

			if (!hasSavedSession) {
				stop();
				return;
			}

			if ($baseConnection.get().status === 'disconnected') {
				$baseConnection.set({
					status: 'reconnecting',
					currentAccount: null,
					supportedIntents: [],
				});
			}

			timeoutId = setTimeout(stopReconnecting, AUTO_CONNECT_RESTORE_TIMEOUT);
		});

		return () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			unsubscribe?.();
		};
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
