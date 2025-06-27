// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/sui/bcs';
import { bcs } from '@mysten/sui/bcs';

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

export const BlobId = bcs.u256().transform({
	input: (blobId: string | bigint) => (typeof blobId === 'string' ? blobIdToInt(blobId) : blobId),
	output: (id: string) => blobIdFromInt(id),
});

export function blobIdFromInt(blobId: bigint | string): string {
	return bcs
		.u256()
		.serialize(blobId)
		.toBase64()
		.replace(/=*$/, '')
		.replaceAll('+', '-')
		.replaceAll('/', '_');
}

export function blobIdFromBytes(blobId: Uint8Array): string {
	return blobIdFromInt(bcs.u256().parse(blobId));
}

export function blobIdToInt(blobId: string): bigint {
	return BigInt(bcs.u256().fromBase64(blobId.replaceAll('-', '+').replaceAll('_', '/')));
}

export const BlobMetadataWithId = bcs.struct('BlobMetadataWithId', {
	blobId: BlobId,
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

export function Field<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	...typeParameters: [T0, T1]
) {
	return bcs.struct('Field', {
		id: bcs.Address,
		name: typeParameters[0],
		value: typeParameters[1],
	});
}

export const QuiltPatchTags = bcs.map(bcs.string(), bcs.string()).transform({
	// tags is a BTreeMap, so we need to sort entries before serializing
	input: (tags: Map<string, string>) =>
		new Map(
			[...tags.entries()].sort(([a], [b]) =>
				compareBcsBytes(bcs.string().serialize(a).toBytes(), bcs.string().serialize(b).toBytes()),
			),
		),
});

export const QuiltPatchV1 = bcs.struct('QuiltPatchV1', {
	endIndex: bcs.u16(),
	identifier: bcs.string(),
	tags: QuiltPatchTags,
});

function compareBcsBytes(a: Uint8Array, b: Uint8Array) {
	for (let i = 0; i < a.length; i++) {
		if (i >= b.length) {
			return 1;
		}

		if (a[i] !== b[i]) {
			return a[i] - b[i];
		}
	}

	return 0;
}

export const QuiltIndexV1 = bcs.struct('QuiltIndexV1', {
	patches: bcs.vector(QuiltPatchV1),
});

export const QuiltIndex = bcs.enum('QuiltIndex', {
	V1: QuiltIndexV1,
});

export const QuiltPatchId = bcs.struct('QuiltPatchId', {
	quiltId: BlobId,
	patchId: bcs.struct('InternalQuiltPatchId', {
		version: bcs.u8(),
		startIndex: bcs.u16(),
		endIndex: bcs.u16(),
	}),
});

export const QuiltPatchBlobHeader = bcs.struct('QuiltPatchBlobHeader', {
	version: bcs.u8(),
	length: bcs.u32(),
	mask: bcs.u8(),
});
