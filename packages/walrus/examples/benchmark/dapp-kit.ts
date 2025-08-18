// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '../../src/index.js';

export const dAppKit = createDAppKit({
	networks: ['testnet'],
	defaultNetwork: 'testnet',
	autoConnect: true,
	createClient(network) {
		return new SuiClient({ network, url: getFullnodeUrl(network) }).$extend(
			{
				name: 'walrusWithRelay',
				register: (client) => {
					return new WalrusClient({
						network: 'testnet',
						suiClient: client,
						storageNodeClientOptions: {
							timeout: 600_000,
							onError: (error) => {
								console.error('Storage node client error:', error);
							},
						},
						uploadRelay: {
							host: 'https://upload-relay.testnet.walrus.space',
							sendTip: {
								max: 1_000,
							},
							timeout: 600_000,
						},
					});
				},
			},
			{
				name: 'walrusWithoutRelay',
				register: (client) => {
					return new WalrusClient({
						network: 'testnet',
						suiClient: client,
						storageNodeClientOptions: {
							timeout: 600_000,
						},
					});
				},
			},
		);
	},
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
