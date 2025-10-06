// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SuiClient } from '@mysten/sui/client';

// Create dedicated SuiClient instances for each network
const testnetClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io', network: 'testnet' });
const mainnetClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io', network: 'mainnet' });
const devnetClient = new SuiClient({ url: 'https://fullnode.devnet.sui.io', network: 'devnet' });

export function getClientForNetwork(chainId: string): SuiClient {
	switch (chainId) {
		case 'sui:testnet':
			return testnetClient;
		case 'sui:mainnet':
			return mainnetClient;
		case 'sui:devnet':
			return devnetClient;
		default:
			return testnetClient;
	}
}
