// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { listenKeys, onMount } from 'nanostores';
import type { DAppKitState } from '../state.js';
import type { StateStorage } from '../../utils/storage.js';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletForHandle } from '@wallet-standard/ui-registry';
import { getWalletUniqueIdentifier } from '../../utils/wallets.js';

/**
 * Syncs the most recently connected wallet name and address to storage.
 */
export function syncStateToStorage({
	$state,
	storage,
	storageKey,
}: {
	$state: DAppKitState;
	storage: StateStorage;
	storageKey: string;
}) {
	onMount($state, () => {
		return listenKeys($state, ['connection', 'connection.currentAccount'], ({ connection }) => {
			if (connection.currentAccount) {
				storage.setItem(storageKey, getSavedAccountStorageKey(connection.currentAccount));
			} else {
				storage.removeItem(storageKey);
			}
		});
	});
}

export function getSavedAccountStorageKey(account: UiWalletAccount) {
	const underlyingWallet = getWalletForHandle(account);
	const walletIdentifier = getWalletUniqueIdentifier(underlyingWallet);
	return `${walletIdentifier.replace(':', '_')}:${account.address}`;
}
