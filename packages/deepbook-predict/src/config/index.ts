import { TESTNET_CONFIG } from './testnet.js';
import type { PredictConfig } from './types.js';

export { TESTNET_CONFIG };
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './types.js';

/**
 * The shared AccumulatorRoot object — a fixed well-known id on every network. Owned by
 * `@mysten/deepbook-account` (the account primitive's custody funds settle through it) and
 * re-exported here so Predict's own entrypoints, which take the same root, keep one source
 * of truth. The Clock (`0x6`) is not exported: the generated move-call layer auto-injects it.
 */
export { ACCUMULATOR_ROOT_ID } from '@mysten/deepbook-account';

export function getConfig(network: 'testnet' | 'mainnet'): PredictConfig {
	if (network === 'testnet') return TESTNET_CONFIG;
	throw new Error(`no deployment for network: ${network}`);
}
