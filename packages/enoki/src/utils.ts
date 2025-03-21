// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { EnokiNetwork } from './EnokiClient/type.js';

export function isEnokiNetwork(network: string): network is EnokiNetwork {
	return network === 'mainnet' || network === 'testnet' || network === 'devnet';
}
