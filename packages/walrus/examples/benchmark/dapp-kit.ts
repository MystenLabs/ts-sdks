// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { walrus } from '../../src/index.js';

export const dAppKit = createDAppKit({
	networks: ['testnet'],
	defaultNetwork: 'testnet',
	autoConnect: true,
	createClient(network) {
		return new SuiJsonRpcClient({ network, url: getJsonRpcFullnodeUrl(network) }).$extend(
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
