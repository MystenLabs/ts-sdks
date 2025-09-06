// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import { getNetworkConfig } from './constants/networks.js';

export const dAppKit = createDAppKit({
	enableBurnerWallet: import.meta.env.DEV,
	networks: ['mainnet', 'testnet', 'devnet', 'localnet'],
	defaultNetwork: 'testnet',
	createClient(network) {
		const networkConfig = getNetworkConfig(network);
		return new SuiClient({
			url: getFullnodeUrl(network),
			network,
			mvr: {
				overrides: {
					packages: {
						// Map generated package names to their deployed addresses from constants
						...(networkConfig.nftPackageId && {
							'demo.sui/nft': networkConfig.nftPackageId,
						}),
						...(networkConfig.counterPackageId && {
							'demo.sui/counter': networkConfig.counterPackageId,
						}),
					},
				},
			},
		}).$extend({
			name: 'walrus',
			register: (client) => {
				return new WalrusClient({
					network: network === 'testnet' ? 'testnet' : 'mainnet',
					suiClient: client,
					storageNodeClientOptions: {
						timeout: 600_000,
						onError: (error: unknown) => {
							console.error('Storage node client error:', error);
						},
					},
					uploadRelay: {
						host:
							network === 'testnet'
								? 'https://upload-relay.testnet.walrus.space'
								: 'https://upload-relay.mainnet.walrus.space',
						sendTip: {
							max: 1_000,
						},
						timeout: 600_000,
					},
				});
			},
		});
	},
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
