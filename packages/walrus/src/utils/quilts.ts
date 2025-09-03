// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import type { EncodingType } from '../types.js';
import type { QuiltPatchV1 } from './bcs.js';
import { QuiltIndexV1, QuiltPatchBlobHeader, QuiltPatchId, QuiltPatchTags } from './bcs.js';
import {
	fromUrlSafeBase64,
	getSourceSymbols,
	MAX_SYMBOL_SIZE_BY_ENCODING_TYPE,
	REQUIRED_ALIGNMENT_BY_ENCODING_TYPE,
	urlSafeBase64,
} from './index.js';

export const QUILT_INDEX_SIZE_BYTES_LENGTH = 4;
export const QUILT_VERSION_BYTES_LENGTH = 1;
export const QUILT_INDEX_PREFIX_SIZE = QUILT_VERSION_BYTES_LENGTH + QUILT_INDEX_SIZE_BYTES_LENGTH;
export const QUILT_PATCH_BLOB_HEADER_SIZE = 1 + 4 + 1; // bcs length of QuiltPatchBlobHeader

export const BLOB_IDENTIFIER_SIZE_BYTES_LENGTH = 2;
export const TAGS_SIZE_BYTES_LENGTH = 2;
export const MAX_BLOB_IDENTIFIER_BYTES_LENGTH = (1 << (8 * BLOB_IDENTIFIER_SIZE_BYTES_LENGTH)) - 1;
export const MAX_NUM_SLIVERS_FOR_QUILT_INDEX = 10;

export const HAS_TAGS_FLAG = 1 << 0;

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
	encodingType: EncodingType = 'RS2',
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

	const symbolSize =
		Math.ceil(minVal / REQUIRED_ALIGNMENT_BY_ENCODING_TYPE[encodingType]) *
		REQUIRED_ALIGNMENT_BY_ENCODING_TYPE[encodingType];

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

export function encodeQuiltPatchId(id: typeof QuiltPatchId.$inferInput) {
	return urlSafeBase64(QuiltPatchId.serialize(id).toBytes());
}

export function parseWalrusId(id: string) {
	const bytes = fromUrlSafeBase64(id);

	if (bytes.length === 32) {
		return {
			kind: 'blob' as const,
			id,
		};
	}

	return {
		kind: 'quiltPatch' as const,
		id: parseQuiltPatchId(id),
	};
}

export interface EncodeQuiltOptions {
	blobs: {
		contents: Uint8Array;
		identifier: string;
		tags?: Record<string, string>;
	}[];
	numShards: number;
	encodingType?: EncodingType;
}

export function encodeQuilt({ blobs, numShards, encodingType }: EncodeQuiltOptions) {
	const { primarySymbols: nRows, secondarySymbols: nCols } = getSourceSymbols(
		numShards,
		encodingType,
	);

	const sortedBlobs = blobs.sort((a, b) => (a.identifier < b.identifier ? -1 : 1));
	const identifiers = new Set<string>();
	const index = {
		patches: [] as (typeof QuiltPatchV1.$inferInput & { startIndex: number })[],
	};
	const tags = sortedBlobs.map((blob) =>
		blob.tags && Object.keys(blob.tags).length > 0
			? QuiltPatchTags.serialize(blob.tags).toBytes()
			: null,
	);

	for (const blob of sortedBlobs) {
		if (identifiers.has(blob.identifier)) {
			throw new Error(`Duplicate blob identifier: ${blob.identifier}`);
		}
		identifiers.add(blob.identifier);
		index.patches.push({
			startIndex: 0,
			endIndex: 0,
			identifier: blob.identifier,
			tags: blob.tags ?? {},
		});
	}

	const indexSize = QUILT_INDEX_PREFIX_SIZE + QuiltIndexV1.serialize(index).toBytes().length;
	const blobMetadata = sortedBlobs.map((blob, i) => {
		const identifierBytes = bcs.string().serialize(blob.identifier).toBytes();
		let metadataSize =
			QUILT_PATCH_BLOB_HEADER_SIZE + BLOB_IDENTIFIER_SIZE_BYTES_LENGTH + identifierBytes.length;

		let mask = 0;
		let offset = 0;

		if (tags[i]) {
			metadataSize += TAGS_SIZE_BYTES_LENGTH + tags[i].length;
			mask |= HAS_TAGS_FLAG << 0;
		}

		const metadata = new Uint8Array(metadataSize);
		const metadataView = new DataView(metadata.buffer);

		const header = QuiltPatchBlobHeader.serialize({
			version: 1,
			length: metadataSize - QUILT_PATCH_BLOB_HEADER_SIZE + blob.contents.length,
			mask,
		}).toBytes();

		metadata.set(header, offset);
		offset += header.length;

		metadataView.setUint16(offset, identifierBytes.length, true);
		offset += BLOB_IDENTIFIER_SIZE_BYTES_LENGTH;
		metadata.set(identifierBytes, offset);
		offset += identifierBytes.length;

		if (tags[i]) {
			metadataView.setUint16(offset, tags[i].length, true);
			offset += TAGS_SIZE_BYTES_LENGTH;
			metadata.set(tags[i], offset);
			offset += tags[i].length;
		}

		return metadata;
	});

	const blobSizes = [
		indexSize,
		...sortedBlobs.map((blob, i) => {
			if (blob.identifier.length > MAX_BLOB_IDENTIFIER_BYTES_LENGTH) {
				throw new Error(`Blob identifier too long: ${blob.identifier}`);
			}

			return blobMetadata[i].length + blob.contents.length;
		}),
	];

	const symbolSize = computeSymbolSize(
		blobSizes,
		nCols,
		nRows,
		MAX_NUM_SLIVERS_FOR_QUILT_INDEX,
		encodingType,
	);

	const rowSize = symbolSize * nCols;
	const columnSize = symbolSize * nRows;
	const indexColumnsNeeded = Math.ceil(indexSize / columnSize);

	if (indexColumnsNeeded > MAX_NUM_SLIVERS_FOR_QUILT_INDEX) {
		throw new Error('Index too large');
	}

	const quilt = new Uint8Array(rowSize * nRows);
	let currentColumn = indexColumnsNeeded;

	for (let i = 0; i < sortedBlobs.length; i++) {
		const blob = sortedBlobs[i];
		index.patches[i].startIndex = currentColumn;
		currentColumn += writeBlobToQuilt(
			quilt,
			blob.contents,
			rowSize,
			columnSize,
			symbolSize,
			currentColumn,
			blobMetadata[i],
		);
		index.patches[i].endIndex = currentColumn;
	}

	const indexBytes = QuiltIndexV1.serialize(index).toBytes();
	const quiltIndex = new Uint8Array(QUILT_INDEX_PREFIX_SIZE + indexBytes.length);
	const view = new DataView(quiltIndex.buffer);
	view.setUint8(0, 1);
	view.setUint32(1, indexBytes.length, true);
	quiltIndex.set(indexBytes, QUILT_INDEX_PREFIX_SIZE);

	writeBlobToQuilt(quilt, quiltIndex, rowSize, columnSize, symbolSize, 0);

	return { quilt, index };
}

function writeBlobToQuilt(
	quilt: Uint8Array,
	blob: Uint8Array,
	rowSize: number,
	columnSize: number,
	symbolSize: number,
	startColumn: number,
	prefix?: Uint8Array,
) {
	const nRows = columnSize / symbolSize;
	let bytesWritten = 0;

	if (rowSize % symbolSize !== 0) {
		throw new Error('Row size must be divisible by symbol size');
	}

	if (columnSize % symbolSize !== 0) {
		throw new Error('Column size must be divisible by symbol size');
	}

	if (prefix) {
		writeBytes(prefix);
	}

	writeBytes(blob);

	return Math.ceil(bytesWritten / columnSize);

	function writeBytes(bytes: Uint8Array) {
		const offset = bytesWritten;
		const symbolsToSkip = Math.floor(offset / symbolSize);
		let remainingOffset = offset % symbolSize;
		let currentCol = startColumn + Math.floor(symbolsToSkip / nRows);
		let currentRow = symbolsToSkip % nRows;

		let index = 0;
		while (index < bytes.length) {
			const baseIndex = currentRow * rowSize + currentCol * symbolSize;
			const startIndex = baseIndex + remainingOffset;
			const len = Math.min(symbolSize - remainingOffset, bytes.length - index);

			for (let i = 0; i < len; i++) {
				quilt[startIndex + i] = bytes[index + i];
			}
			index += len;
			remainingOffset = 0;
			currentRow = (currentRow + 1) % nRows;
			if (currentRow === 0) {
				currentCol++;
			}
		}

		bytesWritten += bytes.length;
	}
}
