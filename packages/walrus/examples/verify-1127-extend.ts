// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Verifies the extendBlob payment path against simulated price drift (issue #1127).
// Writes a small blob, then extends it twice: once with the cached price inflated
// +2% (previously aborted in destroy_zero) and once deflated -15% + stale-until-reset
// (exercises the StalePriceError classification and cache reset, after which a new
// attempt succeeds with freshly loaded prices).

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Agent, setGlobalDispatcher } from 'undici';

import { walrus } from '../src/client.js';
import { StalePriceError } from '../src/error.js';
import { getFundedKeypair } from './funded-keypair.js';

setGlobalDispatcher(
	new Agent({
		connectTimeout: 60_000,
		connect: { timeout: 60_000 },
	}),
);

function makeClient() {
	return new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'https://fullnode.testnet.sui.io:443',
	}).$extend(
		walrus({
			storageNodeClientOptions: {
				timeout: 60_000,
			},
		}),
	);
}

function patchSystemStatePrice(
	client: ReturnType<typeof makeClient>,
	numer: bigint,
	denom: bigint,
) {
	const walrusClient = client.walrus;
	const real = walrusClient.systemState.bind(walrusClient);
	const realReset = walrusClient.reset.bind(walrusClient);
	const state = { stale: true, resetCalls: 0 };

	(walrusClient as any).reset = () => {
		state.resetCalls += 1;
		state.stale = false;
		realReset();
	};

	(walrusClient as any).systemState = async () => {
		const s = structuredClone(await real());
		if (!state.stale) {
			return s;
		}
		s.storage_price_per_unit_size = String((BigInt(s.storage_price_per_unit_size) * numer) / denom);
		s.write_price_per_unit_size = String((BigInt(s.write_price_per_unit_size) * numer) / denom);
		return s;
	};

	return state;
}

async function main() {
	const keypair = await getFundedKeypair();
	let failures = 0;

	console.log('writing a blob to extend...');
	const setupClient = makeClient();
	const { blobObject } = await setupClient.walrus.writeBlob({
		blob: new TextEncoder().encode('verify 1127 extend ' + Date.now()),
		epochs: 1,
		deletable: false,
		signer: keypair,
	});
	console.log('blob object:', blobObject.id, 'end epoch:', blobObject.storage.end_epoch);

	console.log('\n=== extend with cached price +2% (expect success) ===');
	try {
		const client = makeClient();
		patchSystemStatePrice(client, 102n, 100n);
		const { digest } = await client.walrus.executeExtendBlobTransaction({
			blobObjectId: blobObject.id,
			epochs: 1,
			signer: keypair,
		});
		console.log('  SUCCESS, digest:', digest);
	} catch (err) {
		failures += 1;
		console.log('  FAILED:', (err as Error).message);
	}

	console.log('\n=== extend with cached price -15% (expect StalePriceError, then success) ===');
	try {
		const client = makeClient();
		const state = patchSystemStatePrice(client, 85n, 100n);
		try {
			await client.walrus.executeExtendBlobTransaction({
				blobObjectId: blobObject.id,
				epochs: 1,
				signer: keypair,
			});
			failures += 1;
			console.log('  UNEXPECTED SUCCESS (expected StalePriceError)');
		} catch (err) {
			console.log('  first attempt failed with:', (err as Error).constructor.name);
			console.log('  reset() calls (should be >= 1):', state.resetCalls);
			if (!(err instanceof StalePriceError) || state.resetCalls === 0) {
				failures += 1;
				console.log('  UNEXPECTED error type or missing cache reset:', (err as Error).message);
			} else {
				const { digest } = await client.walrus.executeExtendBlobTransaction({
					blobObjectId: blobObject.id,
					epochs: 1,
					signer: keypair,
				});
				console.log('  SUCCESS on new attempt with fresh prices, digest:', digest);
			}
		}
	} catch (err) {
		failures += 1;
		console.log('  FAILED:', (err as Error).message);
	}

	console.log(failures === 0 ? '\nALL EXTEND SCENARIOS PASSED' : `\n${failures} FAILED`);
	process.exit(failures === 0 ? 0 : 1);
}

main();
