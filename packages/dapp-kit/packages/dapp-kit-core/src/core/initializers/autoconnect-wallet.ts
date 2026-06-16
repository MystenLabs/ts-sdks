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
 * To let consumers distinguish "restoring a saved session" from "logged out" during
 * the async restore window, this eagerly moves the connection into the `reconnecting`
 * state on mount whenever a persisted session exists — even before the saved wallet
 * has registered (default wallets like Slush register asynchronously).
 *
 * The restore window is bounded so a genuinely-absent wallet doesn't hang forever, but
 * the bound is chosen to avoid a brittle cutoff:
 * - We stay `reconnecting` until BOTH every configured wallet initializer has settled
 *   (`walletsRegistered`) AND a short grace period (`timeout`) has elapsed. The grace
 *   period absorbs wallets that register slightly after page load (e.g. browser
 *   extensions), which have no deterministic "registered" signal.
 * - An in-flight restore is never interrupted: once the bound is reached we make a final
 *   restore attempt and await it (which awaits the wallet's own connect/hydration), so a
 *   slow-but-valid wallet still wins the race.
 * - If the session still hasn't restored, we settle to `disconnected` but keep listening,
 *   so a very-late registration can still restore it.
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

		// Terminal: we've restored the session (or a manual connect took over). Stop
		// listening for further wallet registrations.
		const stop = () => {
			done = true;
			unsubscribe?.();
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

			// Wait for the registration storm to settle: all configured initializers
			// plus a grace period for late-registering extensions.
			const gracePeriod = new Promise((resolve) => setTimeout(resolve, timeout));
			await Promise.all([walletsRegistered.catch(() => {}), gracePeriod]);
			if (done) return;

			// Final attempt against the now-complete wallet set. This awaits the saved
			// wallet's connect/hydration if it's present, so an in-flight restore is
			// never cut short.
			await tryRestore($compatibleWallets.get() ?? []);
			if (done) return;

			// Still unresolved → the saved wallet is genuinely unavailable. Settle the
			// signal so consumers aren't stuck, but keep listening so a very-late
			// registration can still restore the session.
			if ($baseConnection.get().status === 'reconnecting') {
				$baseConnection.set({ status: 'disconnected', currentAccount: null });
			}
		});

		return () => {
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
