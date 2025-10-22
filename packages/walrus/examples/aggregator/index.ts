// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { serve } from '@hono/node-server';
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Hono } from 'hono';

import { BlobBlockedError, BlobNotCertifiedError, WalrusClient } from '../../src/index.js';

const app = new Hono();

const suiClient = new SuiJsonRpcClient({
	url: getJsonRpcFullnodeUrl('testnet'),
});

const walrusClient = new WalrusClient({
	network: 'testnet',
	suiClient,
});

const cache = new Map<string, Blob>();

app.get('/v1/blobs/:id', async (c) => {
	const blobId = c.req.param('id');

	if (!blobId) {
		return c.json({ error: 'Missing blob id' }, 400);
	}

	if (cache.has(blobId)) {
		return c.body(cache.get(blobId)!.stream());
	}

	try {
		const blob = await walrusClient.readBlob({ blobId });
		cache.set(blobId, new Blob([blob]));

		return c.body(blob.buffer as ArrayBuffer);
	} catch (error) {
		if (error instanceof BlobBlockedError || error instanceof BlobNotCertifiedError) {
			return c.json({ error: 'Blob not found' }, 404);
		}

		return c.json({ error: 'Internal server error' }, 500);
	}
});

serve(app, (info) => {
	console.log(`Server is running on http://127.0.0.1:${info.port}`);
});
