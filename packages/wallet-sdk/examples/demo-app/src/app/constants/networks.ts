// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { NetworkName } from '../types/network.js';

// Re-export for other components
export type { NetworkName };

interface NetworkConfig {
	counterPackageId?: string;
	nftPackageId?: string;
	// Add other network-specific constants here as needed
}

const NETWORK_CONFIGS: Record<NetworkName, NetworkConfig> = {
	testnet: {
		counterPackageId: '0x58a6d7dccd124b7e0bb9756dc309f5d5b9e2bc38a05261177970e96d0d3911f1',
		nftPackageId: '0x1ae7832d6ad190aa4c8d6a36dd014d8383246428fb27590262b8648fcec62ca0',
	},
	mainnet: {
		// Add mainnet-specific configs when available
	},
	devnet: {
		// Add devnet-specific configs when available
	},
	localnet: {
		// Add localnet-specific configs when available
	},
};

export function getNetworkConfig(network: string): NetworkConfig {
	return NETWORK_CONFIGS[network as NetworkName] ?? NETWORK_CONFIGS.testnet;
}
