// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { WalletNotConnectedError, WalletAccountNotFoundError } from '../../utils/errors.js';

export type SwitchAccountArgs = {
	/** The account to switch to. */
	account: UiWalletAccount;
};

export function switchAccountCreator({ $baseConnection, $connection }: DAppKitStores) {
	/**
	 * Switches the currently selected account to the specified account.
	 */
	return function switchAccount({ account }: SwitchAccountArgs) {
		const { wallet } = $connection.get();
		if (!wallet) {
			throw new WalletNotConnectedError('No wallet is connected.');
		}

		if (!uiWalletAccountBelongsToUiWallet(account, wallet)) {
			throw new WalletAccountNotFoundError(
				`No account with address ${account.address} is connected to ${wallet.name}.`,
			);
		}

		$baseConnection.setKey('currentAccount', account);
	};
}
