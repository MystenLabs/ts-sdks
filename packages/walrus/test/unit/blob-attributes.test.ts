// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ObjectError } from '@mysten/sui/client';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { describe, expect, it } from 'vitest';

import { WalrusClient } from '../../src/client.js';
import { Metadata } from '../../src/contracts/walrus/metadata.js';

const BLOB_OBJECT_ID = '0xfb0051bd26e3f9d0efdb175ee274d6c207761577b67567057a7a72bec1060fd5';

// Just enough of a Sui client for readBlobAttributes: the blob's "metadata" dynamic field
function clientWith(getDynamicField: () => Promise<unknown>) {
	const suiClient = {
		cache: { scope: () => ({}) },
		core: { getDynamicField },
	} as unknown as ClientWithCoreApi;
	return new WalrusClient({ network: 'testnet', suiClient });
}

describe('readBlobAttributes', () => {
	it('returns null for a blob that has no attributes yet', async () => {
		const client = clientWith(async () => {
			throw new ObjectError('notExists', `Object ${BLOB_OBJECT_ID} not found`, {
				reason: 'notFound',
				objectId: BLOB_OBJECT_ID,
			});
		});

		expect(await client.readBlobAttributes({ blobObjectId: BLOB_OBJECT_ID })).toBeNull();
	});

	it('returns null when the metadata dynamic field was deleted', async () => {
		const client = clientWith(async () => {
			throw new ObjectError('deleted', 'Metadata dynamic field has been deleted', {
				reason: 'deleted',
			});
		});

		expect(await client.readBlobAttributes({ blobObjectId: BLOB_OBJECT_ID })).toBeNull();
	});

	it('propagates object errors with an unknown reason', async () => {
		const error = new ObjectError('INTERNAL', 'Lookup failed', { reason: 'unknown' });
		const client = clientWith(async () => {
			throw error;
		});

		await expect(client.readBlobAttributes({ blobObjectId: BLOB_OBJECT_ID })).rejects.toBe(error);
	});

	it('still throws other errors', async () => {
		const client = clientWith(async () => {
			throw new Error('network down');
		});

		await expect(client.readBlobAttributes({ blobObjectId: BLOB_OBJECT_ID })).rejects.toThrow(
			'network down',
		);
	});

	it('returns the attributes a blob has', async () => {
		const bcs = Metadata.serialize({
			metadata: { contents: [{ key: 'content-type', value: 'text/plain' }] },
		}).toBytes();
		const client = clientWith(async () => ({ dynamicField: { value: { bcs } } }));

		expect(await client.readBlobAttributes({ blobObjectId: BLOB_OBJECT_ID })).toEqual({
			'content-type': 'text/plain',
		});
	});
});
