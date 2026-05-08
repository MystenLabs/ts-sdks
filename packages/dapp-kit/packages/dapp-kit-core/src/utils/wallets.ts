// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	StandardConnect,
	StandardEvents,
	SuiSignTransaction,
	SuiSignTransactionBlock,
	WALLET_STANDARD_ERROR__FEATURES__WALLET_ACCOUNT_CHAIN_UNSUPPORTED,
	WalletStandardError,
} from '@mysten/wallet-standard';
import type { UiWalletAccount, UiWalletHandle } from '@wallet-standard/ui';
import { getWalletAccountFeature } from '@wallet-standard/ui';
import { getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletForHandle } from '@wallet-standard/ui-registry';
import { ChainNotSupportedError, FeatureNotSupportedError } from './errors.js';

export const requiredWalletFeatures = [StandardConnect, StandardEvents] as const;

export const signingFeatures = [SuiSignTransaction, SuiSignTransactionBlock] as const;

export function getWalletUniqueIdentifier(walletHandle: UiWalletHandle) {
	const underlyingWallet = getWalletForHandle(walletHandle);
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

export function tryGetAccountFeature<TAccount extends UiWalletAccount>(
	...args: Parameters<typeof getAccountFeature<TAccount>>
) {
	try {
		return getAccountFeature(...args);
	} catch (error) {
		if (error instanceof FeatureNotSupportedError) {
			return null;
		}
		throw error;
	}
}
