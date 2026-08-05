import type { PredictConfig } from './types.js';

/**
 * Testnet deployment constants. Pure data — every id below is public on-chain data,
 * transcribed from `packages/predict/deployment/deployment.testnet.json` (deployment
 * `predict-testnet-7-29`, sourceCommit `a92ceb01`). Regenerate from the deployment
 * record when a new package version ships.
 */
export const TESTNET_CONFIG: PredictConfig = {
	network: 'testnet',
	packages: {
		predict: '0xfe742239a3b033f7d52ed5275f238c17d27498ca0ee5ea5672ea732eb3f4dbbb',
		account: '0xbdbb60b00f2d4f30daeff62f2c642b18433a8fcdfbebccc808df578df2a0c203',
		propbook: '0xed1295ff3c9a9415766afff20a74cdf2e362647be09aaf13b809302c0109e912',
	},
	objects: {
		registry: '0x35970bfd0ff3703cb38b3fff3a3fbb0bc0e5638e7c747af3a8e42e2c95d353f0',
		protocolConfig: '0x43703ceee4d5f5a9e8cbf728071c34dc65961dd6e878fafd9ac36d86a9a4ce5b',
		poolVault: '0xeef535e7fcb850a943807ce48cc543c6d990b39e68a7bc47d0b56651ff20ab0a',
		oracleRegistry: '0xc1dffc5f7a5404cb002ba3bd7c50d6a2dbe8bb6afd40080cd663965deff9d577',
		accountRegistry: '0x21a7ed28397363b5550853c1f08795731257de81028cd1bf87f20c0752c8ca2f',
	},
	quoteCoinType: '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC',
	underlyings: {
		BTC: {
			symbol: 'BTC',
			propbookUnderlyingId: 1,
			pythFeed: '0xccafaa6c5a41f0493585cf268f2b4dc14c91ed798362444144cac2c745db8dde',
			blockScholesValueStore: '0x6d9de17954f4c1a2f01fdd97c0bb8a2e682c1fea0f8f048dcd127d543a6ac051',
			blockScholesSviStore: '0x83c2d6307fd3591228052fc0d24c4f00a698b0eb4fef5e6083a213ca0d54bd35',
		},
	},
};
