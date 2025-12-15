// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { getSourceSymbols } from '../../src/utils/index.js';
import { computeSymbolSize } from '../../src/utils/quilts.js';

describe('computeSymbolSize', () => {
	const numShards = 1000;
	const { primarySymbols: nRows, secondarySymbols: nCols } = getSourceSymbols(numShards);

	describe('basic functionality', () => {
		it('should compute symbol size for a single small blob', () => {
			const blobSizes = [100];
			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`2`);
		});

		it('should compute symbol size for a single large blob', () => {
			const blobSizes = [1000000];
			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`300`);
		});

		it('should compute symbol size for multiple equal-sized blobs', () => {
			const blobSizes = [1000, 1000, 1000, 1000, 1000];
			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`2`);
		});

		it('should compute symbol size for blobs with varying sizes', () => {
			const blobSizes = [100, 5000, 200, 10000, 500];
			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`2`);
		});

		it('should handle power-of-two blob sizes', () => {
			const blobSizes = [1024, 2048, 4096, 8192];
			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`2`);
		});
	});

	describe('edge cases', () => {
		it('should throw error when no blobs provided', () => {
			expect(() => computeSymbolSize([], nCols, nRows, 10)).toThrow('No blobs provided');
		});

		it('should throw error when too many blobs provided', () => {
			const tooManyBlobs = Array(nCols + 1).fill(100);
			expect(() => computeSymbolSize(tooManyBlobs, nCols, nRows, 10)).toThrow(
				'Too many blobs, the number of blobs must be less than the number of columns',
			);
		});

		it('should handle maximum allowed number of blobs', () => {
			const maxBlobs = Array(nCols).fill(10);
			const result = computeSymbolSize(maxBlobs, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`2`);
		});

		it('should handle blob sizes that are exact multiples of rows', () => {
			const blobSizes = [nRows * 10, nRows * 20, nRows * 30];
			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`2`);
		});
	});

	describe('floating point edge case (issue #736)', () => {
		it('should not infinite loop with problematic blob sizes', () => {
			// This specific set of blob sizes caused an infinite loop due to floating point
			// precision issues in the binary search. The values 112.29359489957069 and
			// 112.2935948995707 are so close that (minVal + maxVal) / 2 equals maxVal
			// without Math.floor.
			const blobSizes = [
				1822, 2223620, 12027, 2453254, 10342, 3134443, 12059, 3946664, 12765, 3043298, 12087,
				3133711, 13003, 3383061, 12093, 3155563, 10893,
			];

			const result = computeSymbolSize(blobSizes, nCols, nRows, 10);
			expect(result).toMatchInlineSnapshot(`112`);
		});
	});
});
