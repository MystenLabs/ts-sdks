// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	StandardConnect,
	StandardEvents,
	SuiSignAndExecuteTransaction,
	SuiSignTransaction,
	WALLET_STANDARD_ERROR__FEATURES__WALLET_ACCOUNT_CHAIN_UNSUPPORTED,
	WalletStandardError,
} from '@mysten/wallet-standard';
import type { Wallet } from '@mysten/wallet-standard';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { getWalletAccountFeature, uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import { getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletForHandle } from '@wallet-standard/ui-registry';
import { ChainNotSupportedError, DAppKitError, FeatureNotSupportedError } from './errors.js';

export const requiredWalletFeatures = [
	StandardConnect,
	StandardEvents,
	SuiSignTransaction,
	SuiSignAndExecuteTransaction,
] as const;

export function getAssociatedWalletOrThrow(account: UiWalletAccount, wallets: UiWallet[]) {
	const wallet = wallets.find((wallet) => uiWalletAccountBelongsToUiWallet(account, wallet));
	if (!wallet) {
		throw new DAppKitError(`Wallet not found for account ${account.address}.`);
	}
	return wallet;
}

export function getWalletUniqueIdentifier(wallet: UiWallet | Wallet) {
	const underlyingWallet = '~uiWalletHandle' in wallet ? getWalletForHandle(wallet) : wallet;
	return underlyingWallet.id ?? underlyingWallet.name;
}

export function getAccountFeature<TAccount extends UiWalletAccount>({
	account,
	featureName,
	chain,
}: {
	account: TAccount;
	featureName: TAccount['features'][number];
	chain: TAccount['chains'][number];
}) {
	if (!account.chains.includes(chain)) {
		const cause = new WalletStandardError(
			WALLET_STANDARD_ERROR__FEATURES__WALLET_ACCOUNT_CHAIN_UNSUPPORTED,
			{
				chain,
				featureName,
				supportedChains: [...account.chains],
				supportedFeatures: [...account.features],
				address: account.address,
			},
		);

		throw new ChainNotSupportedError(
			`The account ${cause.context.address} does not support the chain "${cause.context.chain}".`,
			{ cause },
		);
	}

	try {
		return getWalletAccountFeature(account, featureName);
	} catch (error) {
		throw new FeatureNotSupportedError(
			`The account ${account.address} does not support the feature "${featureName}".`,
			{ cause: error },
		);
	}
}
