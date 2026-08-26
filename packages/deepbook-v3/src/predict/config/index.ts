import { TESTNET_CONFIG } from './testnet.js';
import type { PredictConfig } from './types.js';
import type { NetworkArg } from '../../deployments/index.js';

export { TESTNET_CONFIG };
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './types.js';

export function getConfig(network: NetworkArg): PredictConfig {
	if (network === 'testnet') return TESTNET_CONFIG;
	throw new Error(
		`@mysten/deepbook-v3/predict: no Predict deployment recorded for network '${network}'. ` +
			'Predict is testnet-only today; for your own deployment pass `config` to PredictClient ' +
			'or `predict({ config })`.',
	);
}

// Provenance: which on-chain deployment these ids came from.
export {
	getDeployment,
	getUnits,
	TESTNET_DEPLOYMENT,
	TESTNET_UNITS,
} from '../../deployments/index.js';
