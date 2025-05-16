// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitState } from '../state.js';
import { task } from 'nanostores';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import type { StandardConnectInput } from '@mysten/wallet-standard';
import type { StandardConnectFeature } from '@mysten/wallet-standard';
import { isSuiChain, StandardConnect } from '@mysten/wallet-standard';
import { getWalletFeature, uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import {
	getOrCreateUiWalletAccountForStandardWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getOrCreateUiWalletAccountForStandardWalletAccount,
	getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletForHandle,
} from '@wallet-standard/ui-registry';
import { WalletAccountNotFoundError, WalletNoAccountsConnectedError } from '../../utils/errors.js';

export type ConnectWalletArgs = {
	/** The wallet to connect to. */
	wallet: UiWallet;

	/**
	 * An optional account to set as the selected account.
	 * @defaultValue The first authorized account.
	 */
	account?: UiWalletAccount;
} & Omit<StandardConnectInput, 'silent'>;

export function connectWalletCreator({ $state }: DAppKitState) {
	/**
	 * Prompts the specified wallet to connect and authorize new accounts for the current domain.
	 */
	return async function connectWallet({
		wallet,
		account,
		...standardConnectArgs
	}: ConnectWalletArgs) {
		return await task(async () => {
			const { connection } = $state.get();
			const isAlreadyConnected = connection.status === 'connected';

			try {
				$state.setKey('connection.status', isAlreadyConnected ? 'reconnecting' : 'connecting');

				const { connect } = getWalletFeature(
					wallet,
					StandardConnect,
				) as StandardConnectFeature[typeof StandardConnect];

				const result = await connect(standardConnectArgs);

				const underlyingWallet = getWalletForHandle(wallet);
				const suiAccounts = result.accounts
					.filter((account) => account.chains.some(isSuiChain))
					.map(getOrCreateUiWalletAccountForStandardWalletAccount.bind(null, underlyingWallet));

				if (!isAlreadyConnected && suiAccounts.length === 0) {
					throw new WalletNoAccountsConnectedError('No accounts were authorized.');
				}

				if (account && !uiWalletAccountBelongsToUiWallet(account, wallet)) {
					throw new WalletAccountNotFoundError(
						`No account with address ${account.address} is authorized for ${wallet.name}.`,
					);
				}

				$state.setKey('connection', {
					status: 'connected',
					currentAccount: account ?? suiAccounts[0],
				});

				return { accounts: suiAccounts };
			} catch (error) {
				$state.setKey('connection.status', isAlreadyConnected ? 'connected' : 'disconnected');
				throw error;
			}
		});
	};
}
