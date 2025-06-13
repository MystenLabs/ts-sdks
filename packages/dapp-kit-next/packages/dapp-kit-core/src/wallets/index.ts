// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/experimental';
import type { Networks } from '../utils/networks.js';

export type UnregisterCallback = () => void;

type InitilizeArgs<TNetworks extends Networks> = {
	networks: TNetworks;
	getClient: (network: TNetworks[number]) => ClientWithCoreApi;
};

type InitializeResult = {
	unregister: () => void;
};

export type WalletInitializer = {
	id: string;
	initialize<TNetworks extends Networks>(
		input: InitilizeArgs<TNetworks>,
	): InitializeResult | Promise<InitializeResult>;
};

// The wallet standard registers wallets globally and uses object references
// to keep prevent duplicate wallets from being registered. For applications
// that register interfaces with hot module replacement enabled locally, this
// doesn't quite work as expected as the original object reference gets lost.
//
// To work around these complexities, we can simply track initializers at the
// module level to ensure that wallets get re-registered and de-duped properly
// when there are multiple dApp Kit instances, across HMR reloads, etc.
const initializerMap = new Map<string, UnregisterCallback>();

export async function registerAdditionalWallets<TNetworks extends Networks>(
	initializers: WalletInitializer[],
	args: InitilizeArgs<TNetworks>,
) {
	initializerMap.forEach((unregister) => unregister());
	initializerMap.clear();

	const uniqueInitializers = [...new Map(initializers.map((init) => [init.id, init])).values()];
	const initializePromises = uniqueInitializers.map(async (initializer) => {
		const result = await initializer.initialize(args);
		return { initializer, result };
	});

	const initializerResults = await Promise.allSettled(initializePromises);
	for (const settledResult of initializerResults) {
		if (settledResult.status === 'fulfilled') {
			const { initializer, result } = settledResult.value;
			initializerMap.set(initializer.id, result.unregister);
		}
	}
}
