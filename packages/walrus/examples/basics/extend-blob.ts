// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Agent, setGlobalDispatcher } from 'undici';

import { walrus } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';

// Node connect timeout is 10 seconds, and walrus nodes can be slow to respond
setGlobalDispatcher(
	new Agent({
		connectTimeout: 60_000,
		connect: { timeout: 60_000 },
	}),
);

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(
	walrus({
		storageNodeClientOptions: {
			timeout: 60_000,
		},
	}),
);

async function writeAndExtendBlob() {
	const keypair = await getFundedKeypair();

	const file = new TextEncoder().encode('Hello from the TS SDK - testing extendBlob fix!\n');

	const { blobObject } = await client.walrus.writeBlob({
		blob: file,
		deletable: false, // Non-deletable blob so we can extend it
		epochs: 1, // Start with 1 epoch
		signer: keypair,
	});

	await client.walrus.executeExtendBlobTransaction({
		blobObjectId: blobObject.id,
		epochs: 2, // Extend by 2 more epochs
		signer: keypair,
	});

	console.log('extended blob', blobObject.blob_id);
}

writeAndExtendBlob().catch(console.error);
