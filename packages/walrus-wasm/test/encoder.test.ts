// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { BlobEncoder } from '../nodejs/walrus_wasm.js';

/**
 * Helper functions for computing BCS buffer sizes (copied from walrus SDK)
 */
interface BcsBufferSizes {
	primary: number;
	secondary: number;
}

function getSourceSymbols(nShards: number) {
	const maxFaulty = Math.floor((nShards - 1) / 3);
	const minCorrect = nShards - maxFaulty;
	return {
		primarySymbols: minCorrect - maxFaulty,
		secondarySymbols: minCorrect,
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

function computeBcsBufferSizes(blobSize: number, nShards: number): BcsBufferSizes[] {
	const { primarySymbols, secondarySymbols } = getSourceSymbols(nShards);

	let symbolSize = Math.floor((Math.max(blobSize, 1) - 1) / (primarySymbols * secondarySymbols)) + 1;
	if (symbolSize % 2 === 1) {
		symbolSize = symbolSize + 1;
	}

	const primarySliverSize = secondarySymbols * symbolSize;
	const secondarySliverSize = primarySymbols * symbolSize;

	const primaryBcsSize = computeBcsBufferSize(primarySliverSize);
	const secondaryBcsSize = computeBcsBufferSize(secondarySliverSize);

	const sizes: BcsBufferSizes[] = [];
	for (let i = 0; i < nShards; i++) {
		sizes.push({
			primary: primaryBcsSize,
			secondary: secondaryBcsSize,
		});
	}

	return sizes;
}

async function sha256(data: Uint8Array<ArrayBuffer>): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

describe('BlobEncoder', () => {
	const nShards = 1000;

	it('should encode and decode a 5MB blob correctly', async () => {
		const blobSize = 5 * 1024 * 1024; // 5MB
		const inputData = new Uint8Array(blobSize);

		// Fill with pseudo-random data for better testing
		for (let i = 0; i < blobSize; i++) {
			inputData[i] = (i * 7 + 13) % 256;
		}

		// Compute hash of original data
		const originalHash = await sha256(inputData);

		// Create encoder
		const encoder = new BlobEncoder(nShards);

		// Pre-allocate BCS buffers
		const bufferSizes = computeBcsBufferSizes(blobSize, nShards);
		const primaryBuffers = bufferSizes.map((size) => new Uint8Array(size.primary));
		const secondaryBuffers = bufferSizes.map((size) => new Uint8Array(size.secondary));

		// Encode
		const [metadata, rootHash] = encoder.encode(inputData, primaryBuffers, secondaryBuffers);

		// Verify we got metadata and root hash
		expect(metadata).toBeDefined();
		expect(metadata.blob_id).toBeDefined();
		expect(rootHash).toBeDefined();
		expect(rootHash.Digest).toBeDefined();

		// Convert to Uint8Array if needed (wasm-bindgen may return Array)
		const rootHashBytes = rootHash.Digest instanceof Uint8Array ? rootHash.Digest : new Uint8Array(rootHash.Digest);
		expect(rootHashBytes.length).toBe(32); // SHA-256 hash

		// Verify buffers were written
		expect(primaryBuffers.length).toBe(nShards);
		expect(secondaryBuffers.length).toBe(nShards);

		// Verify buffers contain data (not all zeros)
		const primaryHasData = primaryBuffers.some((buf) => buf.some((byte) => byte !== 0));
		expect(primaryHasData).toBe(true);

		// Decode using only primary slivers (minimum required for RS2)
		const outputBuffer = new Uint8Array(blobSize);
		encoder.decode(metadata.blob_id, BigInt(blobSize), primaryBuffers, outputBuffer);

		// Verify decoded data matches original
		const decodedHash = await sha256(outputBuffer);
		expect(decodedHash).toBe(originalHash);

		// Byte-by-byte comparison for first 100 bytes
		for (let i = 0; i < 100; i++) {
			expect(outputBuffer[i]).toBe(inputData[i]);
		}
	});

	it('should encode and decode a small 1KB blob correctly', async () => {
		const blobSize = 1024; // 1KB
		const inputData = new Uint8Array(blobSize);

		// Fill with pattern
		for (let i = 0; i < blobSize; i++) {
			inputData[i] = i % 256;
		}

		const originalHash = await sha256(inputData);

		const encoder = new BlobEncoder(nShards);

		const bufferSizes = computeBcsBufferSizes(blobSize, nShards);
		const primaryBuffers = bufferSizes.map((size) => new Uint8Array(size.primary));
		const secondaryBuffers = bufferSizes.map((size) => new Uint8Array(size.secondary));

		const [metadata] = encoder.encode(inputData, primaryBuffers, secondaryBuffers);

		const outputBuffer = new Uint8Array(blobSize);
		encoder.decode(metadata.blob_id, BigInt(blobSize), primaryBuffers, outputBuffer);

		const decodedHash = await sha256(outputBuffer);
		expect(decodedHash).toBe(originalHash);
	});

	it('should compute metadata without encoding', async () => {
		const blobSize = 1024 * 1024; // 1MB
		const inputData = new Uint8Array(blobSize);

		// Fill with data
		for (let i = 0; i < blobSize; i++) {
			inputData[i] = (i * 3) % 256;
		}

		const encoder = new BlobEncoder(nShards);

		// Compute metadata only
		const [metadata, rootHash] = encoder.compute_metadata(inputData);

		// Verify metadata structure
		expect(metadata).toBeDefined();
		expect(metadata.blob_id).toBeDefined();

		// Convert to Uint8Array if needed (wasm-bindgen may return Array)
		const blobIdBytes = metadata.blob_id instanceof Uint8Array ? metadata.blob_id : new Uint8Array(metadata.blob_id);
		expect(blobIdBytes.length).toBe(32); // u256 = 32 bytes

		expect(metadata.metadata).toBeDefined();
		expect(metadata.metadata.V1).toBeDefined();
		// wasm-bindgen may return number for u64 values that fit in JS number
		expect(Number(metadata.metadata.V1.unencoded_length)).toBe(blobSize);

		// Verify root hash
		expect(rootHash).toBeDefined();
		const rootHashBytes = rootHash.Digest instanceof Uint8Array ? rootHash.Digest : new Uint8Array(rootHash.Digest);
		expect(rootHashBytes.length).toBe(32);

		// Verify metadata.metadata.V1.hashes array exists
		expect(metadata.metadata.V1.hashes).toBeDefined();
		expect(Array.isArray(metadata.metadata.V1.hashes)).toBe(true);
		expect(metadata.metadata.V1.hashes.length).toBe(nShards);
	});

	it('should produce deterministic blob IDs for known inputs', async () => {
		const encoder = new BlobEncoder(nShards);

		// Test with empty blob
		const emptyData = new Uint8Array(0);
		const [emptyMetadata] = encoder.compute_metadata(emptyData);
		const emptyBlobId = Buffer.from(emptyMetadata.blob_id).toString('hex');

		// Empty blob should always produce the same blob ID
		const [emptyMetadata2] = encoder.compute_metadata(emptyData);
		const emptyBlobId2 = Buffer.from(emptyMetadata2.blob_id).toString('hex');
		expect(emptyBlobId).toBe(emptyBlobId2);

		// Verify against known static value (for nShards=1000)
		expect(emptyBlobId).toBe('dc63d02f71d936716137f17b97901af97d553ad00ac08b20f73b9693c47cd6fe');

		// Test with simple known data
		const testData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		const [testMetadata] = encoder.compute_metadata(testData);
		const testBlobId = Buffer.from(testMetadata.blob_id).toString('hex');

		// Same input should always produce the same blob ID
		const [testMetadata2] = encoder.compute_metadata(testData);
		const testBlobId2 = Buffer.from(testMetadata2.blob_id).toString('hex');
		expect(testBlobId).toBe(testBlobId2);

		// Verify against known static value (for nShards=1000)
		expect(testBlobId).toBe('865ca48479104a9bdc136f7d6730b7f3920012eccb4e99ba8540b9363766e093');
	});

	it('should produce consistent metadata for the same input', async () => {
		const blobSize = 512 * 1024; // 512KB
		const inputData = new Uint8Array(blobSize);

		// Fill with deterministic data
		for (let i = 0; i < blobSize; i++) {
			inputData[i] = (i * 11 + 7) % 256;
		}

		const encoder = new BlobEncoder(nShards);

		// Compute metadata twice
		const [metadata1, rootHash1] = encoder.compute_metadata(inputData);
		const [metadata2, rootHash2] = encoder.compute_metadata(inputData);

		// Blob IDs should match
		expect(metadata1.blob_id).toEqual(metadata2.blob_id);

		// Root hashes should match
		expect(rootHash1.Digest).toEqual(rootHash2.Digest);

		// Unencoded lengths should match
		expect(metadata1.metadata.V1.unencoded_length).toBe(metadata2.metadata.V1.unencoded_length);
	});

	it('should fail decode with wrong buffer size', () => {
		const blobSize = 1024;
		const inputData = new Uint8Array(blobSize);

		const encoder = new BlobEncoder(nShards);

		const bufferSizes = computeBcsBufferSizes(blobSize, nShards);
		const primaryBuffers = bufferSizes.map((size) => new Uint8Array(size.primary));
		const secondaryBuffers = bufferSizes.map((size) => new Uint8Array(size.secondary));

		const [metadata] = encoder.encode(inputData, primaryBuffers, secondaryBuffers);

		// Try to decode with wrong output buffer size
		const wrongSizeBuffer = new Uint8Array(blobSize - 1);

		expect(() => {
			encoder.decode(metadata.blob_id, BigInt(blobSize), primaryBuffers, wrongSizeBuffer);
		}).toThrow(/Output buffer size mismatch/);
	});
});
