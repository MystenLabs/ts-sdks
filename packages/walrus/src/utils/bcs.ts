// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/sui/bcs';
import { bcs } from '@mysten/sui/bcs';

import { BlsCommittee } from '../contracts/bls_aggregate.js';
import { VecMap } from '../contracts/deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js';
import { EventBlob } from '../contracts/event_blob.js';
import { ExtendedField } from '../contracts/extended_field.js';
import { FutureAccountingRingBuffer } from '../contracts/storage_accounting.js';

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

// TODO: Remove these once testnet is updated
const TestnetEventBlobCertificationState = bcs.struct('EventBlobCertificationState', {
	latest_certified_blob: bcs.option(EventBlob()),
	aggregate_weight_per_blob: VecMap(bcs.u256(), bcs.u16()),
});
export const TestnetSystemStateInnerV1 = bcs.struct('SystemStateInnerV1', {
	committee: BlsCommittee(),
	total_capacity_size: bcs.u64(),
	used_capacity_size: bcs.u64(),
	storage_price_per_unit_size: bcs.u64(),
	write_price_per_unit_size: bcs.u64(),
	future_accounting: FutureAccountingRingBuffer(),
	event_blob_certification_state: TestnetEventBlobCertificationState,
	deny_list_sizes: ExtendedField(),
});
