// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitState } from '../state.js';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { WalletNotConnectedError, WalletAccountNotFoundError } from '../../utils/errors.js';
import { getAssociatedWallet } from '../../utils/wallets.js';

export type SwitchAccountArgs = {
	/** The account to switch to. */
	account: UiWalletAccount;
};

export function switchAccountCreator({ $state }: DAppKitState) {
	/**
	 * Switches the currently selected account to the specified account.
	 */
	return function switchAccount({ account }: SwitchAccountArgs) {
		const { connection, wallets } = $state.get();
		const currentWallet = connection.currentAccount
			? getAssociatedWallet(connection.currentAccount, wallets)
			: null;

		if (!currentWallet) {
			throw new WalletNotConnectedError('No wallet is connected.');
		}

		if (!uiWalletAccountBelongsToUiWallet(account, currentWallet)) {
			throw new WalletAccountNotFoundError(
				`No account with address ${account.address} is connected to ${currentWallet.name}.`,
			);
		}

		$state.setKey('connection.currentAccount', account);
	};
}
