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
import type { UiWallet, UiWalletAccount, UiWalletHandle } from '@wallet-standard/ui';
import { getWalletAccountFeature, uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import { getWalletForHandle } from '@wallet-standard/ui-registry';
import {
	ChainNotSupportedError,
	FeatureNotSupportedError,
	WalletAccountNotFoundError,
	WalletNotConnectedError,
} from './errors.js';

export const requiredWalletFeatures = [StandardConnect, StandardEvents] as const;

export const signingFeatures = [SuiSignTransaction, SuiSignTransactionBlock] as const;

export function getWalletUniqueIdentifier(walletHandle: UiWalletHandle) {
	const underlyingWallet = getWalletForHandle(walletHandle);
	return underlyingWallet.id ?? underlyingWallet.name;
}

/**
 * Resolves the account a signing action should use, defaulting to the currently connected account.
 *
 * Enforces that the wallet, account, and (downstream) network all stay compatible: a wallet must be
 * connected, and any explicitly provided account must belong to that connected wallet. The
 * account-supports-network check happens later in {@link getAccountFeature} via `account.chains`.
 */
export function resolveSigningAccount(
	connection: { wallet: UiWallet | null; account: UiWalletAccount | null },
	account?: UiWalletAccount,
): UiWalletAccount {
	if (!connection.wallet || !connection.account) {
		throw new WalletNotConnectedError('No wallet is connected.');
	}

	if (account && !uiWalletAccountBelongsToUiWallet(account, connection.wallet)) {
		throw new WalletAccountNotFoundError(
			`No account with address ${account.address} is connected to ${connection.wallet.name}.`,
		);
	}

	return account ?? connection.account;
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
