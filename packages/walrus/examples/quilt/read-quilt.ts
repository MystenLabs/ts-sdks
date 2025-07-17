// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';
import { BlobReader } from '../../src/quilt/reader.js';

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(WalrusClient.experimental_asClientExtension());

(async function main() {
	const blobReader = new BlobReader({
		client: client.walrus,
		blobId: 'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRk',
		numShards: 1000,
	});

	const quiltReader = await blobReader.getQuiltReader();

	const data = await quiltReader.readByPatchId(
		'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRkBAQACAA',
	);
	console.log(data.identifier);
	console.log(data.tags);
	console.log('content:', new TextDecoder().decode(data.blobContents));
	const metadata = await quiltReader.readIndex();
	console.log(metadata);

	await blobReader.getFullBlob();

	const index = await quiltReader.readIndex();
	console.log(index);
	const data2 = await quiltReader.readByPatchId(
		'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRkBAgADAA',
	);
	console.log(data2.identifier);
	console.log(data2.tags);
	console.log('content:', new TextDecoder().decode(data2.blobContents));
})();
