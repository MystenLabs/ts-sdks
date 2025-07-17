// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ClientCache } from '@mysten/sui/experimental';
import type { BlobReader } from './blob.js';
import { QuiltPatchBlobHeader, QuiltPatchId } from '../../utils/bcs.js';
import {
	HAS_TAGS_FLAG,
	parseQuiltPatchId,
	QUILT_PATCH_BLOB_HEADER_SIZE,
} from '../../utils/quilts.js';
import { bcs } from '@mysten/bcs';
import { QuiltPatchTags } from '../../utils/bcs.js';
import { QuiltIndexV1 } from '../../utils/bcs.js';
import { urlSafeBase64 } from '../../utils/index.js';
import { QuiltFileReader } from './quilt-file.js';

export interface QuiltReaderOptions {
	blob: BlobReader;
}

export class QuiltReader {
	#blob: BlobReader;
	#cache = new ClientCache();

	constructor({ blob }: QuiltReaderOptions) {
		this.#blob = blob;
	}

	async #readBytesFromSlivers(sliver: number, length: number, offset = 0, columnSize?: number) {
		if (!length) {
			return new Uint8Array(0);
		}

		// start loading the first sliver, but don't wait for it (may improve columnSize lookup)
		this.#blob.getSecondarySliver({ sliverIndex: sliver }).catch(() => {});
		columnSize = columnSize ?? (await this.#blob.getSizes()).columnSize;
		const columnOffset = Math.floor(offset / columnSize);
		let remainingOffset = offset % columnSize;
		const bytes = new Uint8Array(length);

		let bytesRead = 0;

		const nSlivers = Math.ceil(length / columnSize);
		const slivers = new Array(nSlivers)
			.fill(0)
			.map((_, i) => this.#blob.getSecondarySliver({ sliverIndex: sliver + columnOffset + i }));

		// ignore errors from slivers that are not consumed below
		slivers.forEach((p) => p.catch(() => {}));

		for await (const sliver of slivers) {
			let chunk = remainingOffset > 0 ? sliver.subarray(remainingOffset) : sliver;
			remainingOffset -= chunk.length;
			if (chunk.length > length - bytesRead) {
				chunk = chunk.subarray(0, length - bytesRead);
			}

			bytes.set(chunk, bytesRead);
			bytesRead += chunk.length;

			if (bytesRead >= length) {
				break;
			}
		}

		return bytes;
	}

	async #readBytesFromBlob(startColumn: number, length: number, offset = 0) {
		const result = new Uint8Array(length);

		if (!length) {
			return result;
		}

		const [blob, { rowSize, symbolSize }] = await Promise.all([
			this.#blob.getBytes(),
			this.#blob.getSizes(),
		]);

		const nRows = blob.length / rowSize;
		const symbolsToSkip = Math.floor(offset / symbolSize);
		let remainingOffset = offset % symbolSize;
		let currentCol = startColumn + Math.floor(symbolsToSkip / nRows);
		let currentRow = symbolsToSkip % nRows;

		let bytesRead = 0;

		while (bytesRead < length) {
			const baseIndex = currentRow * rowSize + currentCol * symbolSize;
			const startIndex = baseIndex + remainingOffset;
			const endIndex = Math.min(
				baseIndex + symbolSize,
				startIndex + length - bytesRead,
				blob.length,
			);

			if (startIndex >= blob.length) {
				throw new Error('Index out of bounds');
			}

			const size = endIndex - startIndex;
			const subArray = blob.subarray(startIndex, endIndex);
			result.set(subArray, bytesRead);
			bytesRead += size;

			remainingOffset = 0;

			currentRow = (currentRow + 1) % nRows;
			if (currentRow === 0) {
				currentCol += 1;
			}
		}

		return result;
	}

	async #readBytes(sliver: number, length: number, offset = 0, columnSize?: number) {
		if (this.#blob.isLoadingFullBlob) {
			return this.#readBytesFromBlob(sliver, length, offset);
		}

		try {
			return await this.#readBytesFromSlivers(sliver, length, offset, columnSize);
		} catch (_error) {
			// fallback to reading the full blob
			return this.#readBytesFromBlob(sliver, length, offset);
		}
	}

	async getBlobHeader(sliverIndex: number) {
		return this.#cache.read(['getBlobHeader', sliverIndex.toString()], async () => {
			const firstSliver = await this.#blob.getSecondarySliver({ sliverIndex });
			const blobHeader = QuiltPatchBlobHeader.parse(firstSliver);

			let offset = QUILT_PATCH_BLOB_HEADER_SIZE;
			let blobSize = blobHeader.length;
			const identifierLength = new DataView(firstSliver.buffer, offset, 2).getUint16(0, true);
			blobSize -= 2 + identifierLength;
			offset += 2;

			const identifier = bcs
				.string()
				.parse(firstSliver.subarray(offset, offset + identifierLength));

			offset += identifierLength;

			let tags: Record<string, string> | null = null;
			if (blobHeader.mask & HAS_TAGS_FLAG) {
				const tagsSize = new DataView(firstSliver.buffer, offset, 2).getUint16(0, true);
				offset += 2;

				tags = QuiltPatchTags.parse(firstSliver.subarray(offset, offset + tagsSize));
				blobSize -= tagsSize + 2;
				offset += tagsSize;
			}

			return {
				identifier,
				tags,
				blobSize,
				contentOffset: offset,
				columnSize: firstSliver.length,
			};
		});
	}

	async readBlob(sliverIndex: number) {
		const blobHeader = await this.getBlobHeader(sliverIndex);
		const { identifier, tags, blobSize, contentOffset, columnSize } = blobHeader;

		const blobContents = await this.#readBytes(sliverIndex, blobSize, contentOffset, columnSize);

		return {
			identifier,
			tags,
			blobContents,
		};
	}

	readerForPatchId(id: string) {
		const { quiltId, patchId } = parseQuiltPatchId(id);

		if (quiltId !== this.#blob.blobId) {
			throw new Error(
				`The requested patch ${patchId} is not part of the quilt ${this.#blob.blobId}`,
			);
		}

		return new QuiltFileReader({ quilt: this, sliverIndex: patchId.startIndex });
	}

	async readIndex() {
		const header = new DataView((await this.#readBytes(0, 5)).buffer);

		const version = header.getUint8(0);

		if (version !== 1) {
			throw new Error(`Unsupported quilt version ${version}`);
		}

		const indexSize = header.getUint32(1, true);
		const indexBytes = await this.#readBytes(0, indexSize, 5);
		const { columnSize } = await this.#blob.getSizes();
		const indexSlivers = Math.ceil(indexSize / columnSize);
		const index = QuiltIndexV1.parse(indexBytes);

		return index.patches.map((patch, i) => {
			const startIndex = i === 0 ? indexSlivers : index.patches[i - 1].endIndex;
			const reader = new QuiltFileReader({
				quilt: this,
				sliverIndex: startIndex,
				identifier: patch.identifier,
				tags: patch.tags,
			});

			return {
				identifier: patch.identifier,
				patchId: urlSafeBase64(
					QuiltPatchId.serialize({
						quiltId: this.#blob.blobId,
						patchId: {
							version: 1,
							startIndex,
							endIndex: patch.endIndex,
						},
					}).toBytes(),
				),
				tags: patch.tags,
				reader,
			};
		});
	}
}
