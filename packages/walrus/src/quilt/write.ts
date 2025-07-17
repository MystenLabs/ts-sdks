// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import type { EncodingType } from '../types.js';
import type { QuiltPatchV1 } from '../utils/bcs.js';
import { QuiltIndexV1, QuiltPatchBlobHeader, QuiltPatchTags } from '../utils/bcs.js';
import { getSourceSymbols } from '../utils/index.js';
import {
	BLOB_IDENTIFIER_SIZE_BYTES_LENGTH,
	computeSymbolSize,
	HAS_TAGS_FLAG,
	MAX_BLOB_IDENTIFIER_BYTES_LENGTH,
	MAX_NUM_SLIVERS_FOR_QUILT_INDEX,
	QUILT_INDEX_PREFIX_SIZE,
	QUILT_PATCH_BLOB_HEADER_SIZE,
	TAGS_SIZE_BYTES_LENGTH,
} from '../utils/quilts.js';

interface QuiltBlob {
	contents: Uint8Array;
	identifier: string;
	tags?: Record<string, string>;
}

export interface EncodeQuiltOptions {
	blobs: QuiltBlob[];
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
	quiltIndex.set([1], 0); // version
	quiltIndex.set(new Uint32Array([indexBytes.length]), 1);
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
	const nRows = rowSize / symbolSize;
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

			const subarray = bytes.subarray(index, index + len);
			quilt.set(subarray, startIndex);
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
