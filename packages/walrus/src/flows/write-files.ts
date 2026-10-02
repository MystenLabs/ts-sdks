// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { Transaction } from '@mysten/sui/transactions';

import { WalrusClientError } from '../error.js';
import type {
	WriteBlobFlowOptions,
	WriteBlobStep,
	WriteBlobStepEncoded,
	WriteFilesFlow,
	WriteFilesFlowOptions,
	WriteFilesFlowRegisterOptions,
	WriteFilesFlowRunOptions,
} from '../types.js';
import { encodeQuiltPatchId } from '../utils/quilts.js';
import type { WalrusClient } from '../client.js';

export function createWriteFilesFlow(
	client: WalrusClient,
	{ files, resume }: WriteFilesFlowOptions,
): WriteFilesFlow {
	let quiltBytes: Uint8Array | undefined;
	let quiltIndex: Awaited<ReturnType<typeof client.encodeQuilt>>['index'] | undefined;

	const blobFlow = client.writeBlobFlow({
		get blob(): Uint8Array {
			if (!quiltBytes) {
				throw new Error('encode must be executed before accessing blob');
			}
			return quiltBytes;
		},
		resume,
	} as WriteBlobFlowOptions); // Cast needed: blob is a lazy getter populated by encode()

	const encodeQuilt = async () => {
		if (!quiltBytes) {
			const { quilt, index } = await client.encodeQuilt({
				blobs: await Promise.all(
					files.map(async (file, i) => ({
						contents: await file.bytes(),
						identifier: (await file.getIdentifier()) ?? `file-${i}`,
						tags: (await file.getTags()) ?? {},
					})),
				),
			});
			if (resume?.step === 'uploaded' || resume?.step === 'certified') {
				const { blobId } = await client.computeBlobMetadata({ bytes: quilt });
				if (blobId !== resume.blobId) {
					throw new WalrusClientError(
						`Resume blobId mismatch: expected ${resume.blobId}, got ${blobId}. The blob content may have changed.`,
					);
				}
			}
			quiltBytes = quilt;
			quiltIndex = index;
		}
	};

	const encode = async (): Promise<WriteBlobStepEncoded> => {
		await encodeQuilt();
		return blobFlow.encode();
	};

	const register = (options: WriteFilesFlowRegisterOptions): Transaction => {
		if (!quiltBytes) {
			throw new Error('encode must be executed before calling register');
		}

		return blobFlow.register({
			...options,
			attributes: {
				_walrusBlobType: 'quilt',
				...options.attributes,
			},
		});
	};

	const listFiles = async () => {
		if (!quiltIndex) {
			throw new Error('encode must be executed before calling listFiles');
		}

		const certResult = resume?.step === 'certified' ? resume : await blobFlow.getBlob();
		return quiltIndex.patches.map((patch) => ({
			id: encodeQuiltPatchId({
				quiltId: certResult.blobId,
				patchId: {
					version: 1,
					startIndex: patch.startIndex,
					endIndex: patch.endIndex,
				},
			}),
			blobId: certResult.blobId,
			blobObject: certResult.blobObject,
		}));
	};

	/** @yields {WriteBlobStep} */
	async function* run(options: WriteFilesFlowRunOptions): AsyncGenerator<WriteBlobStep> {
		// The quilt index is needed by listFiles() even when resuming after the upload, where the blob
		// flow itself doesn't need to encode again
		await encodeQuilt();

		// The blob flow's run() handles every resume point, including restoring the upload certificate
		// when resuming from the 'uploaded' step
		yield* blobFlow.run({
			...options,
			attributes: {
				_walrusBlobType: 'quilt',
				...options.attributes,
			},
		});
	}

	return {
		encode: encode,
		register: register,
		upload: blobFlow.upload,
		certify: blobFlow.certify,
		listFiles: listFiles,
		executeRegister: async (options: WriteFilesFlowRegisterOptions & { signer: Signer }) => {
			const { signer, ...rest } = options;
			return blobFlow.executeRegister({
				signer,
				...rest,
				attributes: {
					_walrusBlobType: 'quilt',
					...rest.attributes,
				},
			});
		},
		executeCertify: blobFlow.executeCertify,
		run,
	};
}
