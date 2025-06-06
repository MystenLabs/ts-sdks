// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit } from '@mysten/dapp-kit-next';
import { getDefaultInstance } from '@mysten/dapp-kit-next';
import { useStore } from '@nanostores/react';

export function useWallets<TDAppKit extends DAppKit<any>>(instance?: TDAppKit) {
	const dAppKit = instance ?? getDefaultInstance();
	return useStore(dAppKit.stores.$wallets);
}
