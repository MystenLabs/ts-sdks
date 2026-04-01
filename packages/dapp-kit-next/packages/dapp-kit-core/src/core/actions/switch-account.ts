// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { WalletNotConnectedError, WalletAccountNotFoundError } from '../../utils/errors.js';
import type { StateStorage } from '../../utils/storage.js';
import { saveAccountToStorage } from '../../utils/storage.js';

export type SwitchAccountArgs = {
	/** The account to switch to. */
	account: UiWalletAccount;
};

export function switchAccountCreator(
	{ $baseConnection, $connection }: DAppKitStores,
	{ storage, storageKey }: { storage: StateStorage; storageKey: string },
) {
	/**
	 * Switches the currently selected account to the specified account.
	 */
	return function switchAccount({ account }: SwitchAccountArgs) {
		const connection = $connection.get();
		if (!connection.wallet) {
			throw new WalletNotConnectedError('No wallet is connected.');
		}

		if (!uiWalletAccountBelongsToUiWallet(account, connection.wallet)) {
			throw new WalletAccountNotFoundError(
				`No account with address ${account.address} is connected to ${connection.wallet.name}.`,
			);
		}

		$baseConnection.setKey('currentAccount', account);
		saveAccountToStorage(storage, storageKey, account, connection.supportedIntents);
	};
}
