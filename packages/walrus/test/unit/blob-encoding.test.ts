// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeAll, afterEach } from 'vitest';

import { getWasmBindings } from '../../src/wasm.js';

// Helper to create deterministic test data
function createTestBlob(size: number, seed: number = 0): Uint8Array {
	const data = new Uint8Array(size);
	for (let i = 0; i < size; i++) {
		data[i] = (i + seed) % 256;
	}
	return data;
}

// Simple hash function for comparing blob contents without direct array comparison
function hashBytes(data: Uint8Array): string {
	let hash = 5381;
	for (let i = 0; i < data.length; i++) {
		hash = ((hash << 5) + hash + data[i]) | 0;
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('blob encoding round-trips', () => {
	const numShards = 1000;
	let wasm: Awaited<ReturnType<typeof getWasmBindings>>;

	beforeAll(async () => {
		wasm = await getWasmBindings();
	});

	// Explicit GC to reduce memory pressure from WASM encoding operations
	afterEach(() => {
		(globalThis as any).gc?.();
	});

	describe('encode and decode', () => {
		it('should round-trip a small blob', () => {
			const originalData = createTestBlob(100, 1);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, originalData);

			const decoded = wasm.decodePrimarySlivers(
				blobId,
				numShards,
				originalData.length,
				primarySlivers,
			);

			expect(blobId).toMatchInlineSnapshot(`"5a9PFTKPcQ4DbDE-2MDwT5B38qkTxhHaKgfM1xKzmU4"`);
			expect(decoded.length).toMatchInlineSnapshot(`100`);
			expect(hashBytes(decoded)).toMatchInlineSnapshot(`"89c5327f"`);
		});

		it('should round-trip a medium blob', () => {
			const originalData = createTestBlob(10000, 42);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, originalData);

			const decoded = wasm.decodePrimarySlivers(
				blobId,
				numShards,
				originalData.length,
				primarySlivers,
			);

			expect(blobId).toMatchInlineSnapshot(`"DT8sosEzCz5bWLenUKGdt7j5zmIvlw5snOECpXQViII"`);
			expect(decoded.length).toMatchInlineSnapshot(`10000`);
			expect(hashBytes(decoded)).toMatchInlineSnapshot(`"6dd3da9d"`);
		});

		it('should round-trip a larger blob', () => {
			const originalData = createTestBlob(100000, 123);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, originalData);

			const decoded = wasm.decodePrimarySlivers(
				blobId,
				numShards,
				originalData.length,
				primarySlivers,
			);

			expect(blobId).toMatchInlineSnapshot(`"5mAQjSq3hwcpxdqrIPL9ACnCJuTNt3fS_E6TCOZQntM"`);
			expect(decoded.length).toMatchInlineSnapshot(`100000`);
			expect(hashBytes(decoded)).toMatchInlineSnapshot(`"0c348795"`);
		});
	});

	describe('blob ID consistency', () => {
		it('should generate consistent blob ID for same data', () => {
			const data = createTestBlob(1000, 99);

			const result1 = wasm.encodeBlob(numShards, data);
			const result2 = wasm.encodeBlob(numShards, data);

			expect(result1.blobId).toMatchInlineSnapshot(`"Awsf2iRisVKjbkFBLliw4KM3xyfctH4SCe5s8-SltiM"`);
			expect(result1.blobId).toBe(result2.blobId);
		});

		it('should generate different blob IDs for different data', () => {
			const data1 = createTestBlob(1000, 1);
			const data2 = createTestBlob(1000, 2);

			const result1 = wasm.encodeBlob(numShards, data1);
			const result2 = wasm.encodeBlob(numShards, data2);

			expect(result1.blobId).toMatchInlineSnapshot(`"vC09PBIQ9EstpEGqnvkCyy-xvLnFj_WtCwEmJ0u64AE"`);
			expect(result2.blobId).toMatchInlineSnapshot(`"WIBSlunwMJPdsJtA-_IszS8TrsN39s1VTPBbgEEtDFI"`);
		});

		it('should generate consistent blob ID for empty data', () => {
			const emptyData = new Uint8Array(0);

			const { blobId } = wasm.encodeBlob(numShards, emptyData);

			expect(blobId).toMatchInlineSnapshot(`"3GPQL3HZNnFhN_F7l5Aa-X1VOtAKwIsg9zuWk8R81v4"`);
		});

		it('should generate consistent blob ID snapshot', () => {
			const data = createTestBlob(500, 42);

			const { blobId } = wasm.encodeBlob(numShards, data);

			expect(blobId).toMatchInlineSnapshot(`"LMmd4BFEy9l5kUHKZb-qVO3BtAbvv-3aOIwEvvWzgLU"`);
		});
	});

	describe('metadata computation', () => {
		it('should compute matching metadata', () => {
			const data = createTestBlob(5000, 77);

			const encoded = wasm.encodeBlob(numShards, data);
			const computed = wasm.computeMetadata(numShards, data);

			expect(encoded.blobId).toMatchInlineSnapshot(`"Xv-WEizkm0ZowfMHxhBd4o-xfCyODJj2TgsUOX2EPPU"`);
			expect(encoded.blobId).toBe(computed.blobId);
			expect(hashBytes(encoded.rootHash)).toMatchInlineSnapshot(`"49c62b52"`);
			expect(hashBytes(encoded.rootHash)).toBe(hashBytes(computed.rootHash));
		});

		it('should compute correct metadata for empty data', () => {
			const emptyData = new Uint8Array(0);

			const metadata = wasm.computeMetadata(numShards, emptyData);

			expect(metadata.blobId).toMatchInlineSnapshot(
				`"3GPQL3HZNnFhN_F7l5Aa-X1VOtAKwIsg9zuWk8R81v4"`,
			);
		});
	});

	describe('sliver structure', () => {
		it('should produce correct number of slivers', () => {
			const data = createTestBlob(1000, 5);

			const { primarySlivers, secondarySlivers, blobId } = wasm.encodeBlob(numShards, data);

			expect(blobId).toMatchInlineSnapshot(`"xOyQIKpbFfUifGbAAMh-YYNCLGOMgtdLItu-UHb5tF0"`);
			expect(primarySlivers.length).toMatchInlineSnapshot(`1000`);
			expect(secondarySlivers.length).toMatchInlineSnapshot(`1000`);
		});

		it('should produce slivers with primary and secondary components', () => {
			const data = createTestBlob(1000, 5);

			const { primarySlivers, secondarySlivers } = wasm.encodeBlob(numShards, data);

			for (let i = 0; i < primarySlivers.length; i++) {
				expect(primarySlivers[i]).toBeInstanceOf(Uint8Array);
				expect(secondarySlivers[i]).toBeInstanceOf(Uint8Array);
			}
		});

		it('should produce consistent sliver hashes', () => {
			const data = createTestBlob(500, 55);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, data);

			expect(blobId).toMatchInlineSnapshot(`"OAbh4OKSH3UAplgPok8_sz0C54IabPrOD4HR7-WyUZI"`);
			// Hash first few primary slivers for snapshot (now BCS-serialized buffers)
			const firstPrimaryHash = hashBytes(primarySlivers[0]);
			const secondPrimaryHash = hashBytes(primarySlivers[1]);

			expect(firstPrimaryHash).toMatchInlineSnapshot(`"041b81c1"`);
			expect(secondPrimaryHash).toMatchInlineSnapshot(`"c940b2e8"`);
		});
	});

	describe('edge cases', () => {
		it('should handle single byte', () => {
			const data = new Uint8Array([42]);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, data);

			const decoded = wasm.decodePrimarySlivers(blobId, numShards, data.length, primarySlivers);

			expect(blobId).toMatchInlineSnapshot(`"0niAAmr9-Q_YFFeP-P6wFZtbwUhk-b7hPwAfCPvW2VE"`);
			expect(decoded.length).toMatchInlineSnapshot(`1`);
			expect(decoded[0]).toMatchInlineSnapshot(`42`);
		});

		it('should handle power-of-two sizes', () => {
			const results: { size: number; blobId: string; hash: string }[] = [];
			for (const size of [64, 256, 1024, 4096]) {
				const data = createTestBlob(size, size);

				const { primarySlivers, blobId } = wasm.encodeBlob(numShards, data);

				const decoded = wasm.decodePrimarySlivers(blobId, numShards, data.length, primarySlivers);

				results.push({ size, blobId, hash: hashBytes(decoded) });
			}
			expect(results).toMatchInlineSnapshot(`
				[
				  {
				    "blobId": "pF3O9UP27CNCii7tgZk1XXNdjvp12h7s3576OvY-JZ8",
				    "hash": "2620ece5",
				    "size": 64,
				  },
				  {
				    "blobId": "sji4t0yWFfIq1h2GqpfrWcCZqtf0MneRIxpQmBL42k0",
				    "hash": "9a5b9485",
				    "size": 256,
				  },
				  {
				    "blobId": "Y7I3MQ2INptonwwvnMInAO8PTxIzVI1Haqrwmv06h5c",
				    "hash": "8f0e1305",
				    "size": 1024,
				  },
				  {
				    "blobId": "hxwiGUrFX3dLC6I_zpMq8XBUpA1iT_RK_q2Tf1b3f6s",
				    "hash": "96380d05",
				    "size": 4096,
				  },
				]
			`);
		});

		it('should handle all-zeros data', () => {
			const data = new Uint8Array(1000);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, data);

			const decoded = wasm.decodePrimarySlivers(blobId, numShards, data.length, primarySlivers);

			expect(blobId).toMatchInlineSnapshot(`"rJL4lspyN0zWTbMDnPGLIJSPbLBeCplfOuyIm05AhdU"`);
			expect(hashBytes(decoded)).toMatchInlineSnapshot(`"ea1ef605"`);
		});

		it('should handle all-255 data', () => {
			const data = new Uint8Array(1000).fill(255);

			const { primarySlivers, blobId } = wasm.encodeBlob(numShards, data);

			const decoded = wasm.decodePrimarySlivers(blobId, numShards, data.length, primarySlivers);

			expect(blobId).toMatchInlineSnapshot(`"8mzGoDlAnqk6s5W2teu28iilOet8TJ_8O4Mwc2jQMkE"`);
			expect(hashBytes(decoded)).toMatchInlineSnapshot(`"9e26149d"`);
		});
	});
});
