// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { WalrusClient } from '../../src/client.js';
import type { Blob } from '../../src/contracts/walrus/blob.js';
import { WalrusFile } from '../../src/files/file.js';
import { createWriteBlobFlow } from '../../src/flows/write-blob.js';
import type { WriteBlobFlowContext } from '../../src/flows/write-blob.js';
import { createWriteFilesFlow } from '../../src/flows/write-files.js';
import type { WriteBlobFlowOptions, WriteBlobStep } from '../../src/types.js';
import { CertificateBcs } from '../../src/utils/bcs.js';
import { getWasmBindings } from '../../src/wasm.js';
import { encodeQuilt, encodeQuiltPatchId } from '../../src/utils/quilts.js';

const BLOB_ID = 'g6q_-DZG0i7saDXXWfinoFh43VdHbfcXg9CKeCZv7zc';
const BLOB_OBJECT_ID = '0xf7592caa27f4162fcb24a2f72fad71450af57de5f0aa69e56ea2151b5fe9624c';
const NONCE = new Uint8Array(32).fill(7);
const CERTIFICATE = {
	signers: [0, 1, 2],
	serializedMessage: new Uint8Array([1, 2, 3]),
	signature: new Uint8Array(48),
};
const signer = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(1));

function setup(hasUploadRelay = false, deletable = true) {
	const blobObject = {
		id: BLOB_OBJECT_ID,
		registered_epoch: 538,
		blob_id: '0',
		size: '34',
		encoding_type: 1,
		certified_epoch: null,
		storage: { id: '0x1', start_epoch: 538, end_epoch: 543, storage_size: '66034000' },
		deletable,
	} satisfies (typeof Blob)['$inferType'];
	const certifiedBlobObject = { ...blobObject, certified_epoch: 538 };
	const ctx = {
		hasUploadRelay: () => hasUploadRelay,
		executeTransaction: vi.fn<WriteBlobFlowContext['executeTransaction']>(async () => ({
			digest: 'register-digest',
		})),
		getCreatedBlob: vi.fn(async () => blobObject),
		loadBlobObject: vi.fn(async () => certifiedBlobObject),
	} satisfies WriteBlobFlowContext;
	// Use real flow orchestration and quilt encoding; replace network and blob encoding operations.
	const client = {
		encodeQuilt: vi.fn(async ({ blobs }: Parameters<WalrusClient['encodeQuilt']>[0]) =>
			encodeQuilt({ blobs, numShards: 1000 }),
		),
		encodeBlob: vi.fn(async () => ({
			blobId: BLOB_ID,
			rootHash: new Uint8Array(32),
			metadata: {},
			sliversByNode: [],
		})),
		computeBlobMetadata: vi.fn<WalrusClient['computeBlobMetadata']>(async ({ nonce }) => ({
			blobId: BLOB_ID,
			rootHash: new Uint8Array(32),
			metadata: { encodingType: 'RS2', unencodedLength: 34n },
			nonce: nonce ?? NONCE,
			blobDigest: async () => new Uint8Array(32),
		})),
		writeBlobFlow: (options: WriteBlobFlowOptions) => createWriteBlobFlow(walrus, ctx, options),
		writeFilesFlow: WalrusClient.prototype.writeFilesFlow,
		writeFiles: WalrusClient.prototype.writeFiles,
		getBlobObject: vi.fn(async () => blobObject),
		registerBlob: vi.fn(() => (tx: Transaction) => tx.object('0x3')),
		sendUploadRelayTip: vi.fn(() => (_tx: Transaction) => {}),
		writeBlobToUploadRelay: vi.fn(async () => ({ certificate: CERTIFICATE })),
		writeEncodedBlobToNodes: vi.fn(async () => []),
		certificateFromConfirmations: vi.fn(async () => CERTIFICATE),
		certifyBlobTransaction: vi.fn(() => new Transaction()),
	};
	const walrus = client as unknown as WalrusClient;
	return { client, walrus, ctx, certifiedBlobObject };
}

const files = () => [
	WalrusFile.from({ contents: new TextEncoder().encode('first'), identifier: 'one.txt' }),
	WalrusFile.from({ contents: new TextEncoder().encode('second'), identifier: 'two.txt' }),
];

function expectFiles(
	listed: Awaited<ReturnType<WalrusClient['writeFiles']>>,
	blobObject: (typeof Blob)['$inferType'],
) {
	const { index } = encodeQuilt({
		blobs: [
			{ contents: new TextEncoder().encode('first'), identifier: 'one.txt' },
			{ contents: new TextEncoder().encode('second'), identifier: 'two.txt' },
		],
		numShards: 1000,
	});
	expect(listed.map((file) => file.id)).toEqual(
		index.patches.map((patch) =>
			encodeQuiltPatchId({
				quiltId: BLOB_ID,
				patchId: { version: 1, startIndex: patch.startIndex, endIndex: patch.endIndex },
			}),
		),
	);
	expect(listed.every((file) => file.blobId === BLOB_ID)).toBe(true);
	for (const file of listed) {
		expect(file.blobObject).toEqual(blobObject);
	}
}

for (const hasUploadRelay of [false, true]) {
	describe(`writeFilesFlow with ${hasUploadRelay ? 'upload relay' : 'storage nodes'}`, () => {
		for (const deletable of [false, true]) {
			it.each([undefined, 'encoded', 'registered', 'uploaded', 'certified'] as const)(
				`resumes from %s with deletable=${deletable}`,
				async (resumeStep) => {
					const { client, walrus, ctx, certifiedBlobObject } = setup(hasUploadRelay, deletable);
					const checkpoints: Record<WriteBlobStep['step'], WriteBlobStep> = {
						encoded: {
							step: 'encoded',
							blobId: BLOB_ID,
							rootHash: toBase64(new Uint8Array(32)),
							unencodedSize: 34,
							...(hasUploadRelay ? { nonce: toBase64(NONCE) } : {}),
						},
						registered: {
							step: 'registered',
							blobId: BLOB_ID,
							blobObjectId: BLOB_OBJECT_ID,
							txDigest: 'register-digest',
							...(hasUploadRelay ? { nonce: toBase64(NONCE) } : {}),
						},
						uploaded: {
							step: 'uploaded',
							blobId: BLOB_ID,
							blobObjectId: BLOB_OBJECT_ID,
							txDigest: 'register-digest',
							certificate: CertificateBcs.serialize(CERTIFICATE).toBase64(),
						},
						certified: {
							step: 'certified',
							blobId: BLOB_ID,
							blobObjectId: BLOB_OBJECT_ID,
							blobObject: certifiedBlobObject,
						},
					};
					const flow = createWriteFilesFlow(walrus, {
						files: files(),
						resume: resumeStep ? checkpoints[resumeStep] : undefined,
					});
					const signal = new AbortController().signal;
					const steps: WriteBlobStep[] = [];
					for await (const step of flow.run({
						signer,
						epochs: 1,
						deletable,
						signal,
						attributes: { custom: 'value' },
					})) {
						steps.push(step);
					}
					const allSteps = ['encoded', 'registered', 'uploaded', 'certified'];
					expect(steps.map((step) => step.step)).toEqual(
						allSteps.slice(resumeStep ? allSteps.indexOf(resumeStep) + 1 : 0),
					);
					expectFiles(await flow.listFiles(), certifiedBlobObject);
					expect(client.encodeQuilt).toHaveBeenCalledTimes(1);
					const needsRegister = !resumeStep || resumeStep === 'encoded';
					const needsUpload = needsRegister || resumeStep === 'registered';
					const needsCertify = resumeStep !== 'certified';
					expect(ctx.executeTransaction.mock.calls.map((call) => call[2])).toEqual([
						...(needsRegister ? ['register blob'] : []),
						...(needsCertify ? ['certify blob'] : []),
					]);
					expect(client.registerBlob).toHaveBeenCalledTimes(Number(needsRegister));
					if (needsRegister) {
						expect(client.registerBlob).toHaveBeenCalledWith(
							expect.objectContaining({
								epochs: 1,
								deletable,
								attributes: { _walrusBlobType: 'quilt', custom: 'value' },
							}),
						);
						const transaction = ctx.executeTransaction.mock.calls[0][0];
						expect(transaction.getData().sender).toBe(signer.toSuiAddress());
					}
					expect(client.encodeBlob).toHaveBeenCalledTimes(Number(needsUpload && !hasUploadRelay));
					expect(client.computeBlobMetadata).toHaveBeenCalledTimes(
						Number(
							(needsUpload && hasUploadRelay) ||
								resumeStep === 'uploaded' ||
								resumeStep === 'certified',
						),
					);
					expect(client.writeBlobToUploadRelay).toHaveBeenCalledTimes(
						Number(needsUpload && hasUploadRelay),
					);
					expect(client.writeEncodedBlobToNodes).toHaveBeenCalledTimes(
						Number(needsUpload && !hasUploadRelay),
					);
					if (needsUpload) {
						const upload = hasUploadRelay
							? client.writeBlobToUploadRelay
							: client.writeEncodedBlobToNodes;
						expect(upload).toHaveBeenCalledWith(expect.objectContaining({ deletable, signal }));
						if (hasUploadRelay) {
							expect(client.writeBlobToUploadRelay).toHaveBeenCalledWith(
								expect.objectContaining({
									txDigest: 'register-digest',
									nonce: NONCE,
									blobObjectId: BLOB_OBJECT_ID,
								}),
							);
						}
					}
					expect(client.certifyBlobTransaction).toHaveBeenCalledTimes(Number(needsCertify));
					if (needsCertify) {
						expect(client.certifyBlobTransaction).toHaveBeenCalledWith({
							certificate: CERTIFICATE,
							blobId: BLOB_ID,
							blobObjectId: BLOB_OBJECT_ID,
							deletable,
						});
					}
				},
			);
		}

		it.each(['uploaded', 'certified'] as const)(
			'recovers writeFiles after onStep stops at %s',
			async (checkpoint) => {
				const { walrus } = setup(hasUploadRelay);
				let saved: WriteBlobStep | undefined;
				await expect(
					walrus.writeFiles({
						files: files(),
						signer,
						epochs: 1,
						deletable: true,
						onStep: async (step) => {
							saved = step;
							if (step.step === checkpoint) throw new Error('stop');
						},
					}),
				).rejects.toThrow('stop');
				expect(saved?.step).toBe(checkpoint);
				const resumed = setup(hasUploadRelay);
				const onStep = vi.fn();
				expectFiles(
					await resumed.walrus.writeFiles({
						files: files(),
						signer,
						epochs: 1,
						deletable: true,
						resume: JSON.parse(JSON.stringify(saved)),
						onStep,
					}),
					resumed.certifiedBlobObject,
				);
				expect(onStep.mock.calls.map(([step]) => step.step)).toEqual(
					checkpoint === 'uploaded' ? ['certified'] : [],
				);
				expect(resumed.client.registerBlob).not.toHaveBeenCalled();
				expect(resumed.client.writeBlobToUploadRelay).not.toHaveBeenCalled();
				expect(resumed.client.writeEncodedBlobToNodes).not.toHaveBeenCalled();
			},
		);
	});
}

describe('resumed quilt content validation', () => {
	let wasm: Awaited<ReturnType<typeof getWasmBindings>>;
	let blobId: string;
	beforeAll(async () => {
		wasm = await getWasmBindings();
		const { quilt } = encodeQuilt({
			blobs: [
				{ contents: new TextEncoder().encode('first'), identifier: 'one.txt' },
				{ contents: new TextEncoder().encode('second'), identifier: 'two.txt' },
			],
			numShards: 1000,
		});
		blobId = wasm.computeMetadata(1000, quilt).blobId;
	});

	for (const hasUploadRelay of [false, true]) {
		for (const step of ['uploaded', 'certified'] as const) {
			it.each(['unchanged', 'size', 'contents', 'identifier', 'tags'] as const)(
				`validates %s inputs from ${step} with uploadRelay=${hasUploadRelay}`,
				async (change) => {
					const { client, walrus, ctx, certifiedBlobObject } = setup(hasUploadRelay);
					client.computeBlobMetadata.mockImplementation(async ({ bytes, nonce }) => {
						const metadata = wasm.computeMetadata(1000, bytes);
						return {
							blobId: metadata.blobId,
							rootHash: metadata.rootHash,
							metadata: {
								encodingType: metadata.encodingType,
								unencodedLength: metadata.unencodedLength,
							},
							nonce: nonce ?? NONCE,
							blobDigest: async () => new Uint8Array(32),
						};
					});
					const resume: WriteBlobStep =
						step === 'uploaded'
							? {
									step,
									blobId,
									blobObjectId: BLOB_OBJECT_ID,
									certificate: CertificateBcs.serialize(CERTIFICATE).toBase64(),
								}
							: { step, blobId, blobObjectId: BLOB_OBJECT_ID, blobObject: certifiedBlobObject };
					const changedFiles = [
						WalrusFile.from({
							contents: new TextEncoder().encode(
								change === 'size' ? 'a'.repeat(700) : change === 'contents' ? 'other' : 'first',
							),
							identifier: change === 'identifier' ? 'renamed.txt' : 'one.txt',
							tags: change === 'tags' ? { updated: 'true' } : undefined,
						}),
						files()[1],
					];
					const result = walrus.writeFiles({
						files: changedFiles,
						resume,
						signer,
						epochs: 1,
						deletable: true,
					});
					if (change === 'unchanged') {
						const listed = await result;
						expect(listed).toHaveLength(2);
						expect(listed.every((file) => file.blobId === blobId)).toBe(true);
						expect(client.computeBlobMetadata).toHaveBeenCalledTimes(1);
						expect(client.registerBlob).not.toHaveBeenCalled();
						expect(client.encodeBlob).not.toHaveBeenCalled();
						expect(client.writeBlobToUploadRelay).not.toHaveBeenCalled();
						expect(client.writeEncodedBlobToNodes).not.toHaveBeenCalled();
						expect(client.certifyBlobTransaction).toHaveBeenCalledTimes(
							Number(step === 'uploaded'),
						);
						return;
					}
					await expect(result).rejects.toThrow('Resume blobId mismatch');
					expect(ctx.executeTransaction).not.toHaveBeenCalled();
					expect(client.certifyBlobTransaction).not.toHaveBeenCalled();
					expect(client.writeBlobToUploadRelay).not.toHaveBeenCalled();
					expect(client.writeEncodedBlobToNodes).not.toHaveBeenCalled();
				},
			);
		}
	}
});
