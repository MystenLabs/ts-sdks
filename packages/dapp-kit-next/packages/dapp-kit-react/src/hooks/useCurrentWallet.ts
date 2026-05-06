// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit, WalletConnection } from '@mysten/dapp-kit-core';
import { useWalletConnection } from './useWalletConnection.js';

export type UseCurrentWalletOptions<TDAppKit extends DAppKit> = {
	dAppKit?: TDAppKit;
};

export function useCurrentWallet<TDAppKit extends DAppKit<any> = RegisteredDAppKit>({
	dAppKit,
}: UseCurrentWalletOptions<TDAppKit> = {}): WalletConnection['wallet'] {
	const connection = useWalletConnection({ dAppKit });
	return connection.wallet;
}
