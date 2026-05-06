// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit, WalletConnection } from '@mysten/dapp-kit-core';
import { useWalletConnection } from './useWalletConnection.js';

export type UseCurrentAccountOptions<TDAppKit extends DAppKit> = {
	dAppKit?: TDAppKit;
};

export function useCurrentAccount<TDAppKit extends DAppKit<any> = RegisteredDAppKit>({
	dAppKit,
}: UseCurrentAccountOptions<TDAppKit> = {}): WalletConnection['account'] {
	const connection = useWalletConnection({ dAppKit });
	return connection.account;
}
