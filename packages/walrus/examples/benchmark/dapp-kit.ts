// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrus } from '../../src/index.js';

const GRPC_URLS = {
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

export const dAppKit = createDAppKit({
	networks: ['testnet'],
	defaultNetwork: 'testnet',
	autoConnect: true,
	createClient(network) {
		return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
			walrus({
				name: 'walrusWithRelay',

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
			}),
			walrus({
				name: 'walrusWithoutRelay',
				storageNodeClientOptions: {
					timeout: 600_000,
				},
			}),
		);
	},
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
