// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { walrus } from '../../src/client.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(walrus());

(async function main() {
	const blobId = 'gmh2YbU_feDPaGeFkYFo2Si--GbM2hkajS54X1vfNIk';
	const patchId = 'gmh2YbU_feDPaGeFkYFo2Si--GbM2hkajS54X1vfNIkBAQACAA';
	const patchId2 = 'gmh2YbU_feDPaGeFkYFo2Si--GbM2hkajS54X1vfNIkBAgADAA';

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
