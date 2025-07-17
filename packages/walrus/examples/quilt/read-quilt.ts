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

	const patch1 = await quiltReader.readerForPatchId(
		'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRkBAQACAA',
	);
	console.log(await patch1.getIdentifier());
	console.log(await patch1.getTags());
	console.log('content:', new TextDecoder().decode(await patch1.getBytes()));
	const metadata = await quiltReader.readIndex();
	console.log(metadata);

	await blobReader.getSize();

	const index = await quiltReader.readIndex();
	console.log(index);
	const patch2 = await quiltReader.readerForPatchId(
		'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRkBAgADAA',
	);
	console.log(await patch2.getIdentifier());
	console.log(await patch2.getTags());
	console.log('content:', new TextDecoder().decode(await patch2.getBytes()));
})();
