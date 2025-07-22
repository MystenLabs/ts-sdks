// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Agent, setGlobalDispatcher } from 'undici';

import { WalrusClient } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';
import { WalrusFile } from '../../src/index.js';

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
	WalrusClient.experimental_asClientExtension({
		storageNodeClientOptions: {
			timeout: 60_000,
		},
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

	const files = [
		WalrusFile.from({
			contents: new TextEncoder().encode('test 1'),
			identifier: 'test1',
			tags: {
				a: 'a',
				aa: 'aa',
				b: 'b',
			},
		}),
		WalrusFile.from({
			contents: new TextEncoder().encode('test 2'),
			identifier: 'test2',
		}),
	];

	const flow = await client.walrus.writeFilesFlow({
		files,
		deletable: true,
		epochs: 3,
		owner: keypair.toSuiAddress(),
	});

	await flow.encode();

	await client.signAndExecuteTransaction({
		transaction: flow.register(),
		signer: keypair,
	});

	await flow.upload();

	await client.signAndExecuteTransaction({
		transaction: flow.certify(),
		signer: keypair,
	});

	const result = await flow.listFiles();

	console.log(result);
}

uploadFile().catch(console.error);
