// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentNetwork } from '@mysten/dapp-kit-react';
import type { NetworkUrls } from '../types/network.js';

interface UseNetworkConfigReturn {
	networkUrls: NetworkUrls;
	isMainnet: boolean;
	currentNetwork: string;
}

export function useNetworkConfig(): UseNetworkConfigReturn {
	const currentNetwork = useCurrentNetwork();

	const isMainnet = currentNetwork === 'mainnet';

	const networkUrls: NetworkUrls = {
		walruscan: isMainnet ? 'https://walruscan.com/mainnet' : 'https://walruscan.com/testnet',
		aggregator: isMainnet
			? 'https://aggregator.walrus.space'
			: 'https://aggregator.walrus-testnet.walrus.space',
	};

	return {
		networkUrls,
		isMainnet,
		currentNetwork,
	};
}
