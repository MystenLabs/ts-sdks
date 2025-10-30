// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

import { walrus } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';

const client = new SuiJsonRpcClient({
	url: getJsonRpcFullnodeUrl('testnet'),
	network: 'testnet',
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

async function uploadFile() {
	const keypair = await getFundedKeypair();

	const file = new TextEncoder().encode('Hello from the TS SDK!!!\n');

	const { blobId, blobObject } = await client.walrus.writeBlob({
		blob: file,
		deletable: true,
		epochs: 3,
		signer: keypair,
	});

	console.log(blobId, blobObject);
}

uploadFile().catch(console.error);
