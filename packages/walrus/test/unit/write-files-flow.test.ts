// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import type { WalrusClient } from '../../src/client.js';
import { WalrusFile } from '../../src/files/file.js';
import { createWriteBlobFlow } from '../../src/flows/write-blob.js';
import type { WriteBlobFlowContext } from '../../src/flows/write-blob.js';
import { createWriteFilesFlow } from '../../src/flows/write-files.js';
import type {
	WriteBlobFlowOptions,
	WriteBlobStep,
	WriteBlobStepUploaded,
} from '../../src/types.js';
import { CertificateBcs } from '../../src/utils/bcs.js';
import { encodeQuilt, encodeQuiltPatchId } from '../../src/utils/quilts.js';

const BLOB_ID = 'g6q_-DZG0i7saDXXWfinoFh43VdHbfcXg9CKeCZv7zc';
const BLOB_OBJECT_ID = '0xf7592caa27f4162fcb24a2f72fad71450af57de5f0aa69e56ea2151b5fe9624c';

const blobObject = {
	id: BLOB_OBJECT_ID,
	registered_epoch: 538,
	blob_id: '0',
	size: '34',
	encoding_type: 1,
	certified_epoch: null,
	storage: { id: '0x1', start_epoch: 538, end_epoch: 543, storage_size: '66034000' },
	deletable: true,
};

// Just enough of a WalrusClient and flow context to drive the real flows without a network
function setup() {
	const executed: string[] = [];
	const ctx: WriteBlobFlowContext = {
		hasUploadRelay: () => false,
		executeTransaction: async (_tx, _signer, action) => {
			executed.push(action);
			return { digest: 'digest' };
		},
		getCreatedBlob: async () => blobObject as never,
		loadBlobObject: async () => ({ ...blobObject, certified_epoch: 538 }) as never,
	};
	const client = {
		encodeQuilt: async ({ blobs }: { blobs: Parameters<typeof encodeQuilt>[0]['blobs'] }) =>
			encodeQuilt({ blobs, numShards: 1000 }),
		writeBlobFlow: (options: WriteBlobFlowOptions) =>
			createWriteBlobFlow(client as unknown as WalrusClient, ctx, options),
		getBlobObject: async () => blobObject,
		certifyBlobTransaction: () => new Transaction(),
	};
	return { client: client as unknown as WalrusClient, executed };
}

const files = () => [
	WalrusFile.from({ contents: new TextEncoder().encode('first'), identifier: 'one.txt' }),
	WalrusFile.from({ contents: new TextEncoder().encode('second'), identifier: 'two.txt' }),
];

describe('writeFilesFlow resume', () => {
	it('certifies and lists the files when resuming from the uploaded step', async () => {
		const { client, executed } = setup();
		const resume: WriteBlobStepUploaded = {
			step: 'uploaded',
			blobId: BLOB_ID,
			blobObjectId: BLOB_OBJECT_ID,
			txDigest: 'register-digest',
			certificate: CertificateBcs.serialize({
				signers: [0, 1, 2],
				serializedMessage: new Uint8Array([1, 2, 3]),
				signature: new Uint8Array(48),
			}).toBase64(),
		};

		const flow = createWriteFilesFlow(client, { files: files(), resume });
		const steps: WriteBlobStep[] = [];
		for await (const step of flow.run({
			signer: { toSuiAddress: () => '0x2' } as never,
			epochs: 1,
			deletable: true,
		})) {
			steps.push(step);
		}

		// Nothing registered or uploaded again: only the certification was left
		expect(executed).toEqual(['certify blob']);
		expect(steps.map((s) => s.step)).toEqual(['certified']);

		const { index } = encodeQuilt({
			blobs: [
				{ contents: new TextEncoder().encode('first'), identifier: 'one.txt' },
				{ contents: new TextEncoder().encode('second'), identifier: 'two.txt' },
			],
			numShards: 1000,
		});
		const listed = await flow.listFiles();
		expect(listed.map((f) => f.id)).toEqual(
			index.patches.map((patch) =>
				encodeQuiltPatchId({
					quiltId: BLOB_ID,
					patchId: { version: 1, startIndex: patch.startIndex, endIndex: patch.endIndex },
				}),
			),
		);
		expect(listed.every((f) => f.blobId === BLOB_ID)).toBe(true);
	});
});
