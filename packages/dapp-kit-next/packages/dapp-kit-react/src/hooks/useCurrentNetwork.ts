// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit } from '@mysten/dapp-kit-core';
import type { StoreValue } from 'nanostores';
import { useDAppKit } from './useDAppKit.js';
import { useStore } from '@nanostores/react';

export type UseCurrentNetworkOptions<TDAppKit extends DAppKit> = {
	dAppKit?: TDAppKit;
};

export function useCurrentNetwork<TDAppKit extends DAppKit<any> = RegisteredDAppKit>({
	dAppKit,
}: UseCurrentNetworkOptions<TDAppKit> = {}): StoreValue<TDAppKit['stores']['$currentNetwork']> {
	const instance = useDAppKit(dAppKit);
	return useStore<TDAppKit['stores']['$currentNetwork']>(instance.stores.$currentNetwork);
}
