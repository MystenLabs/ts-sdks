// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeAll, afterEach } from 'vitest';

import { blobIdFromInt } from '../../src/utils/bcs.js';
import {
	getSourceSymbols,
	sliverPairIndexFromSecondarySliverIndex,
} from '../../src/utils/index.js';
import { encodeQuilt, encodeQuiltPatchId } from '../../src/utils/quilts.js';
import { BlobReader } from '../../src/files/readers/blob.js';
import { getWasmBindings } from '../../src/wasm.js';
import type { WalrusClient } from '../../src/client.js';

// Helper to create deterministic test data
function createTestBlob(size: number, seed: number = 0): Uint8Array {
	const data = new Uint8Array(size);
	for (let i = 0; i < size; i++) {
		data[i] = (i + seed) % 256;
	}
	return data;
}

// Simple hash function for comparing blob contents without direct array comparison
// Uses djb2 algorithm - fast and produces consistent results
function hashBytes(data: Uint8Array): string {
	let hash = 5381;
	for (let i = 0; i < data.length; i++) {
		hash = ((hash << 5) + hash + data[i]) | 0;
	}
	// Convert to unsigned and then to hex
	return (hash >>> 0).toString(16).padStart(8, '0');
}

// WASM bindings for encoding/decoding - initialized in beforeAll
let wasm: Awaited<ReturnType<typeof getWasmBindings>>;

interface MockClientOptions {
	quiltBytes: Uint8Array;
	numShards: number;
	secondarySliverMode: 'success' | 'fail';
}

interface MockClientCalls {
	readBlob: number;
	getBlobMetadata: number;
	getSecondarySliver: number[];
}

interface MockClientResult {
	client: WalrusClient;
	calls: MockClientCalls;
}

// Create a configurable mock WalrusClient for testing with call tracking.
// - 'success' mode: extracts raw column data from quilt bytes (simulates real secondary sliver reads)
// - 'fail' mode: secondary sliver reads always fail (forces fallback to full blob)
function createMockClient({
	quiltBytes,
	numShards,
	secondarySliverMode,
}: MockClientOptions): MockClientResult {
	const encoded = wasm.encodeBlob(numShards, quiltBytes);
	const calls: MockClientCalls = {
		readBlob: 0,
		getBlobMetadata: 0,
		getSecondarySliver: [],
	};

	const client = {
		async readBlob() {
			calls.readBlob++;
			return wasm.decodePrimarySlivers(
				encoded.blobId,
				numShards,
				quiltBytes.length,
				encoded.primarySlivers,
			);
		},
		async getBlobMetadata() {
			calls.getBlobMetadata++;
			return {
				metadata: {
					V1: {
						unencoded_length: BigInt(quiltBytes.length),
					},
				},
			};
		},
		async getSecondarySliver({ index }: { index: number }) {
			calls.getSecondarySliver.push(index);
			if (secondarySliverMode === 'fail') {
				throw new Error('Secondary sliver read failed');
			}

			// Map secondary sliver index to sliver pair index (same mapping as WalrusClient)
			const sliverPairIndex = sliverPairIndexFromSecondarySliverIndex(index, numShards);
			return encoded.secondarySlivers[sliverPairIndex];
		},
	} as unknown as WalrusClient;

	return { client, calls };
}

// Create a BlobReader with a mock client for testing quilt decoding
function createBlobReader(
	quiltBytes: Uint8Array,
	numShards: number,
	blobId: string,
	secondarySliverMode: 'success' | 'fail' = 'fail',
) {
	const { client } = createMockClient({ quiltBytes, numShards, secondarySliverMode });
	return new BlobReader({ client, blobId, numShards });
}

// Create a BlobReader with tracked mock client for verifying call patterns
function createTrackedBlobReader(
	quiltBytes: Uint8Array,
	numShards: number,
	blobId: string,
	secondarySliverMode: 'success' | 'fail',
): { reader: BlobReader; calls: MockClientCalls } {
	const { client, calls } = createMockClient({ quiltBytes, numShards, secondarySliverMode });
	const reader = new BlobReader({ client, blobId, numShards });
	return { reader, calls };
}

describe('encodeQuilt', () => {
	const numShards = 1000;

	beforeAll(async () => {
		wasm = await getWasmBindings();
	});

	// Explicit GC to reduce memory pressure from WASM encoding operations
	afterEach(() => {
		(globalThis as any).gc?.();
	});

	describe('basic encoding', () => {
		it('should encode a single blob', () => {
			const blob = createTestBlob(1000, 42);
			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: blob, identifier: 'test-blob' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"73b40ec0"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(index.patches).toHaveLength(1);
			expect(index.patches[0].identifier).toMatchInlineSnapshot(`"test-blob"`);
			expect(index.patches[0].startIndex).toMatchInlineSnapshot(`1`);
			expect(index.patches[0].endIndex).toMatchInlineSnapshot(`3`);
		});

		it('should encode multiple blobs', () => {
			const blobs = [
				{ contents: createTestBlob(500, 1), identifier: 'blob-a' },
				{ contents: createTestBlob(1000, 2), identifier: 'blob-b' },
				{ contents: createTestBlob(750, 3), identifier: 'blob-c' },
			];

			const { quilt, index } = encodeQuilt({ blobs, numShards });

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"a5388b02"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(index.patches).toHaveLength(3);

			// Blobs should be sorted by identifier
			expect(index.patches.map((p) => p.identifier)).toMatchInlineSnapshot(`
				[
				  "blob-a",
				  "blob-b",
				  "blob-c",
				]
			`);

			// Each patch should have valid indices
			expect(index.patches.map((p) => ({ start: p.startIndex, end: p.endIndex })))
				.toMatchInlineSnapshot(`
					[
					  {
					    "end": 2,
					    "start": 1,
					  },
					  {
					    "end": 4,
					    "start": 2,
					  },
					  {
					    "end": 6,
					    "start": 4,
					  },
					]
				`);
		});

		it('should handle blobs with tags', () => {
			const { quilt, index } = encodeQuilt({
				blobs: [
					{
						contents: createTestBlob(500),
						identifier: 'tagged-blob',
						tags: { author: 'test', version: '1.0' },
					},
				],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"ebe0c7e7"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(index.patches[0].tags).toMatchInlineSnapshot(`
				{
				  "author": "test",
				  "version": "1.0",
				}
			`);
		});

		it('should handle blobs without tags', () => {
			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: createTestBlob(500), identifier: 'no-tags' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"7e091d0b"`);
			expect(index.patches[0].tags).toMatchInlineSnapshot(`{}`);
		});

		it('should produce consistent results for same input', () => {
			const blobs = [
				{ contents: createTestBlob(500, 1), identifier: 'blob-1' },
				{ contents: createTestBlob(500, 2), identifier: 'blob-2' },
			];

			const result1 = encodeQuilt({ blobs, numShards });
			const result2 = encodeQuilt({ blobs, numShards });

			expect(result1.quilt.length).toMatchInlineSnapshot(`445556`);
			expect(hashBytes(result1.quilt)).toMatchInlineSnapshot(`"60f77634"`);
			expect(result1.quilt.length).toBe(result2.quilt.length);
			expect(hashBytes(result1.quilt)).toBe(hashBytes(result2.quilt));
		});
	});

	describe('edge cases', () => {
		it('should throw on duplicate identifiers', () => {
			expect(() =>
				encodeQuilt({
					blobs: [
						{ contents: createTestBlob(100), identifier: 'same-id' },
						{ contents: createTestBlob(200), identifier: 'same-id' },
					],
					numShards,
				}),
			).toThrow('Duplicate blob identifier: same-id');
		});

		it('should handle empty blob content', () => {
			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: new Uint8Array(0), identifier: 'empty' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"37bd7d4a"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(index.patches).toHaveLength(1);
		});

		it('should handle very small blobs', () => {
			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: new Uint8Array([1, 2, 3]), identifier: 'tiny' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"3d6ed5d8"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(index.patches).toHaveLength(1);
		});

		it('should sort blobs by identifier', () => {
			const blobs = [
				{ contents: createTestBlob(100), identifier: 'z-last' },
				{ contents: createTestBlob(100), identifier: 'a-first' },
				{ contents: createTestBlob(100), identifier: 'm-middle' },
			];

			const { quilt, index } = encodeQuilt({ blobs, numShards });

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"e18dbdb9"`);
			expect(index.patches.map((p) => p.identifier)).toMatchInlineSnapshot(`
				[
				  "a-first",
				  "m-middle",
				  "z-last",
				]
			`);
		});
	});

	describe('quilt structure validation', () => {
		it('should produce quilt with correct size', () => {
			const { quilt } = encodeQuilt({
				blobs: [{ contents: createTestBlob(1000), identifier: 'test' }],
				numShards,
			});

			const { secondarySymbols } = getSourceSymbols(numShards);
			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"b931e11f"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(quilt.length % secondarySymbols).toMatchInlineSnapshot(`0`);
		});
	});

	describe('round-trip encoding/decoding', () => {
		it('should round-trip a single blob', async () => {
			const originalBlob = createTestBlob(1000, 42);
			const blobId = blobIdFromInt(12345n);

			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: originalBlob, identifier: 'test-blob' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"73b40ec0"`);

			const blobReader = createBlobReader(quilt, numShards, blobId);
			const quiltReader = blobReader.getQuiltReader();

			const decodedIndex = await quiltReader.readIndex();
			expect(decodedIndex).toHaveLength(1);
			expect(decodedIndex[0].identifier).toBe('test-blob');

			const decoded = await quiltReader.readBlob(index.patches[0].startIndex);
			expect(decoded.identifier).toBe('test-blob');
			expect(decoded.blobContents.length).toBe(originalBlob.length);
			expect(hashBytes(decoded.blobContents)).toBe(hashBytes(originalBlob));
		});

		it('should round-trip multiple blobs', async () => {
			const originalBlobs = [
				{ contents: createTestBlob(500, 1), identifier: 'blob-a' },
				{ contents: createTestBlob(1000, 2), identifier: 'blob-b' },
				{ contents: createTestBlob(750, 3), identifier: 'blob-c' },
			];
			const blobId = blobIdFromInt(67890n);

			const { quilt, index } = encodeQuilt({ blobs: originalBlobs, numShards });

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"a5388b02"`);

			const blobReader = createBlobReader(quilt, numShards, blobId);
			const quiltReader = blobReader.getQuiltReader();

			const decodedIndex = await quiltReader.readIndex();
			expect(decodedIndex).toHaveLength(3);

			for (let i = 0; i < originalBlobs.length; i++) {
				const sortedOriginal = [...originalBlobs].sort((a, b) =>
					a.identifier.localeCompare(b.identifier),
				)[i];
				const decoded = await quiltReader.readBlob(index.patches[i].startIndex);

				expect(decoded.identifier).toBe(sortedOriginal.identifier);
				expect(decoded.blobContents.length).toBe(sortedOriginal.contents.length);
				expect(hashBytes(decoded.blobContents)).toBe(hashBytes(sortedOriginal.contents));
			}
		});

		it('should round-trip blobs with tags', async () => {
			const originalBlob = createTestBlob(500);
			const tags = { author: 'test-author', version: '2.0', category: 'images' };
			const blobId = blobIdFromInt(11111n);

			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: originalBlob, identifier: 'tagged-blob', tags }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"5bd12362"`);

			const blobReader = createBlobReader(quilt, numShards, blobId);
			const quiltReader = blobReader.getQuiltReader();

			const decoded = await quiltReader.readBlob(index.patches[0].startIndex);
			expect(decoded.identifier).toBe('tagged-blob');
			expect(decoded.tags).toEqual(tags);
			expect(hashBytes(decoded.blobContents)).toBe(hashBytes(originalBlob));
		});

		it('should round-trip empty blob content', async () => {
			const blobId = blobIdFromInt(22222n);

			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: new Uint8Array(0), identifier: 'empty-blob' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"900c255b"`);

			const blobReader = createBlobReader(quilt, numShards, blobId);
			const quiltReader = blobReader.getQuiltReader();

			const decoded = await quiltReader.readBlob(index.patches[0].startIndex);
			expect(decoded.identifier).toBe('empty-blob');
			expect(decoded.blobContents.length).toBe(0);
		});

		it('should fallback to full blob read when sliver read fails', async () => {
			const originalBlob = createTestBlob(1000, 42);
			const blobId = blobIdFromInt(33333n);

			const { quilt, index } = encodeQuilt({
				blobs: [{ contents: originalBlob, identifier: 'fallback-test' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"9ee04db6"`);

			// Create a mock client where getSecondarySliver fails but readBlob works
			const mockClient = {
				async readBlob() {
					return quilt;
				},
				async getBlobMetadata() {
					return {
						metadata: {
							V1: {
								unencoded_length: BigInt(quilt.length),
							},
						},
					};
				},
				async getSecondarySliver(): Promise<never> {
					throw new Error('Simulated sliver read failure');
				},
			} as unknown as WalrusClient;

			const blobReader = new BlobReader({ client: mockClient, blobId, numShards });
			const quiltReader = blobReader.getQuiltReader();

			// Should still work by falling back to full blob read
			const decodedIndex = await quiltReader.readIndex();
			expect(decodedIndex).toHaveLength(1);
			expect(decodedIndex[0].identifier).toBe('fallback-test');

			const decoded = await quiltReader.readBlob(index.patches[0].startIndex);
			expect(decoded.identifier).toBe('fallback-test');
			expect(decoded.blobContents.length).toBe(originalBlob.length);
			expect(hashBytes(decoded.blobContents)).toBe(hashBytes(originalBlob));
		});
	});

	describe('hash snapshots', () => {
		it('should produce consistent quilt hash for single blob', () => {
			const { quilt } = encodeQuilt({
				blobs: [{ contents: createTestBlob(100, 1), identifier: 'test' }],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"5e618ea5"`);
		});

		it('should produce consistent quilt hash for multiple blobs', () => {
			const { quilt } = encodeQuilt({
				blobs: [
					{ contents: createTestBlob(100, 1), identifier: 'alpha' },
					{ contents: createTestBlob(200, 2), identifier: 'beta' },
					{ contents: createTestBlob(150, 3), identifier: 'gamma' },
				],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"c635a06f"`);
		});

		it('should produce consistent quilt hash with tags', () => {
			const { quilt } = encodeQuilt({
				blobs: [
					{
						contents: createTestBlob(100, 1),
						identifier: 'tagged',
						tags: { key: 'value', foo: 'bar' },
					},
				],
				numShards,
			});

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"9ed5d860"`);
		});
	});

	describe('ID snapshots', () => {
		it('should generate consistent blob IDs', () => {
			expect(blobIdFromInt(0n)).toMatchInlineSnapshot(
				`"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"`,
			);
			expect(blobIdFromInt(1n)).toMatchInlineSnapshot(
				`"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"`,
			);
			expect(blobIdFromInt(12345n)).toMatchInlineSnapshot(
				`"OTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"`,
			);
			expect(blobIdFromInt(0xdeadbeefn)).toMatchInlineSnapshot(
				`"776t3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"`,
			);
			expect(blobIdFromInt(2n ** 256n - 1n)).toMatchInlineSnapshot(
				`"__________________________________________8"`,
			);
		});

		it('should generate consistent quilt patch IDs', () => {
			const patchId1 = encodeQuiltPatchId({
				quiltId: 12345n,
				patchId: { version: 1, startIndex: 10, endIndex: 20 },
			});
			expect(patchId1).toMatchInlineSnapshot(
				`"OTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCgAUAA"`,
			);

			const patchId2 = encodeQuiltPatchId({
				quiltId: 0xabcdefn,
				patchId: { version: 1, startIndex: 100, endIndex: 500 },
			});
			expect(patchId2).toMatchInlineSnapshot(
				`"782rAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZAD0AQ"`,
			);

			const patchId3 = encodeQuiltPatchId({
				quiltId: 2n ** 256n - 1n,
				patchId: { version: 255, startIndex: 65535, endIndex: 65535 },
			});
			expect(patchId3).toMatchInlineSnapshot(
				`"_________________________________________________w"`,
			);
		});
	});

	describe('realistic scenarios', () => {
		it('should handle image-like blob sizes', () => {
			const blobs = [
				{ contents: createTestBlob(150000, 1), identifier: 'image1.jpg' },
				{ contents: createTestBlob(250000, 2), identifier: 'image2.png' },
				{ contents: createTestBlob(50000, 3), identifier: 'thumb.jpg' },
			];

			const { quilt, index } = encodeQuilt({ blobs, numShards });

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"39b32069"`);
			expect(quilt.length).toMatchInlineSnapshot(`891112`);
			expect(index.patches).toHaveLength(3);
		});

		it('should handle mixed content types', () => {
			const blobs = [
				{ contents: createTestBlob(1000, 1), identifier: 'config.json', tags: { type: 'json' } },
				{
					contents: createTestBlob(100000, 2),
					identifier: 'data.bin',
					tags: { type: 'binary' },
				},
				{ contents: createTestBlob(5000, 3), identifier: 'readme.md', tags: { type: 'text' } },
			];

			const { quilt, index } = encodeQuilt({ blobs, numShards });
			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"5150bc69"`);

			expect(index.patches).toHaveLength(3);

			const configPatch = index.patches.find((p) => p.identifier === 'config.json');
			const dataPatch = index.patches.find((p) => p.identifier === 'data.bin');
			expect(configPatch).toBeDefined();
			expect(dataPatch).toBeDefined();

			const configTags = configPatch!.tags as Record<string, string>;
			const dataTags = dataPatch!.tags as Record<string, string>;
			expect(configTags.type).toBe('json');
			expect(dataTags.type).toBe('binary');
		});

		it('should handle many small blobs efficiently', () => {
			const blobs = Array(20)
				.fill(0)
				.map((_, i) => ({
					contents: createTestBlob(100 + i * 10, i),
					identifier: `blob-${i.toString().padStart(3, '0')}`,
				}));

			const { quilt, index } = encodeQuilt({ blobs, numShards });

			expect(hashBytes(quilt)).toMatchInlineSnapshot(`"39d44e50"`);
			expect(quilt.length).toMatchInlineSnapshot(`445556`);
			expect(index.patches).toHaveLength(20);

			for (let i = 0; i < index.patches.length - 1; i++) {
				expect(index.patches[i].identifier < index.patches[i + 1].identifier).toBe(true);
			}
		});
	});

	describe('secondary sliver reading', () => {
		// Test matrix: different quilt layouts × sliver read modes
		const quiltLayouts = [
			{
				name: 'single small blob',
				blobs: [{ contents: createTestBlob(500, 1), identifier: 'small' }],
			},
			{
				name: 'single large blob',
				blobs: [{ contents: createTestBlob(50000, 2), identifier: 'large' }],
			},
			{
				name: 'multiple small blobs',
				blobs: [
					{ contents: createTestBlob(200, 1), identifier: 'a' },
					{ contents: createTestBlob(300, 2), identifier: 'b' },
					{ contents: createTestBlob(250, 3), identifier: 'c' },
				],
			},
			{
				name: 'mixed size blobs',
				blobs: [
					{ contents: createTestBlob(100, 1), identifier: 'tiny' },
					{ contents: createTestBlob(10000, 2), identifier: 'medium' },
					{ contents: createTestBlob(500, 3), identifier: 'small' },
				],
			},
			{
				name: 'blobs with tags',
				blobs: [
					{ contents: createTestBlob(500, 1), identifier: 'tagged-1', tags: { type: 'a' } },
					{ contents: createTestBlob(500, 2), identifier: 'tagged-2', tags: { type: 'b' } },
				],
			},
		] as const;

		const sliverModes = ['success', 'fail'] as const;

		describe.each(quiltLayouts)('layout: $name', ({ blobs }) => {
			it.each(sliverModes)('sliver mode: %s - reads index correctly', async (mode) => {
				const { quilt } = encodeQuilt({ blobs: [...blobs], numShards });
				const blobId = blobIdFromInt(99999n);

				const { reader, calls } = createTrackedBlobReader(quilt, numShards, blobId, mode);
				const quiltReader = reader.getQuiltReader();

				const decodedIndex = await quiltReader.readIndex();

				expect(decodedIndex).toHaveLength(blobs.length);
				const sortedBlobs = [...blobs].sort((a, b) => a.identifier.localeCompare(b.identifier));
				for (let i = 0; i < blobs.length; i++) {
					expect(decodedIndex[i].identifier).toBe(sortedBlobs[i].identifier);
				}

				// Verify call patterns
				if (mode === 'success') {
					expect(calls.getSecondarySliver.length).toBeGreaterThan(0);
					expect(calls.readBlob).toBe(0);
				} else {
					// Fallback mode: secondary slivers attempted then readBlob used
					expect(calls.getSecondarySliver.length).toBeGreaterThan(0);
					expect(calls.readBlob).toBe(1);
				}
			});

			it.each(sliverModes)('sliver mode: %s - reads blob content correctly', async (mode) => {
				const { quilt, index } = encodeQuilt({ blobs: [...blobs], numShards });
				const blobId = blobIdFromInt(88888n);

				const { reader, calls } = createTrackedBlobReader(quilt, numShards, blobId, mode);
				const quiltReader = reader.getQuiltReader();

				// Read all blobs and verify content
				const sortedBlobs = [...blobs].sort((a, b) => a.identifier.localeCompare(b.identifier));

				for (let i = 0; i < index.patches.length; i++) {
					const decoded = await quiltReader.readBlob(index.patches[i].startIndex);
					expect(decoded.identifier).toBe(sortedBlobs[i].identifier);
					expect(decoded.blobContents.length).toBe(sortedBlobs[i].contents.length);
					expect(hashBytes(decoded.blobContents)).toBe(hashBytes(sortedBlobs[i].contents));
				}

				// Verify that operations completed
				if (mode === 'success') {
					expect(calls.readBlob).toBe(0);
				} else {
					expect(calls.readBlob).toBeGreaterThan(0);
				}
			});
		});

		it('success mode should not call readBlob', async () => {
			const blobs = [{ contents: createTestBlob(1000, 42), identifier: 'test' }];
			const { quilt, index } = encodeQuilt({ blobs, numShards });
			const blobId = blobIdFromInt(77777n);

			const { reader, calls } = createTrackedBlobReader(quilt, numShards, blobId, 'success');
			const quiltReader = reader.getQuiltReader();

			await quiltReader.readIndex();
			await quiltReader.readBlob(index.patches[0].startIndex);

			expect(calls.readBlob).toBe(0);
			expect(calls.getSecondarySliver.length).toBeGreaterThan(0);
		});

		it('fail mode should fallback to readBlob after sliver failure', async () => {
			const blobs = [{ contents: createTestBlob(1000, 42), identifier: 'test' }];
			const { quilt, index } = encodeQuilt({ blobs, numShards });
			const blobId = blobIdFromInt(66666n);

			const { reader, calls } = createTrackedBlobReader(quilt, numShards, blobId, 'fail');
			const quiltReader = reader.getQuiltReader();

			await quiltReader.readIndex();
			await quiltReader.readBlob(index.patches[0].startIndex);

			// Should have tried secondary slivers first
			expect(calls.getSecondarySliver.length).toBeGreaterThan(0);
			// Then fallen back to readBlob
			expect(calls.readBlob).toBeGreaterThan(0);
		});

		it('should request correct sliver indices', async () => {
			const blobs = [
				{ contents: createTestBlob(500, 1), identifier: 'first' },
				{ contents: createTestBlob(500, 2), identifier: 'second' },
			];
			const { quilt, index } = encodeQuilt({ blobs, numShards });
			const blobId = blobIdFromInt(55555n);

			const { reader, calls } = createTrackedBlobReader(quilt, numShards, blobId, 'success');
			const quiltReader = reader.getQuiltReader();

			// Read index (starts at sliver 0)
			await quiltReader.readIndex();

			// Sliver indices should start at 0 for index
			expect(calls.getSecondarySliver[0]).toBe(0);

			// Read first blob
			const firstPatchStart = index.patches[0].startIndex;
			calls.getSecondarySliver.length = 0; // Reset tracking
			await quiltReader.readBlob(firstPatchStart);

			// Should have requested slivers starting at the patch's startIndex
			expect(calls.getSecondarySliver).toContain(firstPatchStart);
		});
	});
});
