// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';

const suiClient = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
});

const walrusClient = new WalrusClient({
	network: 'testnet',
	suiClient,
});

export async function retrieveBlob(blobId: string) {
	const blobBytes = await walrusClient.readBlob({ blobId });
	return new Blob([new Uint8Array(blobBytes)]);
}

(async function main() {
	const blob = await retrieveBlob('OFrKO0ofGc4inX8roHHaAB-pDHuUiIA08PW4N2B2gFk');

	const textDecoder = new TextDecoder('utf-8');
	const resultString = textDecoder.decode(await blob.arrayBuffer());

	console.log(resultString);
})();
