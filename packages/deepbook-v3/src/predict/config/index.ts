import { TESTNET_CONFIG } from './testnet.js';
import type { PredictConfig } from './types.js';

export { TESTNET_CONFIG };
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './types.js';

export function getConfig(network: 'testnet' | 'mainnet'): PredictConfig {
	if (network === 'testnet') return TESTNET_CONFIG;
	throw new Error(`no deployment for network: ${network}`);
}

// Provenance: which on-chain deployment these ids came from.
export { getDeployment, TESTNET_DEPLOYMENT } from '../../deployments/index.js';
