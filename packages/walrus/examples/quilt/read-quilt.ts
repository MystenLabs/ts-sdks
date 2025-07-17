// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(WalrusClient.experimental_asClientExtension());

(async function main() {
	const blobId = 'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRk';
	const patchId = 'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRkBAQACAA';
	const patchId2 = 'nBENQqV1TwBw2BtW3T2h_jHPd49KeVaYGGd84D9JuRkBAgADAA';

	const [blob, patch1, patch2] = await client.walrus.getFiles({
		ids: [blobId, patchId, patchId2],
	});

	console.log(await patch1.getIdentifier());
	console.log(await patch1.getTags());
	console.log('content:', new TextDecoder().decode(await patch1.bytes()));

	await blob.bytes();

	console.log(await patch2.getIdentifier());
	console.log(await patch2.getTags());
	console.log('content:', new TextDecoder().decode(await patch2.bytes()));
})();
