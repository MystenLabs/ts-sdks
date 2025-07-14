// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { QuiltIndexV1, QuiltPatchBlobHeader, QuiltPatchId, QuiltPatchTags } from '../utils/bcs.js';
import { HAS_TAGS_FLAG, parseQuiltPatchId, QUILT_PATCH_BLOB_HEADER_SIZE } from '../utils/quilts.js';
import { getSourceSymbols, urlSafeBase64 } from '../utils/index.js';
import { BlobReader } from '../files/reader.js';
import type { BlobReaderOptions } from '../files/reader.js';

export interface QuiltReaderOptions extends BlobReaderOptions {
	numShards: number;
}

export class QuiltReader extends BlobReader {
	#numShards: number;
	#columnSize: number | Promise<number> | null = null;

	constructor({ client, blobId, numShards, fullBlob }: QuiltReaderOptions) {
		super({ client, blobId, fullBlob });
		this.#numShards = numShards;
	}

	async *#sliverator(startIndex: number) {
		for (let i = startIndex; i < this.#numShards; i++) {
			yield this.getSecondarySliver({ sliverIndex: i });
		}
	}

	async #readBytesFromSlivers(sliver: number, length: number, offset = 0, columnSize?: number) {
		if (!length) {
			return new Uint8Array(0);
		}

		columnSize = columnSize ?? (await this.getSecondarySliver({ sliverIndex: sliver })).length;
		const columnOffset = Math.floor(offset / columnSize);
		let remainingOffset = offset % columnSize;
		const slivers = this.#sliverator(sliver + columnOffset);
		const bytes = new Uint8Array(length);

		let bytesRead = 0;

		for await (const sliver of slivers) {
			let chunk = remainingOffset > 0 ? sliver.subarray(remainingOffset) : sliver;
			remainingOffset -= chunk.length;
			if (chunk.length > length - bytesRead) {
				chunk = chunk.subarray(0, length - bytesRead);
			}

			bytes.set(chunk, bytesRead);
			bytesRead += chunk.length;

			if (bytesRead === length) {
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

		const blob = await this.getFullBlob();
		const { rowSize, symbolSize } = this.#getSizes(blob.length);

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
		if (this.blobBytes) {
			return this.#readBytesFromBlob(sliver, length, offset);
		}

		try {
			return await this.#readBytesFromSlivers(sliver, length, offset, columnSize);
		} catch (_error) {
			// fallback to reading the full blob
			return this.#readBytesFromBlob(sliver, length, offset);
		}
	}

	async #readBlob(sliverIndexes: number[]) {
		const slivers = await Promise.all(
			sliverIndexes.map((sliverIndex) => this.getSecondarySliver({ sliverIndex })),
		);

		const firstSliver = slivers[0];

		if (!firstSliver) {
			throw new Error('Cannot read blob from an empty set of slivers');
		}

		const blobHeader = QuiltPatchBlobHeader.parse(firstSliver);

		let offset = QUILT_PATCH_BLOB_HEADER_SIZE;
		let blobSize = blobHeader.length;
		const identifierLength = new DataView(firstSliver.buffer, offset, 2).getUint16(0, true);
		blobSize -= 2 + identifierLength;
		offset += 2;

		const identifier = bcs.string().parse(firstSliver.subarray(offset, offset + identifierLength));

		offset += identifierLength;

		let tags: Record<string, string> | null = null;
		if (blobHeader.mask & HAS_TAGS_FLAG) {
			const tagsSize = new DataView(firstSliver.buffer, offset, 2).getUint16(0, true);
			offset += 2;

			tags = QuiltPatchTags.parse(firstSliver.subarray(offset, offset + tagsSize));
			blobSize -= tagsSize + 2;
			offset += tagsSize;
		}

		const blobContents = await this.#readBytes(
			sliverIndexes[0],
			blobSize,
			offset,
			firstSliver.length,
		);

		return {
			identifier,
			tags,
			blobContents,
		};
	}

	async readByPatchId(id: string) {
		const { quiltId, patchId } = parseQuiltPatchId(id);

		if (quiltId !== this.blobId) {
			throw new Error(`The requested patch ${patchId} is not part of the quilt ${this.blobId}`);
		}

		const sliverIndexes = [];

		for (let i = patchId.startIndex; i < patchId.endIndex; i++) {
			sliverIndexes.push(i);
		}

		if (sliverIndexes.length === 0) {
			throw new Error(`The requested patch ${patchId} is invalid`);
		}

		return this.#readBlob(sliverIndexes);
	}

	async #getColumnSize() {
		if (this.#columnSize) {
			return await this.#columnSize;
		}

		this.#columnSize = new Promise<number>((resolve, reject) => {
			if (this.blobBytes) {
				Promise.resolve(this.blobBytes)
					.then((bytes) => {
						const { rowSize, symbolSize } = this.#getSizes(bytes.length);

						return (bytes.length / rowSize) * symbolSize;
					})
					.then(resolve)
					.catch(reject);
			}

			return this.getSecondarySliver({ sliverIndex: 0 })
				.then((sliver) => resolve(sliver.length))
				.catch(reject);
		}).catch((error) => {
			this.#columnSize = null;
			throw error;
		});

		return this.#columnSize;
	}

	#getSizes(encodedBlobSize: number) {
		const { primarySymbols, secondarySymbols } = getSourceSymbols(this.#numShards);
		const totalSymbols = primarySymbols * secondarySymbols;

		if (totalSymbols === 0) {
			throw new Error('symbol size should not be 0');
		}

		if (encodedBlobSize % totalSymbols !== 0) {
			throw new Error('blob length should be divisible by total symbols');
		}

		const symbolSize = encodedBlobSize / totalSymbols;
		const rowSize = symbolSize * secondarySymbols;

		return {
			symbolSize,
			rowSize,
		};
	}

	async readIndex() {
		const header = new DataView((await this.#readBytes(0, 5)).buffer);

		const version = header.getUint8(0);

		if (version !== 1) {
			throw new Error(`Unsupported quilt version ${version}`);
		}

		const indexSize = header.getUint32(1, true);
		const indexBytes = await this.#readBytes(0, indexSize, 5);
		const indexSlivers = Math.ceil(indexSize / (await this.#getColumnSize()));
		const index = QuiltIndexV1.parse(indexBytes);

		return index.patches.map((patch, i) => {
			const startIndex = i === 0 ? indexSlivers : index.patches[i - 1].endIndex;

			return {
				startIndex: i === 0 ? indexSlivers : index.patches[i - 1].endIndex,
				patchId: urlSafeBase64(
					QuiltPatchId.serialize({
						quiltId: this.blobId,
						patchId: {
							version: 1,
							startIndex,
							endIndex: patch.endIndex,
						},
					}).toBytes(),
				),
				...patch,
			};
		});
	}
}
