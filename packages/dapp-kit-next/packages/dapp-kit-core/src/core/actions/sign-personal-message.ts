// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { SuiSignPersonalMessage } from '@mysten/wallet-standard';
import type {
	SuiSignPersonalMessageFeature,
	SuiSignPersonalMessageInput,
} from '@mysten/wallet-standard';
import { getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletAccountForUiWalletAccount } from '@wallet-standard/ui-registry';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { WalletNotConnectedError } from '../../utils/errors.js';
import { getChain } from '../../utils/networks.js';
import { getAccountFeature } from '../../utils/wallets.js';

export type SignPersonalMessageArgs = {
	account?: UiWalletAccount;
} & Omit<SuiSignPersonalMessageInput, 'account' | 'chain'>;

export function signPersonalMessageCreator({ $connection, $currentNetwork }: DAppKitStores) {
	/**
	 * Prompts the specified wallet account to sign a personal message.
	 */
	return async function signPersonalMessage({
		account: accountOverride,
		...standardArgs
	}: SignPersonalMessageArgs) {
		const { account: currentAccount } = $connection.get();
		const account = accountOverride ?? currentAccount;
		if (!account) {
			throw new WalletNotConnectedError('No wallet is connected.');
		}

		const currentNetwork = $currentNetwork.get();
		const chain = getChain(currentNetwork);

		const signPersonalMessageFeature = getAccountFeature({
			account: account,
			chain,
			featureName: SuiSignPersonalMessage,
		}) as SuiSignPersonalMessageFeature[typeof SuiSignPersonalMessage];

		return await signPersonalMessageFeature.signPersonalMessage({
			...standardArgs,
			account: getWalletAccountForUiWalletAccount(account),
			chain,
		});
	};
}
