// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-react';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

export const dAppKit = createDAppKit({
	enableBurnerWallet: import.meta.env.DEV,
	networks: ['mainnet', 'testnet'],
	defaultNetwork: 'testnet',
	createClient(network) {
		return new SuiJsonRpcClient({ network, url: getJsonRpcFullnodeUrl(network) });
	},
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
