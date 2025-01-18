// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferBcsType } from '@mysten/bcs';

import type { Committee } from '../contracts/walrus/committee.js';
import { BlobId } from './bcs.js';

const DIGEST_LEN = 32;
const BLOB_ID_LEN = 32;

export function encodedBlobLength(unencodedLength: number, nShards: number): number {
	const safetyLimit = decodingSafetyLimit(nShards);
	const maxFaulty = Math.floor((nShards - 1) / 3);
	const minCorrect = nShards - maxFaulty;
	const primary = minCorrect - maxFaulty - safetyLimit;
	const secondary = minCorrect - safetyLimit;

	const size = Math.floor((Math.max(unencodedLength, 1) - 1) / (primary * secondary)) + 1;

	const sliversSize = (primary + secondary) * size * nShards;
	const metadata = nShards * DIGEST_LEN * 2 + BLOB_ID_LEN;
	return nShards * metadata + sliversSize;
}

export function getPrimarySourceSymbols(nShards: number): number {
	const safetyLimit = decodingSafetyLimit(nShards);
	const maxFaulty = Math.floor((nShards - 1) / 3);
	const minCorrect = nShards - maxFaulty;
	const primary = minCorrect - maxFaulty - safetyLimit;
	return primary;
}

function decodingSafetyLimit(nShards: number): number {
	switch (true) {
		case nShards <= 15: // f=5, 3f+1=16, 0.2*f=1
			return 0;
		case nShards <= 30: // f=10, 3f+1=31, 0.2*f=2
			return 1;
		case nShards <= 45: // f=15, 3f+1=46, 0.2*f=3
			return 2;
		case nShards <= 60: // f=15, 3f+1=46, 0.2*f=3
			return 3;
		case nShards <= 75: // f=20, 3f+1=61, 0.2*f=4
			return 4;
		default: // f=25, 3f+1=76, 0.2*f=5
			return 5;
	}
}

const BYTES_PER_UNIT_SIZE = 1024 * 1024;

export function storageUnitsFromSize(size: number): number {
	return Math.ceil(size / BYTES_PER_UNIT_SIZE);
}

function rotationOffset(bytes: Uint8Array, modulus: number): number {
	return bytes.reduce((acc, byte) => (acc * 256 + byte) % modulus, 0);
}

export function toShardIndex(index: number, blobId: string, numShards: number): number {
	return (index + rotationOffset(BlobId.serialize(blobId).toBytes(), numShards)) % numShards;
}

export function toPairIndex(index: number, blobId: string, numShards: number): number {
	return (
		(numShards + index - rotationOffset(BlobId.serialize(blobId).toBytes(), numShards)) % numShards
	);
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
