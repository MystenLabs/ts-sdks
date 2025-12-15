// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';
import init, {
	BlobEncoder,
	bls12381_min_pk_aggregate,
	bls12381_min_pk_verify,
} from '@mysten/walrus-wasm';

import type { StorageConfirmation } from './storage-node/types.js';
import type { EncodingType, ProtocolMessageCertificate } from './types.js';
import type { BlobMetadata } from './utils/bcs.js';
import { BlobId, blobIdFromBytes } from './utils/bcs.js';
import { getSourceSymbols } from './utils/index.js';

export interface EncodedBlob {
	primarySlivers: Uint8Array[];
	secondarySlivers: Uint8Array[];
	blobId: string;
	metadata: typeof BlobMetadata.$inferInput;
	rootHash: Uint8Array;
}

export async function getWasmBindings(url?: string) {
	await init({ module_or_path: url });

	function encodeBlob(
		nShards: number,
		bytes: Uint8Array,
		encodingType: EncodingType = 'RS2',
	): EncodedBlob {
		const encoder = new BlobEncoder(nShards);

		if (encodingType !== 'RS2') {
			throw new Error(`Unsupported encoding type: ${encodingType}`);
		}

		// Pre-allocate BCS buffers
		const bufferSizes = computeBcsBufferSizes(bytes.length, nShards);
		const primaryBuffers = Array.from({ length: nShards }).map(
			() => new Uint8Array(bufferSizes.primary),
		);
		const secondaryBuffers = Array.from({ length: nShards }).map(
			() => new Uint8Array(bufferSizes.secondary),
		);

		const [metadata, rootHash] = encoder.encode(bytes, primaryBuffers, secondaryBuffers);

		return {
			primarySlivers: primaryBuffers,
			secondarySlivers: secondaryBuffers,
			blobId: blobIdFromBytes(new Uint8Array(metadata.blob_id)),
			metadata: metadata.metadata,
			rootHash: new Uint8Array(rootHash.Digest),
		};
	}

	function combineSignatures(
		confirmations: StorageConfirmation[],
		signerIndices: number[],
	): ProtocolMessageCertificate {
		const signature = bls12381_min_pk_aggregate(
			confirmations.map((confirmation) => fromBase64(confirmation.signature)),
		);

		return {
			signers: signerIndices,
			serializedMessage: fromBase64(confirmations[0].serializedMessage),
			signature,
		};
	}

	function decodePrimarySlivers(
		blobId: string,
		nShards: number,
		size: number | bigint | string,
		slivers: Uint8Array[],
		encodingType: EncodingType = 'RS2',
	): Uint8Array {
		const encoder = new BlobEncoder(nShards);

		if (encodingType !== 'RS2') {
			throw new Error(`Unsupported encoding type: ${encodingType}`);
		}

		const blobSize = BigInt(size);
		const outputBuffer = new Uint8Array(Number(blobSize));
		encoder.decode(BlobId.serialize(blobId).toBytes(), blobSize, slivers, outputBuffer);
		return outputBuffer;
	}

	function getVerifySignature() {
		return (confirmation: StorageConfirmation, publicKey: Uint8Array) =>
			bls12381_min_pk_verify(
				fromBase64(confirmation.signature),
				publicKey,
				fromBase64(confirmation.serializedMessage),
			);
	}

	function computeMetadata(
		nShards: number,
		bytes: Uint8Array,
		encodingType: EncodingType = 'RS2',
	): { blobId: string; rootHash: Uint8Array; unencodedLength: bigint; encodingType: EncodingType } {
		const encoder = new BlobEncoder(nShards);
		const [blobId, rootHash, unencodedLength, encType] = encoder.compute_metadata(bytes);

		if (encodingType !== 'RS2') {
			throw new Error(`Unsupported encoding type: ${encodingType}`);
		}

		return {
			blobId: blobIdFromBytes(new Uint8Array(blobId)),
			rootHash: new Uint8Array(rootHash.Digest),
			unencodedLength: BigInt(unencodedLength),
			encodingType: encType as EncodingType,
		};
	}

	return {
		encodeBlob,
		combineSignatures,
		decodePrimarySlivers,
		getVerifySignature,
		computeMetadata,
	};
}

function uleb128Size(value: number): number {
	let size = 1;
	value >>= 7;
	while (value !== 0) {
		size++;
		value >>= 7;
	}
	return size;
}

function computeBcsBufferSize(dataLength: number): number {
	const ulebSize = uleb128Size(dataLength);
	return ulebSize + dataLength + 2 + 2; // ULEB128 + data + symbol_size + index
}

function computeBcsBufferSizes(blobSize: number, nShards: number) {
	const { primarySymbols, secondarySymbols } = getSourceSymbols(nShards);

	let symbolSize =
		Math.floor((Math.max(blobSize, 1) - 1) / (primarySymbols * secondarySymbols)) + 1;
	if (symbolSize % 2 === 1) {
		symbolSize = symbolSize + 1;
	}

	const primarySliverSize = secondarySymbols * symbolSize;
	const secondarySliverSize = primarySymbols * symbolSize;

	const primaryBcsSize = computeBcsBufferSize(primarySliverSize);
	const secondaryBcsSize = computeBcsBufferSize(secondarySliverSize);

	return {
		nShards,
		primary: primaryBcsSize,
		secondary: secondaryBcsSize,
	};
}
