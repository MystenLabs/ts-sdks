// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { onMount } from 'nanostores';
import type { DAppKitStores } from '../store.js';
import type { StateStorage } from '../../utils/storage.js';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { getWalletUniqueIdentifier } from '../../utils/wallets.js';

/**
 * Syncs the most recently connected wallet name and address to storage.
 */
export function syncStateToStorage({
	stores: { $connection },
	storage,
	storageKey,
}: {
	stores: DAppKitStores;
	storage: StateStorage;
	storageKey: string;
}) {
	onMount($connection, () => {
		return $connection.listen((connection, oldConnection) => {
			if (!oldConnection || oldConnection.status === connection.status) return;

			if (connection.account) {
				storage.setItem(
					storageKey,
					getSavedAccountStorageKey(connection.account, connection.supportedIntents),
				);
			}
			// Storage is cleared by the disconnectWallet action on explicit user
			// disconnect so autoconnect won't reconnect after a page refresh.
			// Wallet *removal* (HMR, React strict mode, effect re-runs) does NOT
			// clear storage — those cases are handled by the $baseConnection /
			// $connection computed split: $baseConnection stays 'connected' while
			// the wallet is temporarily unregistered, and $connection recomputes
			// to 'connected' once the wallet re-appears.
		});
	});
}

export function getSavedAccountStorageKey(
	account: UiWalletAccount,
	supportedIntents: string[],
): string {
	const walletIdentifier = getWalletUniqueIdentifier(account);
	return `${walletIdentifier.replace(':', '_')}:${account.address}:${supportedIntents.join(',')}:`;
}
