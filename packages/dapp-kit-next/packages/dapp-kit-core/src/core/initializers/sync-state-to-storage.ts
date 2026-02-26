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
			// Storage is intentionally NOT cleared on disconnect. When a wallet
			// unregisters and re-registers (HMR, React strict mode, effect re-runs),
			// the autoconnect initializer uses the persisted session to seamlessly
			// reconnect once the wallet reappears. Clearing storage here would
			// permanently lose the session. Stale entries are harmless — autoconnect
			// ignores them when the wallet is not found, and connecting to a new
			// wallet overwrites the entry.
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
