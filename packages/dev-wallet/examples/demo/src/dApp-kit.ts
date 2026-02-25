// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export const GRPC_URLS: Record<string, string> = {
	devnet: 'https://fullnode.devnet.sui.io:443',
	// localnet: 'http://127.0.0.1:9000',
};

export const dAppKit = createDAppKit({
	networks: ['devnet'],
	defaultNetwork: 'devnet',
	createClient(network) {
		return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
	},
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
