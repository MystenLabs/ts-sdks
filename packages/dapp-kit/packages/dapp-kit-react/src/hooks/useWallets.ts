// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit } from '@mysten/dapp-kit-core';
import { useStore } from '@nanostores/react';
import { useDAppKit } from './useDAppKit.js';

export type UseWalletsOptions<TDAppKit extends DAppKit> = {
	dAppKit?: TDAppKit;
};

export function useWallets<TDAppKit extends DAppKit<any> = RegisteredDAppKit>({
	dAppKit,
}: UseWalletsOptions<TDAppKit> = {}) {
	const instance = useDAppKit(dAppKit);
	return useStore(instance.stores.$wallets);
}
