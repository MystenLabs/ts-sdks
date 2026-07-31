import type { PredictConfig } from './types.js';

/**
 * Testnet deployment constants. Pure data — every id below is public on-chain data,
 * transcribed from `packages/predict/deployment/deployment.testnet.json` (deployment
 * `predict-testnet-7-29`, sourceCommit `4c3c62c6`). Regenerate from the deployment
 * record when a new package version ships.
 */
export const TESTNET_CONFIG: PredictConfig = {
	network: 'testnet',
	packages: {
		predict: '0xd94387c857ab56857f5f2750f2ba959fb007306f977a24290342433aef090298',
		account: '0xdabedf28ee547a20cb4ed30d4ff3dab686ff2926add584822466efded14cec4a',
		propbook: '0x756ab217b8b7cbbe7a9e45a5cc385347cb43f74aac0102772336a24cf48ab9cb',
	},
	objects: {
		registry: '0xafc24283eec35728da1184eea118c41067bbde153447f9946e0667672f18a383',
		protocolConfig: '0x19a07f5be96ca7b47e8b2ec39d7caf40e1fbb7d4156a699bfecda807d1d3d427',
		poolVault: '0x90454f005b8eca464317ffb31adf5e39da94a9304b11b9501d5668d0103bbb0a',
		oracleRegistry: '0xec1a1aa6aeffb45aae40cba097714e711acc28739faa005e1932de608189667f',
		accountRegistry: '0x316fa986a919b2f69884bfeec2a8668bf671a4d05c1c434ad6d9647a41d2ccb2',
	},
	quoteCoinType: '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC',
	underlyings: {
		BTC: {
			symbol: 'BTC',
			propbookUnderlyingId: 1,
			pythFeed: '0x980be0a52ea3f1e5243d5d5cd116c4de9107abb07fdbe134314996302a97c524',
			blockScholesValueStore: '0x24b684a5f9168bbe792e1e10aece0353e5e5f8f9be3d07acded253644f1c3d4c',
			blockScholesSviStore: '0x8400d1ea44291177bd02ff33d49be5785cc809cdf280f7e2f05f72866af05dca',
		},
	},
};
