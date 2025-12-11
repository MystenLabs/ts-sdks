// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { walrus } from '../../src/client.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(walrus());

export async function retrieveBlob(blobId: string) {
	const blobBytes = await client.walrus.readBlob({ blobId });
	return new Blob([new Uint8Array(blobBytes)]);
}

(async function main() {
	const blob = await retrieveBlob('Io6fwE14GPGF_XUvDffBfDrgSJ1bFg4144CzWJK-W6U');

	const textDecoder = new TextDecoder('utf-8');
	const resultString = textDecoder.decode(await blob.arrayBuffer());

	console.log(resultString);
})();
