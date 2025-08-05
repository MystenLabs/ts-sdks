// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Agent, setGlobalDispatcher } from 'undici';

import { WalrusClient } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';
import type { Signer } from '@mysten/sui/cryptography';

// Node connect timeout is 10 seconds, and walrus nodes can be slow to respond
setGlobalDispatcher(
	new Agent({
		connectTimeout: 60_000,
		connect: { timeout: 60_000 },
	}),
);

interface BenchmarkResult {
	run: number;
	size: number;
	encodeTime: number;
	registerTime: number;
	uploadTime: number;
	certifyTime: number;
	totalTime: number;
	blobId: string;
}

async function runSingleBenchmark(
	client: SuiClient & { walrus: WalrusClient },
	signer: Signer,
	size: number,
	epochs: number,
	runNumber: number,
): Promise<BenchmarkResult> {
	// Create zero-filled data of the specified size
	const data = new Uint8Array(size);

	// Add unique header to prevent caching
	const timestamp = Date.now();
	const runInfo = new TextEncoder().encode(`Benchmark run ${runNumber} at ${timestamp}\n`);
	data.set(runInfo, 0);

	const startTime = performance.now();
	let encodeTime = 0;
	let registerTime = 0;
	let uploadTime = 0;
	let certifyTime = 0;

	// Create the blob upload flow
	const flow = client.walrus.writeBlobFlow({ blob: data });

	// Step 1: Encode
	const encodeStart = performance.now();
	await flow.encode();
	encodeTime = performance.now() - encodeStart;

	// Step 2: Register
	const registerStart = performance.now();
	const { digest: registerDigest } = await client.signAndExecuteTransaction({
		transaction: flow.register({
			epochs,
			deletable: false,
			owner: signer.toSuiAddress(),
		}),
		signer,
	});
	registerTime = performance.now() - registerStart;

	// Step 3: Upload
	const uploadStart = performance.now();
	await flow.upload({ digest: registerDigest });
	uploadTime = performance.now() - uploadStart;

	// Step 4: Certify
	const certifyStart = performance.now();
	await client.signAndExecuteTransaction({
		transaction: flow.certify(),
		signer,
	});
	certifyTime = performance.now() - certifyStart;

	// Get the blob info
	const { blobId } = await flow.getBlob();
	const totalTime = performance.now() - startTime;

	return {
		run: runNumber,
		size,
		encodeTime,
		registerTime,
		uploadTime,
		certifyTime,
		totalTime,
		blobId,
	};
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDuration(ms: number): string {
	if (ms < 1000) return ms.toFixed(2) + ' ms';
	return (ms / 1000).toFixed(2) + ' s';
}

function printResults(results: BenchmarkResult[]) {
	console.log('\nBenchmark Results:');
	console.log('==================');

	// Print individual run results
	results.forEach((result) => {
		console.log(`\nRun ${result.run}:`);
		console.log(`  Blob ID: ${result.blobId}`);
		console.log(`  Encode time:   ${formatDuration(result.encodeTime)}`);
		console.log(`  Register time: ${formatDuration(result.registerTime)}`);
		console.log(`  Upload time:   ${formatDuration(result.uploadTime)}`);
		console.log(`  Certify time:  ${formatDuration(result.certifyTime)}`);
		console.log(`  Total time:    ${formatDuration(result.totalTime)}`);
	});

	// Calculate and print statistics
	if (results.length > 1) {
		const avgEncode = results.reduce((sum, r) => sum + r.encodeTime, 0) / results.length;
		const avgRegister = results.reduce((sum, r) => sum + r.registerTime, 0) / results.length;
		const avgUpload = results.reduce((sum, r) => sum + r.uploadTime, 0) / results.length;
		const avgCertify = results.reduce((sum, r) => sum + r.certifyTime, 0) / results.length;
		const avgTotal = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;

		console.log('\nAverage Times:');
		console.log('==============');
		console.log(`  Encode:   ${formatDuration(avgEncode)}`);
		console.log(`  Register: ${formatDuration(avgRegister)}`);
		console.log(`  Upload:   ${formatDuration(avgUpload)}`);
		console.log(`  Certify:  ${formatDuration(avgCertify)}`);
		console.log(`  Total:    ${formatDuration(avgTotal)}`);

		const throughput = (results[0].size * results.length) / ((avgTotal * results.length) / 1000);
		console.log(`\nThroughput: ${formatBytes(throughput)}/s`);
	}
}

function parseSize(sizeStr: string): number {
	const str = sizeStr.toUpperCase();
	if (str.endsWith('KB')) {
		return parseFloat(str.slice(0, -2)) * 1024;
	} else if (str.endsWith('MB')) {
		return parseFloat(str.slice(0, -2)) * 1024 * 1024;
	} else if (str.endsWith('GB')) {
		return parseFloat(str.slice(0, -2)) * 1024 * 1024 * 1024;
	} else if (str.endsWith('B')) {
		return parseFloat(str.slice(0, -1));
	}
	return parseFloat(str);
}

function printUsage() {
	console.log('Usage: tsx index.ts [options]');
	console.log('Options:');
	console.log('  --runs <number>         Number of benchmark runs (default: 1)');
	console.log(
		'  --size <size>           Size of blob to upload (e.g., 1024, 1KB, 1MB) (default: 1MB)',
	);
	console.log('  --no-relay              Use direct node upload instead of upload relay');
	console.log('  --epochs <number>       Number of epochs to store the blob (default: 5)');
	console.log('  --help                  Show this help message');
}

async function main() {
	// Parse command line arguments
	const args = process.argv.slice(2);
	let runs = 1;
	let size = '1MB';
	let useUploadRelay = true;
	let epochs = 5;

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--runs':
				runs = parseInt(args[++i]);
				break;
			case '--size':
				size = args[++i];
				break;
			case '--no-relay':
				useUploadRelay = false;
				break;
			case '--epochs':
				epochs = parseInt(args[++i]);
				break;
			case '--help':
				printUsage();
				process.exit(0);
			default:
				console.error(`Unknown option: ${args[i]}`);
				printUsage();
				process.exit(1);
		}
	}

	const sizeInBytes = parseSize(size);

	console.log('Walrus Blob Upload Benchmark');
	console.log('============================');
	console.log(`Runs: ${runs}`);
	console.log(`Blob size: ${formatBytes(sizeInBytes)}`);
	console.log(`Upload method: ${useUploadRelay ? 'Upload Relay' : 'Direct to Nodes'}`);
	console.log(`Storage epochs: ${epochs}`);
	console.log('');

	try {
		// Get signer
		const signer = await getFundedKeypair();

		// Create Sui client with Walrus extension
		const client = new SuiClient({
			url: getFullnodeUrl('testnet'),
			network: 'testnet',
		}).$extend(
			WalrusClient.experimental_asClientExtension(
				useUploadRelay
					? {
							uploadRelay: {
								host:
									process.env.WALRUS_UPLOAD_RELAY_URL ||
									'https://upload-relay.testnet.walrus.space',
								sendTip: { max: 1000000 },
							},
							storageNodeClientOptions: {
								timeout: 60_000,
							},
						}
					: {
							storageNodeClientOptions: {
								timeout: 60_000,
							},
						},
			),
		);

		// Run benchmarks
		const results: BenchmarkResult[] = [];
		for (let i = 1; i <= runs; i++) {
			console.log(`Running benchmark ${i}/${runs}...`);
			const result = await runSingleBenchmark(client, signer, sizeInBytes, epochs, i);
			results.push(result);
		}

		// Print results
		printResults(results);
	} catch (error) {
		console.error('Benchmark failed:', error);
		process.exit(1);
	}
}

main().catch(console.error);
