// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { SuiSignPersonalMessage } from '@mysten/wallet-standard';
import type {
	SuiSignPersonalMessageFeature,
	SuiSignPersonalMessageInput,
} from '@mysten/wallet-standard';
import { getWalletAccountForUiWalletAccount } from '@wallet-standard/ui-registry';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { getChain } from '../../utils/networks.js';
import type { Networks } from '../../utils/networks.js';
import { getAccountFeature, resolveSigningAccount } from '../../utils/wallets.js';

export type SignPersonalMessageArgs<TNetworks extends Networks = Networks> = {
	/** The account to sign with. Defaults to the currently connected account. */
	account?: UiWalletAccount;
	/** The network to sign against. Defaults to the dApp kit's current network. */
	network?: TNetworks[number];
} & Omit<SuiSignPersonalMessageInput, 'account' | 'chain'>;

export function signPersonalMessageCreator<TNetworks extends Networks>({
	$connection,
	$currentNetwork,
}: DAppKitStores<TNetworks>) {
	/**
	 * Prompts the specified wallet account to sign a personal message.
	 */
	return async function signPersonalMessage({
		account: accountOverride,
		network,
		...standardArgs
	}: SignPersonalMessageArgs<TNetworks>) {
		const connection = $connection.get();
		const account = resolveSigningAccount(connection, accountOverride);

		const resolvedNetwork = network ?? $currentNetwork.get();
		const chain = getChain(resolvedNetwork);

		const signPersonalMessageFeature = getAccountFeature({
			account,
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
