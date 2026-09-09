// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MAINNET_CONFIG } from './mainnet.js';
import { TESTNET_CONFIG } from './testnet.js';
import type { PredictConfig } from './types.js';
import type { NetworkArg } from '../../deployments/index.js';

export { TESTNET_CONFIG, MAINNET_CONFIG };
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './types.js';

export function getConfig(network: NetworkArg): PredictConfig {
	if (network === 'testnet') return TESTNET_CONFIG;
	if (network === 'mainnet') return MAINNET_CONFIG;
	throw new Error(
		`@mysten/deepbook-v3/predict: no Predict deployment recorded for network '${network}'. ` +
			'Predict is recorded for testnet and mainnet; for your own deployment pass `config` to ' +
			'PredictClient ' +
			'or `predict({ config })`.',
	);
}

// Provenance: which on-chain deployment these ids came from.
export {
	getDeployment,
	getUnits,
	MAINNET_DEPLOYMENT,
	MAINNET_UNITS,
	TESTNET_DEPLOYMENT,
	TESTNET_UNITS,
} from '../../deployments/index.js';
