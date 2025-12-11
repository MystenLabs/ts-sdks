// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Agent, setGlobalDispatcher } from 'undici';

import { walrus } from '../../src/client.js';
import { getFundedKeypair } from '../funded-keypair.js';
import { WalrusFile } from '../../src/index.js';

// Node connect timeout is 10 seconds, and walrus nodes can be slow to respond
setGlobalDispatcher(
	new Agent({
		connectTimeout: 60_000,
		connect: { timeout: 60_000 },
	}),
);

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(
	walrus({
		storageNodeClientOptions: {
			timeout: 60_000,
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
		WalrusFile.from({
			contents: new TextEncoder().encode('a'.repeat(1000)),
			identifier: 'test3',
		}),
	];

	const quilt = await client.walrus.writeFiles({
		files,
		deletable: true,
		epochs: 3,
		signer: keypair,
	});

	console.log(quilt);
}

uploadFile().catch(console.error);
