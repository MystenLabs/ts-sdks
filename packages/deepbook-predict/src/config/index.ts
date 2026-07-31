import { TESTNET_CONFIG } from './testnet.js';
import type { PredictConfig } from './types.js';

export { TESTNET_CONFIG };
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './types.js';

/**
 * The shared AccumulatorRoot object — a fixed well-known id on every network. The
 * Clock (`0x6`) is not exported: the generated move-call layer auto-injects it.
 */
export const ACCUMULATOR_ROOT_ID = '0xacc';

export function getConfig(network: 'testnet' | 'mainnet'): PredictConfig {
	if (network === 'mainnet') throw new Error('no mainnet deployment');
	return TESTNET_CONFIG;
}
