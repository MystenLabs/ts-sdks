// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit, WalletConnection } from '@mysten/dapp-kit-core';
import { useStore } from '@nanostores/react';
import { useDAppKit } from './useDAppKit.js';

export type UseWalletConnectionOptions<TDAppKit extends DAppKit<any>> = {
	dAppKit?: TDAppKit;
};

export function useWalletConnection<TDAppKit extends DAppKit = RegisteredDAppKit>({
	dAppKit,
}: UseWalletConnectionOptions<TDAppKit> = {}): WalletConnection {
	const instance = useDAppKit(dAppKit);
	return useStore(instance.stores.$connection);
}
