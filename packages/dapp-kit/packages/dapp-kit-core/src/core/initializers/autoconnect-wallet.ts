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
 *
 * Enters `reconnecting` on mount when a persisted session exists, so consumers can tell a
 * restore apart from a logged-out state while the saved wallet is still resolving. Settles
 * to `disconnected` once every initializer has registered and `timeout` has elapsed without
 * a restore, but never interrupts an in-flight restore and keeps listening afterwards.
 */
export function autoConnectWallet({
	networks,
	stores: { $baseConnection, $compatibleWallets },
	storage,
	storageKey,
	walletsRegistered,
	timeout,
}: {
	networks: Networks;
	stores: DAppKitStores;
	storage: StateStorage;
	storageKey: string;
	/** Resolves once all configured wallet initializers have finished registering. */
	walletsRegistered: Promise<unknown>;
	/** Grace period (ms) to keep waiting for a saved wallet to register before giving up. */
	timeout: number;
}) {
	onMount($compatibleWallets, () => {
		let done = false;
		let unsubscribe: (() => void) | undefined;

		const stop = () => {
			done = true;
			unsubscribe?.();
		};

		const tryRestore = (wallets: readonly UiWallet[]) =>
			task(async () => {
				if (done) return;

				// A manual connect takes precedence over auto-connect.
				const { status } = $baseConnection.get();
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

			// Give every initializer, plus a grace period for late-registering wallets,
			// a chance to register before making a final attempt and giving up.
			const gracePeriod = new Promise((resolve) => setTimeout(resolve, timeout));
			await Promise.all([walletsRegistered.catch(() => {}), gracePeriod]);
			if (done) return;

			await tryRestore($compatibleWallets.get() ?? []);
			if (done) return;

			// Settle the signal so consumers aren't stuck, but keep listening so a
			// very-late registration can still restore the session.
			if ($baseConnection.get().status === 'reconnecting') {
				$baseConnection.set({ status: 'disconnected', currentAccount: null });
			}
		});

		// `stop()` (not just `unsubscribe()`) so an in-flight eager task or restore can't
		// mutate the shared store after teardown (e.g. a React StrictMode double-mount).
		return stop;
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
