// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeAll, afterEach } from 'vitest';

import { blobIdFromInt } from '../../src/utils/bcs.js';
import { sliverPairIndexFromSecondarySliverIndex } from '../../src/utils/index.js';
import { encodeQuilt } from '../../src/utils/quilts.js';
import { BlobReader } from '../../src/files/readers/blob.js';
import { WalrusBlob } from '../../src/files/blob.js';
import { getWasmBindings } from '../../src/wasm.js';
import { SliverData } from '../../src/utils/bcs.js';
import type { WalrusClient } from '../../src/client.js';

// Helper to create deterministic test data
function createTestBlob(size: number, seed: number = 0): Uint8Array {
	const data = new Uint8Array(size);
	for (let i = 0; i < size; i++) {
		data[i] = (i + seed) % 256;
	}
	return data;
}

function hashBytes(data: Uint8Array): string {
	let hash = 5381;
	for (let i = 0; i < data.length; i++) {
		hash = ((hash << 5) + hash + data[i]) | 0;
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
}

let wasm: Awaited<ReturnType<typeof getWasmBindings>>;

describe('WalrusBlob.fromBytes and BlobReader with pre-fetched data', () => {
	const numShards = 1000;

	beforeAll(async () => {
		wasm = await getWasmBindings();
	});

	afterEach(() => {
		(globalThis as any).gc?.();
	});

	describe('BlobReader with bytes constructor', () => {
		it('should return pre-fetched bytes from getBytes()', async () => {
			const originalData = createTestBlob(1000, 42);
			const blobId = blobIdFromInt(12345n);

			const reader = new BlobReader({ blobId, numShards, bytes: originalData });
			const bytes = await reader.getBytes();

			expect(bytes.length).toBe(originalData.length);
			expect(hashBytes(bytes)).toBe(hashBytes(originalData));
		});

		it('should set hasStartedLoadingFullBlob when bytes provided', () => {
			const reader = new BlobReader({
				blobId: blobIdFromInt(1n),
				numShards,
				bytes: new Uint8Array([1, 2, 3]),
			});

			expect(reader.hasStartedLoadingFullBlob).toBe(true);
		});

		it('should throw on getMetadata without client', async () => {
			const reader = new BlobReader({
				blobId: blobIdFromInt(1n),
				numShards,
				bytes: new Uint8Array(100),
			});

			await expect(async () => reader.getMetadata()).rejects.toThrow('requires a WalrusClient');
		});

		it('should throw on getSecondarySliver without client', async () => {
			const reader = new BlobReader({
				blobId: blobIdFromInt(1n),
				numShards,
				bytes: new Uint8Array(100),
			});

			await expect(reader.getSecondarySliver({ sliverIndex: 0 })).rejects.toThrow(
				'requires a WalrusClient',
			);
		});

		it('should compute columnSize from pre-fetched bytes', async () => {
			const quiltBytes = createTestBlob(10000, 7);
			const blobId = blobIdFromInt(55555n);

			const reader = new BlobReader({ blobId, numShards, bytes: quiltBytes });
			const columnSize = await reader.getColumnSize();

			// Should succeed without a client — derived from bytes length
			expect(columnSize).toBeGreaterThan(0);
		});
	});

	describe('BlobReader.seedSlivers', () => {
		it('should return seeded slivers from getSecondarySliver', async () => {
			const sliverData = new Uint8Array([10, 20, 30, 40, 50]);
			const slivers = new Map<number, Uint8Array>();
			slivers.set(0, sliverData);

			const reader = new BlobReader({
				blobId: blobIdFromInt(1n),
				numShards,
			});
			reader.seedSlivers(slivers);

			const result = await reader.getSecondarySliver({ sliverIndex: 0 });
			expect(result).toBe(sliverData);
		});

		it('should throw on un-seeded sliver index without client', async () => {
			const slivers = new Map<number, Uint8Array>();
			slivers.set(0, new Uint8Array([1, 2, 3]));

			const reader = new BlobReader({
				blobId: blobIdFromInt(1n),
				numShards,
			});
			reader.seedSlivers(slivers);

			// Index 0 is seeded, should work
			await expect(reader.getSecondarySliver({ sliverIndex: 0 })).resolves.toBeDefined();
			// Index 5 is NOT seeded, no client → should throw
			await expect(reader.getSecondarySliver({ sliverIndex: 5 })).rejects.toThrow(
				'requires a WalrusClient',
			);
		});

		it('should use columnSize from seeded slivers', async () => {
			// Encode a blob to get real slivers
			const data = createTestBlob(1000, 42);
			const encoded = wasm.encodeBlob(numShards, data);

			// Parse a secondary sliver to get raw column data
			const sliverPairIndex = sliverPairIndexFromSecondarySliverIndex(0, numShards);
			const rawSliver = SliverData.parse(encoded.secondarySlivers[sliverPairIndex]).symbols.data;

			const slivers = new Map<number, Uint8Array>();
			slivers.set(0, rawSliver);

			const reader = new BlobReader({
				blobId: encoded.blobId,
				numShards,
			});
			reader.seedSlivers(slivers);

			// getColumnSize should resolve from the seeded sliver without needing a client
			const columnSize = await reader.getColumnSize();
			expect(columnSize).toBe(rawSliver.length);
		});
	});

	describe('WalrusBlob.fromBytes', () => {
		it('should create a blob that can be read as a file', async () => {
			const originalData = createTestBlob(500, 99);
			const blobId = blobIdFromInt(11111n);

			const blob = WalrusBlob.fromBytes({ bytes: originalData, blobId, numShards });
			const file = blob.asFile();
			const fileBytes = await file.bytes();

			expect(fileBytes.length).toBe(originalData.length);
			expect(hashBytes(fileBytes)).toBe(hashBytes(originalData));
		});

		it('should return correct blobId', async () => {
			const blobId = blobIdFromInt(22222n);
			const blob = WalrusBlob.fromBytes({
				bytes: new Uint8Array(100),
				blobId,
				numShards,
			});

			expect(await blob.blobId()).toBe(blobId);
		});

		it('should throw on exists() without client', async () => {
			const blob = WalrusBlob.fromBytes({
				bytes: new Uint8Array(100),
				blobId: blobIdFromInt(1n),
				numShards,
			});

			await expect(blob.exists()).rejects.toThrow('requires a WalrusClient');
		});

		it('should throw on storedUntil() without client', async () => {
			const blob = WalrusBlob.fromBytes({
				bytes: new Uint8Array(100),
				blobId: blobIdFromInt(1n),
				numShards,
			});

			await expect(blob.storedUntil()).rejects.toThrow('requires a WalrusClient');
		});
	});

	describe('WalrusBlob.fromSlivers', () => {
		it('should create a blob with seeded slivers', async () => {
			const sliverData = new Uint8Array([10, 20, 30]);
			const slivers = new Map<number, Uint8Array>();
			slivers.set(0, sliverData);

			const blob = WalrusBlob.fromSlivers({
				slivers,
				blobId: blobIdFromInt(1n),
				numShards,
			});

			expect(await blob.blobId()).toBe(blobIdFromInt(1n));
		});

		it('should throw on exists() without client', async () => {
			const blob = WalrusBlob.fromSlivers({
				slivers: new Map(),
				blobId: blobIdFromInt(1n),
				numShards,
			});

			await expect(blob.exists()).rejects.toThrow('requires a WalrusClient');
		});
	});

	describe('quilt round-trip with fromBytes (aggregator use case)', () => {
		it('should read quilt index from pre-fetched bytes', async () => {
			const originalBlobs = [
				{ contents: createTestBlob(500, 1), identifier: 'file-a' },
				{ contents: createTestBlob(1000, 2), identifier: 'file-b' },
				{ contents: createTestBlob(750, 3), identifier: 'file-c' },
			];

			const { quilt } = encodeQuilt({ blobs: originalBlobs, numShards });

			// Simulate: user downloaded quilt bytes from aggregator
			const encoded = wasm.encodeBlob(numShards, quilt);
			const aggregatorBytes = wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quilt.length,
				encoded.primarySlivers,
			);

			// Use fromBytes — no WalrusClient needed!
			const blob = WalrusBlob.fromBytes({
				bytes: aggregatorBytes,
				blobId: encoded.blobId,
				numShards,
			});

			const files = await blob.files();
			expect(files).toHaveLength(3);
		});

		it('should read quilt file contents from pre-fetched bytes', async () => {
			const originalBlobs = [
				{ contents: createTestBlob(500, 10), identifier: 'config.json' },
				{ contents: createTestBlob(2000, 20), identifier: 'data.bin' },
			];

			const { quilt, index } = encodeQuilt({ blobs: originalBlobs, numShards });

			// Simulate aggregator download
			const encoded = wasm.encodeBlob(numShards, quilt);
			const aggregatorBytes = wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quilt.length,
				encoded.primarySlivers,
			);

			const blob = WalrusBlob.fromBytes({
				bytes: aggregatorBytes,
				blobId: encoded.blobId,
				numShards,
			});

			// Read files and verify content
			const files = await blob.files();
			expect(files).toHaveLength(2);

			// Sorted by identifier: config.json, data.bin
			const configFile = files[0];
			const dataFile = files[1];

			const configBytes = await configFile.bytes();
			const dataBytes = await dataFile.bytes();

			const sortedOriginal = [...originalBlobs].sort((a, b) =>
				a.identifier.localeCompare(b.identifier),
			);

			expect(configBytes.length).toBe(sortedOriginal[0].contents.length);
			expect(hashBytes(configBytes)).toBe(hashBytes(sortedOriginal[0].contents));
			expect(dataBytes.length).toBe(sortedOriginal[1].contents.length);
			expect(hashBytes(dataBytes)).toBe(hashBytes(sortedOriginal[1].contents));
		});

		it('should filter quilt files by identifier from pre-fetched bytes', async () => {
			const originalBlobs = [
				{ contents: createTestBlob(300, 1), identifier: 'alpha' },
				{ contents: createTestBlob(400, 2), identifier: 'beta' },
				{ contents: createTestBlob(500, 3), identifier: 'gamma' },
			];

			const { quilt } = encodeQuilt({ blobs: originalBlobs, numShards });

			const encoded = wasm.encodeBlob(numShards, quilt);
			const aggregatorBytes = wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quilt.length,
				encoded.primarySlivers,
			);

			const blob = WalrusBlob.fromBytes({
				bytes: aggregatorBytes,
				blobId: encoded.blobId,
				numShards,
			});

			// Filter by identifier
			const filtered = await blob.files({ identifiers: ['beta'] });
			expect(filtered).toHaveLength(1);

			const betaBytes = await filtered[0].bytes();
			expect(betaBytes.length).toBe(400);
			expect(hashBytes(betaBytes)).toBe(hashBytes(originalBlobs[1].contents));
		});

		it('should filter quilt files by tags from pre-fetched bytes', async () => {
			const originalBlobs = [
				{ contents: createTestBlob(300, 1), identifier: 'img1', tags: { type: 'image' } },
				{ contents: createTestBlob(400, 2), identifier: 'doc1', tags: { type: 'document' } },
				{ contents: createTestBlob(500, 3), identifier: 'img2', tags: { type: 'image' } },
			];

			const { quilt } = encodeQuilt({ blobs: originalBlobs, numShards });

			const encoded = wasm.encodeBlob(numShards, quilt);
			const aggregatorBytes = wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quilt.length,
				encoded.primarySlivers,
			);

			const blob = WalrusBlob.fromBytes({
				bytes: aggregatorBytes,
				blobId: encoded.blobId,
				numShards,
			});

			const images = await blob.files({ tags: [{ type: 'image' }] });
			expect(images).toHaveLength(2);
		});

		it('should handle empty quilt from pre-fetched bytes', async () => {
			const { quilt } = encodeQuilt({
				blobs: [{ contents: new Uint8Array(0), identifier: 'empty' }],
				numShards,
			});

			const encoded = wasm.encodeBlob(numShards, quilt);
			const aggregatorBytes = wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quilt.length,
				encoded.primarySlivers,
			);

			const blob = WalrusBlob.fromBytes({
				bytes: aggregatorBytes,
				blobId: encoded.blobId,
				numShards,
			});

			const files = await blob.files();
			expect(files).toHaveLength(1);

			const emptyBytes = await files[0].bytes();
			expect(emptyBytes.length).toBe(0);
		});

		it('should handle large quilt with many files from pre-fetched bytes', async () => {
			const originalBlobs = Array(10)
				.fill(0)
				.map((_, i) => ({
					contents: createTestBlob(500 + i * 100, i),
					identifier: `file-${i.toString().padStart(3, '0')}`,
				}));

			const { quilt } = encodeQuilt({ blobs: originalBlobs, numShards });

			const encoded = wasm.encodeBlob(numShards, quilt);
			const aggregatorBytes = wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quilt.length,
				encoded.primarySlivers,
			);

			const blob = WalrusBlob.fromBytes({
				bytes: aggregatorBytes,
				blobId: encoded.blobId,
				numShards,
			});

			const files = await blob.files();
			expect(files).toHaveLength(10);

			// Verify each file's content
			const sortedOriginal = [...originalBlobs].sort((a, b) =>
				a.identifier.localeCompare(b.identifier),
			);
			for (let i = 0; i < files.length; i++) {
				const fileBytes = await files[i].bytes();
				expect(fileBytes.length).toBe(sortedOriginal[i].contents.length);
				expect(hashBytes(fileBytes)).toBe(hashBytes(sortedOriginal[i].contents));
			}
		});
	});

	describe('backward compatibility', () => {
		it('BlobReader with client still works as before', async () => {
			const quiltBytes = createTestBlob(1000, 42);
			const blobId = blobIdFromInt(99999n);

			const mockClient = {
				async readBlob() {
					return quiltBytes;
				},
				async getBlobMetadata() {
					return {
						metadata: { V1: { unencoded_length: BigInt(quiltBytes.length) } },
					};
				},
				async getSecondarySliver(): Promise<never> {
					throw new Error('fail');
				},
			} as unknown as WalrusClient;

			const reader = new BlobReader({ client: mockClient, blobId, numShards });
			const bytes = await reader.getBytes();

			expect(bytes.length).toBe(quiltBytes.length);
			expect(hashBytes(bytes)).toBe(hashBytes(quiltBytes));
		});

		it('WalrusBlob constructor with client still works', async () => {
			const quiltBytes = createTestBlob(500, 1);
			const blobId = blobIdFromInt(77777n);

			const mockClient = {
				async getVerifiedBlobStatus() {
					return { type: 'permanent', endEpoch: 100 };
				},
				async readBlob() {
					return quiltBytes;
				},
				async getBlobMetadata() {
					return {
						metadata: { V1: { unencoded_length: BigInt(quiltBytes.length) } },
					};
				},
				async getSecondarySliver(): Promise<never> {
					throw new Error('fail');
				},
			} as unknown as WalrusClient;

			const reader = new BlobReader({ client: mockClient, blobId, numShards });
			const blob = new WalrusBlob({ reader, client: mockClient });

			expect(await blob.exists()).toBe(true);
			expect(await blob.storedUntil()).toBe(100);
		});
	});
});
