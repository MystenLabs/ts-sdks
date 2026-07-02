// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Verification for the fix to issue #1127 (stale-price WAL payments).
//
// Simulates a stale cached price by monkey-patching systemState() on the client
// instance and confirms:
//   A. cached price HIGHER than actual  -> succeeds; remainder goes to the
//      sender's address balance instead of aborting in destroy_zero.
//   B. cached price LOWER than actual (beyond the cost buffer, stale until
//      reset()) -> first attempt aborts, is classified as StalePriceError,
//      caches reset, and the write-blob flow retries and succeeds.
//   C. cached price LOWER than actual but within the default 10% cost buffer
//      -> succeeds on the first attempt.
//   D. control run without overrides -> succeeds; the unused buffer is
//      returned to the sender's address balance.

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Agent, setGlobalDispatcher } from 'undici';

import { walrus } from '../src/client.js';
import { getFundedKeypair } from './funded-keypair.js';

setGlobalDispatcher(
	new Agent({
		connectTimeout: 60_000,
		connect: { timeout: 60_000 },
	}),
);

const WAL_TYPE = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';

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

/**
 * Simulate a stale cache: systemState() reports prices scaled by numer/denom
 * until client.reset() is called (like a real stale cache, which is cleared by
 * reset). Returns counters for observing what happened.
 */
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
		console.log('  client.reset() called -> cache now returns real prices');
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

async function walBalance(owner: string) {
	const suiClient = new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'https://fullnode.testnet.sui.io:443',
	});
	const { balance } = await suiClient.getBalance({ owner, coinType: WAL_TYPE });
	return { total: BigInt(balance.balance), address: BigInt(balance.addressBalance) };
}

async function writeSmallBlob(
	client: ReturnType<typeof makeClient>,
	keypair: Awaited<ReturnType<typeof getFundedKeypair>>,
	tag: string,
) {
	const blob = new TextEncoder().encode('verify 1127 fix ' + tag + ' ' + Date.now());
	return client.walrus.writeBlob({
		blob,
		epochs: 1,
		deletable: true,
		signer: keypair,
	});
}

async function main() {
	const keypair = await getFundedKeypair();
	const address = keypair.toSuiAddress();
	console.log('address:', address);
	console.log('WAL balance:', await walBalance(address));

	let failures = 0;

	// Scenario A: cached price INFLATED +2%. Previously aborted in destroy_zero.
	console.log('\n=== A: cached price +2% (expect success, remainder to address balance) ===');
	try {
		const client = makeClient();
		patchSystemStatePrice(client, 102n, 100n);
		const before = await walBalance(address);
		const res = await writeSmallBlob(client, keypair, 'inflated');
		const after = await walBalance(address);
		console.log('  SUCCESS, blobId:', res.blobId);
		console.log('  WAL spent:', before.total - after.total);
		console.log('  address balance delta:', after.address - before.address);
	} catch (err) {
		failures += 1;
		console.log('  FAILED:', (err as Error).message);
	}

	// Scenario B: cached price DEFLATED -15% (beyond the 10% buffer), stale until reset.
	console.log('\n=== B: cached price -15%, stale until reset (expect retry, then success) ===');
	try {
		const client = makeClient();
		const state = patchSystemStatePrice(client, 85n, 100n);
		const res = await writeSmallBlob(client, keypair, 'deflated-beyond-buffer');
		console.log('  SUCCESS, blobId:', res.blobId);
		console.log('  reset() calls (should be >= 1, proving retry path):', state.resetCalls);
		if (state.resetCalls === 0) {
			failures += 1;
			console.log('  UNEXPECTED: succeeded without hitting the retry path');
		}
	} catch (err) {
		failures += 1;
		console.log('  FAILED:', (err as Error).message);
	}

	// Scenario C: cached price DEFLATED -0.5% (within the default 10% buffer).
	console.log('\n=== C: cached price -0.5%, within buffer (expect success, no retry) ===');
	try {
		const client = makeClient();
		const state = patchSystemStatePrice(client, 995n, 1000n);
		const res = await writeSmallBlob(client, keypair, 'deflated-within-buffer');
		console.log('  SUCCESS, blobId:', res.blobId);
		console.log('  reset() calls (should be 0):', state.resetCalls);
		if (state.resetCalls > 0) {
			failures += 1;
			console.log('  UNEXPECTED: retry path was hit');
		}
	} catch (err) {
		failures += 1;
		console.log('  FAILED:', (err as Error).message);
	}

	// Control: no overrides.
	console.log('\n=== D: control, no override (expect success) ===');
	try {
		const client = makeClient();
		const before = await walBalance(address);
		const res = await writeSmallBlob(client, keypair, 'control');
		const after = await walBalance(address);
		console.log('  SUCCESS, blobId:', res.blobId);
		console.log('  WAL spent:', before.total - after.total);
		console.log('  address balance delta:', after.address - before.address);
	} catch (err) {
		failures += 1;
		console.log('  FAILED:', (err as Error).message);
	}

	console.log(failures === 0 ? '\nALL SCENARIOS PASSED' : `\n${failures} SCENARIO(S) FAILED`);
	process.exit(failures === 0 ? 0 : 1);
}

main();
