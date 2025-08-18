// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKit, RegisteredDAppKit } from '@mysten/dapp-kit-core';
import { useStore } from '@nanostores/react';
import { useDAppKit } from './useDAppKit.js';

export type UseSuiClientOptions<TDAppKit extends DAppKit<any>> = {
	dAppKit?: TDAppKit;
};

export function useSuiClient<TDAppKit extends DAppKit<any> = RegisteredDAppKit>({
	dAppKit,
}: UseSuiClientOptions<TDAppKit> = {}) {
	const instance = useDAppKit(dAppKit);
	return useStore(instance.stores.$currentClient) as ReturnType<TDAppKit['getClient']>;
}
