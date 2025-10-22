// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

import { walrus } from '../../src/client.js';

const client = new SuiJsonRpcClient({
	url: getJsonRpcFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(walrus());

export async function retrieveBlob(blobId: string) {
	const blobBytes = await client.walrus.readBlob({ blobId });
	return new Blob([new Uint8Array(blobBytes)]);
}

(async function main() {
	const blob = await retrieveBlob('OFrKO0ofGc4inX8roHHaAB-pDHuUiIA08PW4N2B2gFk');

	const textDecoder = new TextDecoder('utf-8');
	const resultString = textDecoder.decode(await blob.arrayBuffer());

	console.log(resultString);
})();
