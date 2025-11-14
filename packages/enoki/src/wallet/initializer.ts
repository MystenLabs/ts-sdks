// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { registerEnokiWallets } from './register.js';
import type { RegisterEnokiWalletsOptions } from './types.js';

export function enokiWalletsInitializer(
	options: Omit<RegisterEnokiWalletsOptions, 'clients' | 'getCurrentNetwork'>,
) {
	return {
		id: 'enoki-wallets-initializer',
		async initialize({
			networks,
			getClient,
		}: {
			networks: readonly SuiClientTypes.Network[];
			getClient: (network?: SuiClientTypes.Network) => ClientWithCoreApi;
		}) {
			const { unregister } = registerEnokiWallets({
				...options,
				getCurrentNetwork: () => getClient().network,
				clients: networks.map(getClient),
			});

			return { unregister };
		},
	};
}
