// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { walrus } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';
import type { WriteBlobStep } from '../../src/types.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(
	walrus({
		uploadRelay: {
			host: 'https://upload-relay.testnet.walrus.space',
			sendTip: {
				max: 1_000,
			},
		},
	}),
);

async function resumableUpload() {
	const keypair = await getFundedKeypair();
	const blob = new TextEncoder().encode('Resume test - ' + Date.now());

	// Step 1: Start upload, save checkpoint after register, then "crash"
	const flow1 = client.walrus.writeBlobFlow({ blob });
	let savedCheckpoint: WriteBlobStep | undefined;

	for await (const step of flow1.run({
		signer: keypair,
		epochs: 3,
		deletable: true,
	})) {
		savedCheckpoint = step;
		console.log(`Step: ${step.step}`);

		// Simulate crash after registration (before upload completes)
		if (step.step === 'registered') {
			console.log('Simulating crash after register! blobObjectId:', step.blobObjectId);
			break;
		}
	}

	if (!savedCheckpoint || savedCheckpoint.step !== 'registered') {
		throw new Error('Expected to have a registered checkpoint');
	}

	// Step 2: Resume from the saved checkpoint
	console.log('\nResuming from checkpoint...');
	const flow2 = client.walrus.writeBlobFlow({
		blob, // Same blob data
		resume: savedCheckpoint, // Pass saved state
	});

	for await (const step of flow2.run({
		signer: keypair,
		epochs: 3,
		deletable: true,
	})) {
		console.log(`Resumed step: ${step.step}`);
		// Register is skipped since we already have a blobObjectId
	}

	const result = await flow2.getBlob();
	console.log('Resume complete:', result.blobId);
	return result;
}

resumableUpload();
