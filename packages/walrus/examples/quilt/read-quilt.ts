// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

import { WalrusClient } from '../../src/client.js';
import { QuiltReader } from '../../src/quilt/reader.js';

const client = new SuiClient({
	url: getFullnodeUrl('testnet'),
	network: 'testnet',
}).$extend(WalrusClient.experimental_asClientExtension());

(async function main() {
	const reader = new QuiltReader({
		client: client.walrus,
		blobId: 'NqQqVflKKk2ekbO9WsCsMYeOTWUMvOV4cvpvoD7mUKg',
	});
	const data = await reader.readPatchById('NqQqVflKKk2ekbO9WsCsMYeOTWUMvOV4cvpvoD7mUKgBAQAOAA');

	console.log(data.identifier);
	console.log(data.tags);
	console.log(new TextDecoder().decode(data.blobContents));
})();
