// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/sui/bcs';
import { bcs } from '@mysten/sui/bcs';
import { fromBase64, toBase64 } from '@mysten/sui/utils';

const MerkleNode = bcs.enum('MerkleNode', {
	Empty: null,
	Digest: bcs.bytes(32),
});

const SliverPairMetadata = bcs.struct('SliverPairMetadata', {
	primary_hash: MerkleNode,
	secondary_hash: MerkleNode,
});

export const EncodingType = bcs
	.enum('EncodingType', {
		RedStuff: null,
		RS2: null,
	})
	.transform({
		input: (
			encodingType:
				| { RedStuff: boolean | object | null }
				| { RS2: boolean | object | null }
				| 'RedStuff'
				| 'RS2',
		) =>
			typeof encodingType === 'string'
				? ({ [encodingType]: null } as Exclude<typeof encodingType, string>)
				: encodingType,
		output: (encodingType) => encodingType,
	});

export const BlobMetadataV1 = bcs.struct('BlobMetadataV1', {
	encoding_type: EncodingType,
	unencoded_length: bcs.u64(),
	hashes: bcs.vector(SliverPairMetadata),
});

export const BlobMetadata = bcs.enum('BlobMetadata', {
	V1: BlobMetadataV1,
});

export const BlobId = bcs.bytes(32).transform({
	input: (blobId: string | Iterable<number>) =>
		typeof blobId === 'string' ? blobIdToBytes(blobId) : blobId,
	output: (bytes: Uint8Array) => blobIdFromBytes(bytes),
});

export function blobIdFromBytes(blobId: Uint8Array): string {
	return toBase64(blobId).replace(/=*$/, '').replaceAll('+', '-').replaceAll('/', '_');
}

export function blobIdToBytes(blobId: string): Uint8Array {
	return fromBase64(blobId.replaceAll('-', '+').replaceAll('_', '/'));
}

export function blobIdToInt(blobId: string): bigint {
	return BigInt(bcs.u256().parse(blobIdToBytes(blobId)));
}

export const BlobMetadataWithId = bcs.struct('BlobMetadataWithId', {
	blob_id: BlobId,
	metadata: BlobMetadata,
});

const Symbols = bcs.struct('Symbols', {
	data: bcs.vector(bcs.u8()),
	symbol_size: bcs.u16(),
});

export const SliverData = bcs.struct('SliverData', {
	symbols: Symbols,
	index: bcs.u16(),
});

export const Sliver = bcs.enum('Sliver', {
	Primary: SliverData,
	Secondary: SliverData,
});

export const SliverPair = bcs.struct('SliverPair', {
	primary: SliverData,
	secondary: SliverData,
});

export enum IntentType {
	PROOF_OF_POSSESSION_MSG = 0,
	BLOB_CERT_MSG = 1,
	INVALID_BLOB_ID_MSG = 2,
	SYNC_SHARD_MSG = 3,
}

export const Intent = bcs
	.struct('Intent', {
		type: bcs.u8().transform({
			input: (type: IntentType) => type,
			output: (type: number) => type as IntentType,
		}),
		version: bcs.u8(),
		appId: bcs.u8(),
	})
	.transform({
		input: (intent: IntentType) => ({
			type: intent,
			version: 0,
			appId: 3,
		}),
		output: (intent) => intent.type,
	});

export function ProtocolMessage<T extends BcsType<any>>(messageContents: T) {
	return bcs.struct(`ProtocolMessage<${messageContents.name}>`, {
		intent: Intent,
		epoch: bcs.u32(),
		messageContents,
	});
}

export const BlobPersistenceType = bcs.enum('BlobPersistenceType', {
	Permanent: null,
	Deletable: bcs.struct('Deletable', {
		objectId: bcs.Address,
	}),
});
export const StorageConfirmationBody = bcs.struct('StorageConfirmationBody', {
	blobId: BlobId,
	blobType: BlobPersistenceType,
});

export const StorageConfirmation = ProtocolMessage(StorageConfirmationBody);
