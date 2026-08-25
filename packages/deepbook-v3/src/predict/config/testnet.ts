import type { PredictConfig } from './types.js';

/**
 * Testnet deployment constants. Pure data — every id below is public on-chain data,
 * transcribed from `packages/predict/deployment/deployment.testnet.json` (deployment
 * `predict-testnet-8-21`, sourceCommit `1f79fe87`). Regenerate from the deployment
 * record when a new package version ships.
 */
export const TESTNET_CONFIG: PredictConfig = {
	network: 'testnet',
	packages: {
		predict: '0x421041754244cf0e985fb9c9f5e1f49428caf3df4cde3a7b266d8e18ea63597b',
		account: '0xa94ec89b6cbb3e2609c7ca65bd77885b7513f852922ebdf8e766851fb6f85259',
		propbook: '0xd8b402609b1728f60cf20bfaaec5255701df54350ec13e93aac39463b00bf97b',
	},
	objects: {
		registry: '0x3d486bd50bb5bb5450ddbcb4f74776b6135f416c09024a6674ac266e77e1870a',
		protocolConfig: '0x7ef1ac99c2f0a77e7aa2602b5ea7bff68750cff0d80f09bdf827bfb345128f33',
		poolVault: '0x2a31f592d8fd3d0781e2233770d02d67797890ac82c3d18796d7eb0997896602',
		oracleRegistry: '0x715f5ae4aac0078f4d0c6bf9ea2815614e799e909a90b577aeb8de9ad8bab142',
		accountRegistry: '0x5682c73d657de1546374e632369a25c82744c8a20e9b4f47e6558e3d4bde88d3',
	},
	quoteCoinType: '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC',
	underlyings: {
		BTC: {
			symbol: 'BTC',
			propbookUnderlyingId: 1,
			pythFeed: '0xea8fd4624002516b28b495051c838b2c9a34a4f22ae281d328e1bec47f54cd24',
			blockScholesValueStore: '0x9b64cc860ac09e6dcd675fc579c1048792ddce51cc018f2ca16aeb4a1a5684a3',
			blockScholesSviStore: '0xd5bc586e99c8d595e0ba5e0a2ef2295e652db8934ffbeda630d60e207bedab8f',
		},
	},
};
