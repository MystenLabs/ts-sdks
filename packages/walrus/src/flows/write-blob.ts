// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/bcs';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';

import type { Blob } from '../contracts/walrus/blob.js';
import { WalrusClientError } from '../error.js';
import type {
	EncodingType,
	ProtocolMessageCertificate,
	SliversForNode,
	WriteBlobFlow,
	WriteBlobFlowOptions,
	WriteBlobFlowRegisterOptions,
	WriteBlobFlowRunOptions,
	WriteBlobFlowUploadOptions,
	WriteBlobStep,
	WriteBlobStepCertified,
	WriteBlobStepEncoded,
	WriteBlobStepRegistered,
	WriteBlobStepUploaded,
} from '../types.js';
import { CertificateBcs, parseCertificateFromBase64 } from '../utils/bcs.js';
import type { WalrusClient } from '../client.js';

export interface WriteBlobFlowContext {
	hasUploadRelay(): boolean;
	executeTransaction(
		transaction: Transaction,
		signer: Signer,
		action: string,
	): Promise<{ digest: string }>;
	getCreatedBlob(digest: string): Promise<(typeof Blob)['$inferType']>;
	loadBlobObject(objectId: string): Promise<(typeof Blob)['$inferType']>;
}

type BlobMetadataResult = {
	blobId: string;
	rootHash: Uint8Array;
	metadata: { encodingType: string; unencodedLength: bigint };
	nonce: Uint8Array;
	blobDigest: () => Promise<Uint8Array>;
};

type EncodeBlobResult = {
	blobId: string;
	rootHash: Uint8Array;
	metadata: Awaited<ReturnType<WalrusClient['encodeBlob']>>['metadata'];
	sliversByNode: SliversForNode[];
};

type EncodeState = {
	metadata: BlobMetadataResult | EncodeBlobResult;
	size: number;
	data?: Uint8Array;
};

type RegisterState = EncodeState & { deletable: boolean };

type UploadState = {
	blobObject: (typeof Blob)['$inferType'];
	blobId: string;
	deletable: boolean;
	certificate: ProtocolMessageCertificate;
};

type CertifyState = {
	blobObject: (typeof Blob)['$inferType'];
	blobId: string;
	transaction: Transaction;
};

export function createWriteBlobFlow(
	client: WalrusClient,
	ctx: WriteBlobFlowContext,
	options: WriteBlobFlowOptions,
): WriteBlobFlow {
	const { resume } = options;
	let encodeState: EncodeState | undefined;
	let registerState: RegisterState | undefined;
	let uploadState: UploadState | undefined;
	let certifyState: CertifyState | undefined;

	const resumeBlobObjectId = resume && 'blobObjectId' in resume ? resume.blobObjectId : undefined;
	const resumeTxDigest = resume && 'txDigest' in resume ? resume.txDigest : undefined;
	const resumeNonce =
		resume && 'nonce' in resume && resume.nonce ? fromBase64(resume.nonce) : undefined;
	const resumeBlobId = resume ? resume.blobId : undefined;

	const encode = async (): Promise<WriteBlobStepEncoded> => {
		if (!encodeState) {
			const { blob } = options;
			const hasUploadRelay = ctx.hasUploadRelay();
			const metadata = hasUploadRelay
				? await client.computeBlobMetadata({
						bytes: blob,
						nonce: resumeNonce,
					})
				: await client.encodeBlob(blob);

			if (resumeBlobId && metadata.blobId !== resumeBlobId) {
				throw new WalrusClientError(
					`Resume blobId mismatch: expected ${resumeBlobId}, got ${metadata.blobId}. The blob content may have changed.`,
				);
			}

			encodeState = {
				metadata,
				size: blob.length,
				data: hasUploadRelay ? blob : undefined,
			};
		}

		const { metadata, size } = encodeState!;
		return {
			step: 'encoded' as const,
			blobId: metadata.blobId,
			rootHash: toBase64(metadata.rootHash),
			unencodedSize: size,
			...('nonce' in metadata ? { nonce: toBase64(metadata.nonce) } : {}),
		};
	};

	const register = ({ epochs, deletable, owner, attributes }: WriteBlobFlowRegisterOptions) => {
		if (!encodeState) {
			throw new Error('encode must be executed before calling register');
		}

		const { metadata, size } = encodeState;
		const transaction = new Transaction();
		transaction.setSenderIfNotSet(owner);

		if (ctx.hasUploadRelay()) {
			const meta = metadata as BlobMetadataResult;
			transaction.add(
				client.sendUploadRelayTip({
					size,
					blobDigest: meta.blobDigest,
					nonce: meta.nonce,
				}),
			);
		}

		transaction.transferObjects(
			[
				client.registerBlob({
					size,
					epochs,
					blobId: metadata.blobId,
					rootHash: metadata.rootHash,
					deletable,
					attributes,
				}),
			],
			owner,
		);

		registerState = { ...encodeState, deletable };

		return transaction;
	};

	const upload = async (options?: WriteBlobFlowUploadOptions): Promise<WriteBlobStepUploaded> => {
		if (!encodeState) {
			throw new Error('encode must be executed before calling upload');
		}

		const { metadata, data } = encodeState;
		const deletable = options?.deletable ?? registerState?.deletable ?? false;

		let blobObject: (typeof Blob)['$inferType'];
		if (resumeBlobObjectId) {
			blobObject = await client.getBlobObject(resumeBlobObjectId);
		} else if (options?.digest) {
			blobObject = await ctx.getCreatedBlob(options.digest);
		} else {
			throw new Error('Either resume.blobObjectId or upload digest must be provided');
		}

		let certificate: ProtocolMessageCertificate;
		if (ctx.hasUploadRelay()) {
			const meta = metadata as BlobMetadataResult;
			certificate = (
				await client.writeBlobToUploadRelay({
					blobId: metadata.blobId,
					blob: data!,
					nonce: meta.nonce,
					txDigest: options?.digest ?? resumeTxDigest!,
					blobObjectId: blobObject.id,
					deletable,
					encodingType: meta.metadata.encodingType as EncodingType,
					signal: options?.signal,
				})
			).certificate;
		} else {
			const meta = metadata as EncodeBlobResult;
			const confirmations = await client.writeEncodedBlobToNodes({
				blobId: metadata.blobId,
				objectId: blobObject.id,
				metadata: meta.metadata,
				sliversByNode: meta.sliversByNode,
				deletable,
				signal: options?.signal,
			});

			certificate = await client.certificateFromConfirmations({
				confirmations,
				blobId: metadata.blobId,
				blobObjectId: blobObject.id,
				deletable,
			});
		}

		uploadState = { blobObject, blobId: metadata.blobId, deletable, certificate };

		const txDigest = options?.digest ?? resumeTxDigest;
		return {
			step: 'uploaded' as const,
			blobId: metadata.blobId,
			blobObjectId: blobObject.id,
			...(txDigest ? { txDigest } : {}),
			certificate: CertificateBcs.serialize(certificate).toBase64(),
		};
	};

	const certify = (): Transaction => {
		if (!uploadState) {
			throw new Error('upload must be executed before calling certify');
		}

		const { blobObject, blobId, deletable, certificate } = uploadState;
		const transaction = client.certifyBlobTransaction({
			certificate,
			blobId,
			blobObjectId: blobObject.id,
			deletable,
		});

		certifyState = { blobObject, blobId, transaction };
		return transaction;
	};

	const executeRegister = async ({
		signer,
		...options
	}: WriteBlobFlowRegisterOptions & { signer: Signer }): Promise<WriteBlobStepRegistered> => {
		const transaction = register(options);
		const { digest } = await ctx.executeTransaction(transaction, signer, 'register blob');

		return {
			step: 'registered' as const,
			blobId: encodeState!.metadata.blobId,
			blobObjectId: (await ctx.getCreatedBlob(digest)).id,
			txDigest: digest,
			...('nonce' in encodeState!.metadata ? { nonce: toBase64(encodeState!.metadata.nonce) } : {}),
		};
	};

	const executeCertify = async ({
		signer,
	}: {
		signer: Signer;
	}): Promise<WriteBlobStepCertified> => {
		const transaction = certify();
		await ctx.executeTransaction(transaction, signer, 'certify blob');

		const blobObject = await ctx.loadBlobObject(uploadState!.blobObject.id);
		return {
			step: 'certified' as const,
			blobId: uploadState!.blobId,
			blobObjectId: blobObject.id,
			blobObject,
		};
	};

	const getBlob = async (): Promise<WriteBlobStepCertified> => {
		if (!certifyState && !uploadState) {
			throw new Error('upload or certify must be executed before calling getBlob');
		}

		const state = certifyState ?? uploadState!;
		const blobObject = await ctx.loadBlobObject(state.blobObject.id);
		return {
			step: 'certified' as const,
			blobId: state.blobId,
			blobObjectId: blobObject.id,
			blobObject,
		};
	};

	const restoreUploadState = async (resumeData: WriteBlobStepUploaded, deletable: boolean) => {
		const blobObject = await client.getBlobObject(resumeData.blobObjectId);
		uploadState = {
			blobObject,
			blobId: resumeData.blobId,
			deletable,
			certificate: parseCertificateFromBase64(resumeData.certificate),
		};
	};

	/** @yields {WriteBlobStep} */
	async function* run(options: WriteBlobFlowRunOptions): AsyncGenerator<WriteBlobStep> {
		const resumeStep = resume?.step;
		const stepOrder = ['encoded', 'registered', 'uploaded', 'certified'] as const;
		const resumeIndex = resumeStep ? stepOrder.indexOf(resumeStep) : -1;

		// Already certified — nothing to do
		if (resumeIndex >= stepOrder.indexOf('certified')) {
			return;
		}

		if (resumeIndex < stepOrder.indexOf('encoded')) {
			yield await encode();
		} else if (resumeIndex < stepOrder.indexOf('uploaded')) {
			await encode(); // Re-encode to populate internal state for upload
		}

		let registerDigest: string | undefined;
		if (!resumeBlobObjectId) {
			const regResult = await executeRegister({
				signer: options.signer,
				epochs: options.epochs,
				deletable: options.deletable,
				owner: options.owner ?? options.signer.toSuiAddress(),
				attributes: options.attributes,
			});
			registerDigest = regResult.txDigest;
			yield regResult;
		} else {
			registerState = {
				...encodeState!,
				deletable: options.deletable,
			};
		}

		if (resumeIndex < stepOrder.indexOf('uploaded')) {
			const uploadResult = await upload({
				digest: registerDigest ?? resumeTxDigest,
				signal: options.signal,
			});
			yield uploadResult;
		} else {
			await restoreUploadState(resume as WriteBlobStepUploaded, options.deletable);
		}

		const certResult = await executeCertify({ signer: options.signer });
		yield certResult;
	}

	return {
		encode,
		register,
		upload,
		certify,
		getBlob,
		executeRegister,
		executeCertify,
		run,
	};
}
