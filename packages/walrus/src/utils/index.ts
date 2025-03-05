// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferBcsType } from '@mysten/bcs';

import type { Committee } from '../contracts/committee.js';
import type { EncodingType } from '../types.js';
import { BlobId } from './bcs.js';

const DIGEST_LEN = 32;
const BLOB_ID_LEN = 32;

export function encodedBlobLength(
	unencodedLength: number,
	nShards: number,
	encodingType: EncodingType,
): number {
	const { primarySymbols, secondarySymbols } = getSourceSymbols(nShards, encodingType);

	const size =
		Math.floor((Math.max(unencodedLength, 1) - 1) / (primarySymbols * secondarySymbols)) + 1;

	const sliversSize = (primarySymbols + secondarySymbols) * size * nShards;
	const metadata = nShards * DIGEST_LEN * 2 + BLOB_ID_LEN;
	return nShards * metadata + sliversSize;
}

export function getSourceSymbols(nShards: number, encodingType: EncodingType) {
	const safetyLimit = decodingSafetyLimit(nShards, encodingType);
	const maxFaulty = getMaxFaultyNodes(nShards);
	const minCorrect = nShards - maxFaulty;

	return {
		primarySymbols: minCorrect - maxFaulty - safetyLimit,
		secondarySymbols: minCorrect - safetyLimit,
	};
}

export function isQuorum(size: number, nShards: number): boolean {
	const maxFaulty = getMaxFaultyNodes(nShards);
	return size > 2 * maxFaulty;
}

export function isAboveValidity(size: number, nShards: number): boolean {
	const maxFaulty = getMaxFaultyNodes(nShards);
	return size > maxFaulty;
}

export function getMaxFaultyNodes(nShards: number): number {
	return Math.floor((nShards - 1) / 3);
}

function decodingSafetyLimit(nShards: number, encodingType: EncodingType): number {
	switch (encodingType) {
		case 'RedStuff':
			return Math.min(5, Math.floor(getMaxFaultyNodes(nShards) / 5));
		case 'RS2':
			return 0;
		default:
			throw new Error(`Encountered unknown encoding type of ${encodingType}`);
	}
}

const BYTES_PER_UNIT_SIZE = 1024 * 1024;

export function storageUnitsFromSize(size: number): number {
	return Math.ceil(size / BYTES_PER_UNIT_SIZE);
}

function rotationOffset(bytes: Uint8Array, modulus: number): number {
	return bytes.reduce((acc, byte) => (acc * 256 + byte) % modulus, 0);
}

export function toShardIndex(sliverPairIndex: number, blobId: string, numShards: number): number {
	const offset = rotationOffset(BlobId.serialize(blobId).toBytes(), numShards);
	return (sliverPairIndex + offset) % numShards;
}

export function toPairIndex(shardIndex: number, blobId: string, numShards: number): number {
	const offset = rotationOffset(BlobId.serialize(blobId).toBytes(), numShards);
	return (numShards + shardIndex - offset) % numShards;
}

export function signersToBitmap(signers: number[], committeeSize: number): Uint8Array {
	const bitmapSize = Math.ceil(committeeSize / 8);
	const bitmap = new Uint8Array(bitmapSize);

	for (const signer of signers) {
		const byteIndex = Math.floor(signer / 8);
		const bitIndex = signer % 8;
		bitmap[byteIndex] |= 1 << bitIndex;
	}

	return bitmap;
}

export function getShardIndicesByNodeId(committee: InferBcsType<ReturnType<typeof Committee>>) {
	const shardIndicesByNodeId = new Map<string, number[]>();

	for (const node of committee.pos0.contents) {
		if (!shardIndicesByNodeId.has(node.key)) {
			shardIndicesByNodeId.set(node.key, []);
		}
		shardIndicesByNodeId.get(node.key)!.push(...node.value);
	}

	return shardIndicesByNodeId;
}

export function nodesByShardIndex(committee: InferBcsType<ReturnType<typeof Committee>>) {
	const nodesByShardIndex = new Map<number, string>();

	for (const node of committee.pos0.contents) {
		for (const shardIndex of node.value) {
			nodesByShardIndex.set(shardIndex, node.key);
		}
	}

	return nodesByShardIndex;
}

export function chunk<T>(array: T[], size: number) {
	return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => {
		return array.slice(i * size, (i + 1) * size);
	});
}
