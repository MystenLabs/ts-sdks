// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BlobEncoder, from_signed_messages_and_indices, MessageType } from '@mysten/walrus-wasm';

import { blobIdFromBytes } from './utils/bcs.js';
import type { BlobMetadataWithId, SliverData, SliverPair } from './utils/bcs.js';

export interface EncodedBlob {
	sliverPairs: (typeof SliverPair.$inferInput)[];
	metadata: typeof BlobMetadataWithId.$inferInput & { blob_id: string };
	rootHash: Uint8Array;
}

export function encodeBlob(nShards: number, bytes: Uint8Array): EncodedBlob {
	const encoder = new BlobEncoder(nShards);

	const [sliverPairs, metadata, rootHash] = encoder.encode_with_metadata(bytes);

	return {
		sliverPairs,
		metadata: {
			...metadata,
			blob_id: blobIdFromBytes(new Uint8Array(metadata.blob_id)),
		},
		rootHash: new Uint8Array(rootHash.Digest),
	};
}

export interface CombinedSignature {
	signers: number[];
	serializedMessage: Uint8Array;
	signature: string;
}

export interface Confirmation {
	serializedMessage: string;
	signature: string;
}

export function combineSignatures(
	confirmations: Confirmation[],
	signerIndices: number[],
): CombinedSignature {
	const combined = from_signed_messages_and_indices(
		MessageType.Confirmation,
		confirmations,
		new Uint16Array(signerIndices),
	) as {
		signers: number[];
		serialized_message: number[];
		signature: string;
	};

	return {
		signers: signerIndices,
		serializedMessage: new Uint8Array(combined.serialized_message),
		signature: combined.signature,
	};
}

export function decodePrimarySlivers(
	nShards: number,
	size: number | bigint | string,
	slivers: (typeof SliverData.$inferInput)[],
): Uint8Array {
	const encoder = new BlobEncoder(nShards);
	const bytes = encoder.decode_primary(
		BigInt(size),
		slivers.map((sliver) => ({
			...sliver,
			_sliver_type: undefined,
		})),
	);
	return new Uint8Array(bytes);
}

export function computeMetadata(
	nShards: number,
	bytes: Uint8Array,
): typeof BlobMetadataWithId.$inferInput & { blob_id: string } {
	const encoder = new BlobEncoder(nShards);
	const metadata = encoder.compute_metadata(bytes);

	return {
		...metadata,
		blob_id: blobIdFromBytes(new Uint8Array(metadata.blob_id)),
	};
}
