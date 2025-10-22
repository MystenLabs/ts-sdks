// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-core';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

import '@mysten/dapp-kit-core/web';

const connectButton = document.querySelector('mysten-dapp-kit-connect-button');

const dAppKit = createDAppKit({
	enableBurnerWallet: import.meta.env.DEV,
	networks: ['mainnet', 'testnet'],
	defaultNetwork: 'testnet',
	createClient(network) {
		return new SuiJsonRpcClient({ network, url: getJsonRpcFullnodeUrl(network) });
	},
});

connectButton!.instance = dAppKit;
