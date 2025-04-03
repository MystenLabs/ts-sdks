// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';

const suiClient = new SuiClient({
	url: getFullnodeUrl('testnet'),
});

const walrusClient = new WalrusClient({
	network: 'testnet',
	suiClient,
});

async function uploadFile() {
	const keypair = await getFundedKeypair();

	const file = new TextEncoder().encode('Hello from the TS SDK!!!\n');

	const { blobId, blobObject } = await walrusClient.writeBlob({
		blob: file,
		deletable: true,
		epochs: 3,
		signer: keypair,
		attributes: {
			contentType: 'text/plain',
			contentLength: file.length.toString(),
		},
	});

	console.log(blobId);

	const attributes = await walrusClient.readBlobAttributes({
		blobObjectId: blobObject.id.id,
	});

	console.log(attributes);

	await walrusClient.executeWriteBlobAttributesTransaction({
		signer: keypair,
		blobObjectId: blobObject.id.id,
		attributes: {
			contentLength: null,
			updated: 'true',
		},
	});

	const updatedAttributes = await walrusClient.readBlobAttributes({
		blobObjectId: blobObject.id.id,
	});

	console.log(updatedAttributes);
}

uploadFile().catch(console.error);
