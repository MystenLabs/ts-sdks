// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { walrus } from '../../src/client.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(walrus());

(async function main() {
	const blobId = 'zaa1LYnJzLNYrm7RA_CwnkDxX4PKArAJVKKaEK_ct14';
	const patchId = 'zaa1LYnJzLNYrm7RA_CwnkDxX4PKArAJVKKaEK_ct14BAQACAA';
	const patchId2 = 'zaa1LYnJzLNYrm7RA_CwnkDxX4PKArAJVKKaEK_ct14BAgADAA';

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
