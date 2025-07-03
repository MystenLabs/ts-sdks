// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';
import { QuiltReader } from '../../src/read/quilt.js';

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(WalrusClient.experimental_asClientExtension());

(async function main() {
	const reader = new QuiltReader({
		client: client.walrus,
		blobId: 'NqQqVflKKk2ekbO9WsCsMYeOTWUMvOV4cvpvoD7mUKg',
		numShards: 1000,
	});
	const data = await reader.readByPatchId('NqQqVflKKk2ekbO9WsCsMYeOTWUMvOV4cvpvoD7mUKgBAQAOAA');
	console.log(data.identifier);
	console.log(data.tags);
	console.log(new TextDecoder().decode(data.blobContents));
	const metadata = await reader.readIndex();
	console.log(metadata);

	await reader.getFullBlob();

	const index = await reader.readIndex();
	console.log(index);
	const data2 = await reader.readByPatchId('NqQqVflKKk2ekbO9WsCsMYeOTWUMvOV4cvpvoD7mUKgBAQAOAA');
	console.log(data2.identifier);
	console.log(data2.tags);
	console.log(new TextDecoder().decode(data2.blobContents));
})();
