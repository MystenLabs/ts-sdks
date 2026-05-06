// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/sui/bcs';
import { bcs } from '@mysten/sui/bcs';

type MerkleNodeOutput = { $kind: 'Empty'; Empty: true } | { $kind: 'Digest'; Digest: Uint8Array };
type MerkleNodeInput = { Empty: boolean | object | null } | { Digest: Iterable<number> };

const MerkleNode: BcsType<MerkleNodeOutput, MerkleNodeInput> = bcs.enum('MerkleNode', {
	Empty: null,
	Digest: bcs.bytes(32),
}) as BcsType<MerkleNodeOutput, MerkleNodeInput>;

type SliverPairMetadataOutput = {
	primary_hash: MerkleNodeOutput;
	secondary_hash: MerkleNodeOutput;
};
type SliverPairMetadataInput = {
	primary_hash: MerkleNodeInput;
	secondary_hash: MerkleNodeInput;
};

const SliverPairMetadata: BcsType<SliverPairMetadataOutput, SliverPairMetadataInput> = bcs.struct(
	'SliverPairMetadata',
	{
		primary_hash: MerkleNode,
		secondary_hash: MerkleNode,
	},
) as BcsType<SliverPairMetadataOutput, SliverPairMetadataInput>;

type EncodingTypeInput =
	| { RedStuff: boolean | object | null }
	| { RS2: boolean | object | null }
	| 'RedStuff'
	| 'RS2';

type EncodingTypeOutput =
	| { $kind: 'RedStuff'; RedStuff: boolean | object | null }
	| { $kind: 'RS2'; RS2: boolean | object | null };

export const EncodingType: BcsType<EncodingTypeOutput, EncodingTypeInput> = bcs
	.enum('EncodingType', {
		RedStuff: null,
		RS2: null,
	})
	.transform({
		input: (encodingType: EncodingTypeInput) =>
			typeof encodingType === 'string'
				? ({ [encodingType]: null } as Exclude<EncodingTypeInput, string>)
				: encodingType,
		output: (encodingType) => encodingType,
	}) as BcsType<EncodingTypeOutput, EncodingTypeInput>;

type BlobMetadataV1Output = {
	encoding_type: EncodingTypeOutput;
	unencoded_length: string;
	hashes: SliverPairMetadataOutput[];
};
type BlobMetadataV1Input = {
	encoding_type: EncodingTypeInput;
	unencoded_length: number | bigint;
	hashes: Iterable<SliverPairMetadataInput> & { length: number };
};

export const BlobMetadataV1: BcsType<BlobMetadataV1Output, BlobMetadataV1Input> = bcs.struct(
	'BlobMetadataV1',
	{
		encoding_type: EncodingType,
		unencoded_length: bcs.u64(),
		hashes: bcs.vector(SliverPairMetadata),
	},
) as BcsType<BlobMetadataV1Output, BlobMetadataV1Input>;

type BlobMetadataOutput = { $kind: 'V1'; V1: BlobMetadataV1Output };
type BlobMetadataInput = { V1: BlobMetadataV1Input };

export const BlobMetadata: BcsType<BlobMetadataOutput, BlobMetadataInput> = bcs.enum(
	'BlobMetadata',
	{
		V1: BlobMetadataV1,
	},
) as BcsType<BlobMetadataOutput, BlobMetadataInput>;

export const BlobId: BcsType<string, string | bigint> = bcs.u256().transform({
	input: (blobId: string | bigint) => (typeof blobId === 'string' ? blobIdToInt(blobId) : blobId),
	output: (id: string) => blobIdFromInt(id),
}) as BcsType<string, string | bigint>;

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

type BlobMetadataWithIdOutput = {
	blobId: string;
	metadata: BlobMetadataOutput;
};
type BlobMetadataWithIdInput = {
	blobId: string | bigint;
	metadata: BlobMetadataInput;
};

export const BlobMetadataWithId: BcsType<BlobMetadataWithIdOutput, BlobMetadataWithIdInput> =
	bcs.struct('BlobMetadataWithId', {
		blobId: BlobId,
		metadata: BlobMetadata,
	}) as BcsType<BlobMetadataWithIdOutput, BlobMetadataWithIdInput>;

type SymbolsOutput = { data: Uint8Array; symbol_size: number };
type SymbolsInput = {
	data: Iterable<number>;
	symbol_size: number;
};

const Symbols: BcsType<SymbolsOutput, SymbolsInput> = bcs.struct('Symbols', {
	data: bcs.byteVector(),
	symbol_size: bcs.u16(),
}) as BcsType<SymbolsOutput, SymbolsInput>;

type SliverDataOutput = { symbols: SymbolsOutput; index: number };
type SliverDataInput = { symbols: SymbolsInput; index: number };

export const SliverData: BcsType<SliverDataOutput, SliverDataInput> = bcs.struct('SliverData', {
	symbols: Symbols,
	index: bcs.u16(),
}) as BcsType<SliverDataOutput, SliverDataInput>;

type SliverOutput =
	| { $kind: 'Primary'; Primary: SliverDataOutput }
	| { $kind: 'Secondary'; Secondary: SliverDataOutput };
type SliverInput = { Primary: SliverDataInput } | { Secondary: SliverDataInput };

export const Sliver: BcsType<SliverOutput, SliverInput> = bcs.enum('Sliver', {
	Primary: SliverData,
	Secondary: SliverData,
}) as BcsType<SliverOutput, SliverInput>;

type SliverPairOutput = { primary: SliverDataOutput; secondary: SliverDataOutput };
type SliverPairInput = { primary: SliverDataInput; secondary: SliverDataInput };

export const SliverPair: BcsType<SliverPairOutput, SliverPairInput> = bcs.struct('SliverPair', {
	primary: SliverData,
	secondary: SliverData,
}) as BcsType<SliverPairOutput, SliverPairInput>;

export enum IntentType {
	PROOF_OF_POSSESSION_MSG = 0,
	BLOB_CERT_MSG = 1,
	INVALID_BLOB_ID_MSG = 2,
	SYNC_SHARD_MSG = 3,
}

export const Intent: BcsType<IntentType, IntentType> = bcs
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
	}) as BcsType<IntentType, IntentType>;

type ProtocolMessageOutput<T> = { intent: IntentType; epoch: number; messageContents: T };
type ProtocolMessageInput<T> = { intent: IntentType; epoch: number; messageContents: T };

export function ProtocolMessage<TOutput, TInput>(
	messageContents: BcsType<TOutput, TInput>,
): BcsType<ProtocolMessageOutput<TOutput>, ProtocolMessageInput<TInput>> {
	return bcs.struct(`ProtocolMessage<${messageContents.name}>`, {
		intent: Intent,
		epoch: bcs.u32(),
		messageContents,
	}) as BcsType<ProtocolMessageOutput<TOutput>, ProtocolMessageInput<TInput>>;
}

type BlobPersistenceTypeOutput =
	| { $kind: 'Permanent'; Permanent: true }
	| { $kind: 'Deletable'; Deletable: { objectId: string } };
type BlobPersistenceTypeInput =
	| { Permanent: boolean | object | null }
	| { Deletable: { objectId: string } };

export const BlobPersistenceType: BcsType<BlobPersistenceTypeOutput, BlobPersistenceTypeInput> =
	bcs.enum('BlobPersistenceType', {
		Permanent: null,
		Deletable: bcs.struct('Deletable', {
			objectId: bcs.Address,
		}),
	}) as BcsType<BlobPersistenceTypeOutput, BlobPersistenceTypeInput>;

type StorageConfirmationBodyOutput = {
	blobId: string;
	blobType: BlobPersistenceTypeOutput;
};
type StorageConfirmationBodyInput = {
	blobId: string | bigint;
	blobType: BlobPersistenceTypeInput;
};

export const StorageConfirmationBody: BcsType<
	StorageConfirmationBodyOutput,
	StorageConfirmationBodyInput
> = bcs.struct('StorageConfirmationBody', {
	blobId: BlobId,
	blobType: BlobPersistenceType,
}) as BcsType<StorageConfirmationBodyOutput, StorageConfirmationBodyInput>;

export const StorageConfirmation: BcsType<
	ProtocolMessageOutput<StorageConfirmationBodyOutput>,
	ProtocolMessageInput<StorageConfirmationBodyInput>
> = ProtocolMessage(StorageConfirmationBody);

type FieldOutput<T0Output, T1Output> = { id: string; name: T0Output; value: T1Output };
type FieldInput<T0Input, T1Input> = { id: string; name: T0Input; value: T1Input };

export function Field<T0Output, T0Input, T1Output, T1Input>(
	...typeParameters: [BcsType<T0Output, T0Input>, BcsType<T1Output, T1Input>]
): BcsType<FieldOutput<T0Output, T1Output>, FieldInput<T0Input, T1Input>> {
	return bcs.struct('Field', {
		id: bcs.Address,
		name: typeParameters[0],
		value: typeParameters[1],
	}) as BcsType<FieldOutput<T0Output, T1Output>, FieldInput<T0Input, T1Input>>;
}

export const QuiltPatchTags: BcsType<
	Record<string, string>,
	Record<string, string> | Map<string, string>
> = bcs.map(bcs.string(), bcs.string()).transform({
	// Accept both Record and Map as input, bcs.map() handles sorting automatically
	input: (tags: Record<string, string> | Map<string, string>) =>
		tags instanceof Map ? tags : new Map(Object.entries(tags)),
	output: (tags: Map<string, string>) => Object.fromEntries(tags),
}) as BcsType<Record<string, string>, Record<string, string> | Map<string, string>>;

type QuiltPatchV1Output = {
	endIndex: number;
	identifier: string;
	tags: Record<string, string>;
};
type QuiltPatchV1Input = {
	endIndex: number;
	identifier: string;
	tags: Record<string, string> | Map<string, string>;
};

export const QuiltPatchV1: BcsType<QuiltPatchV1Output, QuiltPatchV1Input> = bcs.struct(
	'QuiltPatchV1',
	{
		endIndex: bcs.u16(),
		identifier: bcs.string(),
		tags: QuiltPatchTags,
	},
) as BcsType<QuiltPatchV1Output, QuiltPatchV1Input>;

type QuiltIndexV1Output = { patches: QuiltPatchV1Output[] };
type QuiltIndexV1Input = { patches: Iterable<QuiltPatchV1Input> & { length: number } };

export const QuiltIndexV1: BcsType<QuiltIndexV1Output, QuiltIndexV1Input> = bcs.struct(
	'QuiltIndexV1',
	{
		patches: bcs.vector(QuiltPatchV1),
	},
) as BcsType<QuiltIndexV1Output, QuiltIndexV1Input>;

type InternalQuiltPatchIdOutput = {
	version: number;
	startIndex: number;
	endIndex: number;
};
type InternalQuiltPatchIdInput = InternalQuiltPatchIdOutput;

type QuiltPatchIdOutput = {
	quiltId: string;
	patchId: InternalQuiltPatchIdOutput;
};
type QuiltPatchIdInput = {
	quiltId: string | bigint;
	patchId: InternalQuiltPatchIdInput;
};

export const QuiltPatchId: BcsType<QuiltPatchIdOutput, QuiltPatchIdInput> = bcs.struct(
	'QuiltPatchId',
	{
		quiltId: BlobId,
		patchId: bcs.struct('InternalQuiltPatchId', {
			version: bcs.u8(),
			startIndex: bcs.u16(),
			endIndex: bcs.u16(),
		}),
	},
) as BcsType<QuiltPatchIdOutput, QuiltPatchIdInput>;

type QuiltPatchBlobHeaderOutput = { version: number; length: number; mask: number };
type QuiltPatchBlobHeaderInput = QuiltPatchBlobHeaderOutput;

export const QuiltPatchBlobHeader: BcsType<QuiltPatchBlobHeaderOutput, QuiltPatchBlobHeaderInput> =
	bcs.struct('QuiltPatchBlobHeader', {
		version: bcs.u8(),
		length: bcs.u32(),
		mask: bcs.u8(),
	}) as BcsType<QuiltPatchBlobHeaderOutput, QuiltPatchBlobHeaderInput>;

type CertificateBcsOutput = {
	signers: number[];
	serializedMessage: Uint8Array;
	signature: Uint8Array;
};
type CertificateBcsInput = {
	signers: Iterable<number> & { length: number };
	serializedMessage: Iterable<number>;
	signature: Iterable<number>;
};

export const CertificateBcs: BcsType<CertificateBcsOutput, CertificateBcsInput> = bcs.struct(
	'Certificate',
	{
		signers: bcs.vector(bcs.u16()),
		serializedMessage: bcs.byteVector(),
		signature: bcs.byteVector(),
	},
) as BcsType<CertificateBcsOutput, CertificateBcsInput>;

export function parseCertificateFromBase64(base64: string): {
	signers: number[];
	serializedMessage: Uint8Array;
	signature: Uint8Array;
} {
	const cert = CertificateBcs.fromBase64(base64);
	return {
		signers: cert.signers,
		serializedMessage: new Uint8Array(cert.serializedMessage),
		signature: new Uint8Array(cert.signature),
	};
}
