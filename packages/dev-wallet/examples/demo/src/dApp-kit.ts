// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { devWalletInitializer } from '@mysten/dev-wallet';
import {
	InMemorySignerAdapter,
	PasskeySignerAdapter,
	WebCryptoSignerAdapter,
} from '@mysten/dev-wallet/adapters';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export const GRPC_URLS: Record<string, string> = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
	devnet: 'https://fullnode.devnet.sui.io:443',
	localnet: 'http://127.0.0.1:9000',
};

export const dAppKit = createDAppKit({
	networks: ['localnet', 'devnet', 'testnet', 'mainnet'],
	defaultNetwork: 'devnet',
	createClient(network) {
		return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
	},
	walletInitializers: [
		devWalletInitializer({
			adapters: [new WebCryptoSignerAdapter(), new InMemorySignerAdapter(), new PasskeySignerAdapter()],
			autoConnect: true,
			mountUI: true,
		}),
	],
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
