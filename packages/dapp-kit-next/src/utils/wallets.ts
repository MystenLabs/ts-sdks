// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	StandardConnect,
	StandardEvents,
	SuiSignAndExecuteTransaction,
} from '@mysten/wallet-standard';
import type { Wallet } from '@mysten/wallet-standard';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import { getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletForHandle } from '@wallet-standard/ui-registry';
import { DAppKitError } from './errors.js';

export const requiredWalletFeatures = [
	StandardConnect,
	StandardEvents,
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
