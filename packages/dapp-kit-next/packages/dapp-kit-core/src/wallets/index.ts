// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Networks } from '../utils/networks.js';
import type { DAppKitCompatibleClient } from '../core/types.js';

export type UnregisterCallback = () => void;

type InitializeArgs = {
	networks: Networks;
	getClient: (network?: Networks[number]) => DAppKitCompatibleClient;
};

type InitializeResult = {
	unregister: () => void;
};

export type WalletInitializer = {
	id: string;
	initialize(input: InitializeArgs): InitializeResult | Promise<InitializeResult>;
};

// The wallet standard registers wallets globally and uses object references
// to keep prevent duplicate wallets from being registered. For applications
// that register interfaces with hot module replacement enabled locally, this
// doesn't quite work as expected as the original object reference gets lost.
//
// To work around this and other complexities around when nanostore stores mount
// and unmount, we can simply track initializers at the module level to ensure
// that wallets get re-registered and de-duped properly when there are multiple
// dApp Kit instances, across HMR reloads, etc.
const initializerMap = new Map<string, UnregisterCallback>();

export async function registerAdditionalWallets(
	initializers: WalletInitializer[],
	args: InitializeArgs,
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
		} else {
			console.warn(`Skipping wallet initializer: "${settledResult.reason}".`);
		}
	}
}
