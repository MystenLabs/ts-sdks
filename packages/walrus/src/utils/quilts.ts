// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { EncodingType } from '../types.js';
import { QuiltPatchId } from './bcs.js';
import { fromUrlSafeBase64 } from './index.js';

export const QUILT_INDEX_SIZE_BYTES_LENGTH = 4;
export const QUILT_VERSION_BYTES_LENGTH = 1;
export const QUILT_INDEX_PREFIX_SIZE = QUILT_VERSION_BYTES_LENGTH + QUILT_INDEX_SIZE_BYTES_LENGTH;
export const QUILT_PATCH_BLOB_HEADER_SIZE = 1 + 4 + 1; // bcs length of QuiltPatchBlobHeader

const REQUIRED_ALIGNMENT_BY_ENCODING_TYPE = {
	RS2: 2,
	RedStuff: 2,
};

const MAX_SYMBOL_SIZE_BY_ENCODING_TYPE = {
	RS2: 2 ** 16 - 1,
	RedStuff: 2 ** 16 - 1,
};

/**
 * Finds the minimum symbol size needed to store blobs in a fixed number of columns.
 * Each blob must be stored in consecutive columns exclusively.
 *
 * A binary search is used to find the minimum symbol size:
 * 1. Compute the upper and lower bounds for the symbol size.
 * 2. Check if the all the blobs can be fit into the quilt with the current symbol size.
 * 3. Adjust the bounds based on the result and repeat until the symbol size is found.
 *
 * @param blobsSizes - Slice of blob lengths, including the index size as the first element.
 *   Note that the len of the blob_size should be between 1 and n_columns.
 * @param nColumns - Number of columns available.
 * @param nRows - Number of rows available.
 * @param maxNumColumnsForQuiltIndex - The maximum number of columns that can be used to
 *   store the quilt index.
 * @param encodingType - The encoding type to use.
 *
 * @returns The minimum symbol size needed.
 **/
export function computeSymbolSize(
	blobsSizes: number[],
	nColumns: number,
	nRows: number,
	maxNumColumnsForQuiltIndex: number,
	encodingType: EncodingType,
): number {
	if (blobsSizes.length > nColumns) {
		throw new Error('Too many blobs, the number of blobs must be less than the number of columns');
	}

	if (blobsSizes.length === 0) {
		throw new Error('No blobs provided');
	}

	let minVal = Math.max(
		blobsSizes.reduce((acc, size) => acc + size, 0) / (nColumns * nRows),
		blobsSizes[0] / (nRows * maxNumColumnsForQuiltIndex),
		Math.ceil(QUILT_INDEX_PREFIX_SIZE / nRows),
	);

	let maxVal = Math.ceil((Math.max(...blobsSizes) / (nColumns / blobsSizes.length)) * nRows);

	while (minVal < maxVal) {
		const mid = (minVal + maxVal) / 2;
		if (canBlobsFitIntoMatrix(blobsSizes, nColumns, mid * nRows)) {
			maxVal = mid;
		} else {
			minVal = mid + 1;
		}
	}

	const symbolSize = Math.ceil(minVal / REQUIRED_ALIGNMENT_BY_ENCODING_TYPE[encodingType]);

	if (!canBlobsFitIntoMatrix(blobsSizes, nColumns, symbolSize * nRows)) {
		throw new Error('Quilt oversize');
	}

	if (symbolSize > MAX_SYMBOL_SIZE_BY_ENCODING_TYPE[encodingType]) {
		throw new Error(
			`Quilt oversize: the resulting symbol size ${symbolSize} is larger than the maximum symbol size ${MAX_SYMBOL_SIZE_BY_ENCODING_TYPE[encodingType]}; remove some blobs`,
		);
	}

	return symbolSize;
}

function canBlobsFitIntoMatrix(
	blobsSizes: number[],
	nColumns: number,
	columnSize: number,
): boolean {
	return blobsSizes.reduce((acc, size) => acc + Math.ceil(size / columnSize), 0) <= nColumns;
}

export function parseQuiltPatchId(id: string) {
	return QuiltPatchId.parse(fromUrlSafeBase64(id));
}
