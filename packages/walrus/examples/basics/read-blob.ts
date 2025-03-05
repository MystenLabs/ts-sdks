// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';

/** @ts-ignore */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const suiClient = new SuiClient({
	url: getFullnodeUrl('testnet'),
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
	const blob = await retrieveBlob('vFB2qz768MTocyT00s0TdjicmEmSHP3HTmvBVKk9v2M');

	const textDecoder = new TextDecoder('utf-8');
	const resultString = textDecoder.decode(await blob?.arrayBuffer());

	console.log(resultString);
})();
