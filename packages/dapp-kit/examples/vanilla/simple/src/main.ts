// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';

import '@mysten/dapp-kit-core/web';

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
};

const connectButton = document.querySelector('mysten-dapp-kit-connect-button');

const dAppKit = createDAppKit({
	enableBurnerWallet: import.meta.env.DEV,
	networks: ['mainnet', 'testnet'],
	defaultNetwork: 'testnet',
	createClient(network) {
		return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
	},
});

connectButton!.instance = dAppKit;
