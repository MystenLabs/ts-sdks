// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { Transaction } from '@mysten/sui/transactions';

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

	const encode = async (): Promise<WriteBlobStepEncoded> => {
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
			quiltBytes = quilt;
			quiltIndex = index;
		}

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

		const certResult = await blobFlow.getBlob();
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
		const resumeStep = resume?.step;
		const stepOrder = ['encoded', 'registered', 'uploaded', 'certified'] as const;
		const resumeIndex = resumeStep ? stepOrder.indexOf(resumeStep) : -1;

		if (resumeIndex >= stepOrder.indexOf('certified')) {
			return;
		}

		if (resumeIndex < stepOrder.indexOf('encoded')) {
			yield await encode();
		} else if (resumeIndex < stepOrder.indexOf('uploaded')) {
			await encode();
		}

		const resumeBlobObjectId = resume && 'blobObjectId' in resume ? resume.blobObjectId : undefined;
		let registerDigest: string | undefined;
		if (!resumeBlobObjectId) {
			const regResult = await blobFlow.executeRegister({
				signer: options.signer,
				epochs: options.epochs,
				deletable: options.deletable,
				owner: options.owner ?? options.signer.toSuiAddress(),
				attributes: {
					_walrusBlobType: 'quilt',
					...options.attributes,
				},
			});
			registerDigest = regResult.txDigest;
			yield regResult;
		}

		if (resumeIndex < stepOrder.indexOf('uploaded')) {
			yield await blobFlow.upload({
				digest: registerDigest,
				deletable: options.deletable,
				signal: options.signal,
			});
		}

		if (resumeIndex < stepOrder.indexOf('certified')) {
			yield await blobFlow.executeCertify({ signer: options.signer });
		}
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
