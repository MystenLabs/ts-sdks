// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SuiClient } from '@mysten/sui/client';

// Create dedicated SuiClient instances for each network
const testnetClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
const mainnetClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });
const devnetClient = new SuiClient({ url: 'https://fullnode.devnet.sui.io' });

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
