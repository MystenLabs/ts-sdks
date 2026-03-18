// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { walrus } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';
import { WalrusFile } from '../../src/index.js';
import type { WriteBlobStep } from '../../src/types.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(walrus());

async function resumableFilesUpload() {
	const keypair = await getFundedKeypair();
	const files = [
		WalrusFile.from({
			contents: new TextEncoder().encode('File A - ' + Date.now()),
			identifier: 'file-a.txt',
		}),
		WalrusFile.from({
			contents: new TextEncoder().encode('File B - ' + Date.now()),
			identifier: 'file-b.txt',
		}),
	];

	// Step 1: Start upload, save checkpoint after register, then "crash"
	const flow1 = client.walrus.writeFilesFlow({ files });
	let savedCheckpoint: WriteBlobStep | undefined;

	for await (const step of flow1.run({
		signer: keypair,
		epochs: 3,
		deletable: true,
	})) {
		savedCheckpoint = step;
		console.log(`Step: ${step.step}`);

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
	const flow2 = client.walrus.writeFilesFlow({
		files,
		resume: savedCheckpoint,
	});

	for await (const step of flow2.run({
		signer: keypair,
		epochs: 3,
		deletable: true,
	})) {
		console.log(`Resumed step: ${step.step}`);
	}

	const fileRefs = await flow2.listFiles();
	console.log(
		'Resume complete, files:',
		fileRefs.map((f) => f.id),
	);
	return fileRefs;
}

resumableFilesUpload();
