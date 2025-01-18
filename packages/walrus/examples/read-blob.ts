// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../src/client.js';
import { computeMetadata } from '../src/wasm.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const suiClient = new SuiClient({
	url: getFullnodeUrl('testnet'),
});

const walrusClient = new WalrusClient({
	network: 'testnet',
	suiClient,
});

export async function retrieveBlob(blobId: string) {
	const systemState = await walrusClient.systemState();
	const blobBytes = await walrusClient.readBlob(blobId);

	const reconstructedBlobMetadata = computeMetadata(systemState.committee.n_shards, blobBytes);
	if (reconstructedBlobMetadata.blob_id !== blobId) {
		console.log('inconsistent blob -- try more slivers');
		return null;
	}

	return new Blob([new Uint8Array(blobBytes)]);
}

(async function main() {
	const blob = await retrieveBlob('ssRKJFOCc-orFBKExBbNZs6z8y4IhTPqY-D6bSLYI98');

	// Convert Uint8Array to string using TextDecoder
	const textDecoder = new TextDecoder('utf-8'); // Specify encoding, e.g., "utf-8"
	const resultString = textDecoder.decode(await blob?.arrayBuffer());

	console.log('res', resultString);
})();
