// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { QuiltIndexV1, QuiltPatchBlobHeader, QuiltPatchTags } from '../utils/bcs.js';
import { parseQuiltPatchId, QUILT_PATCH_BLOB_HEADER_SIZE } from '../utils/quilts.js';
import type { WalrusClient } from '../client.js';
import { getSourceSymbols } from '../utils/index.js';

const HAS_TAGS_FLAG = 1 << 0;

export interface QuiltReaderOptions {
	client: WalrusClient;
	blobId: string;
	numShards: number;
}

export class QuiltReader {
	blobId: string;
	#client: WalrusClient;
	#secondarySlivers = new Map<number, Uint8Array | Promise<Uint8Array>>();
	#numShards: number;
	#blobBytes: Uint8Array | Promise<Uint8Array> | null = null;
	#columnSize: number | Promise<number> | null = null;

	constructor({ client, blobId, numShards }: QuiltReaderOptions) {
		this.#client = client;
		this.blobId = blobId;
		this.#numShards = numShards;
	}

	// TODO: We should handle retries and epoch changes
	async #getSecondarySliver({
		sliverIndex,
		signal,
	}: {
		sliverIndex: number;
		signal?: AbortSignal;
	}) {
		if (this.#secondarySlivers.has(sliverIndex)) {
			return this.#secondarySlivers.get(sliverIndex)!;
		}

		const sliverPromise = this.#client
			.getSecondarySliver({
				blobId: this.blobId,
				index: sliverIndex,
				signal,
			})
			.then((sliver) => new Uint8Array(sliver.symbols.data));

		this.#secondarySlivers.set(sliverIndex, sliverPromise);

		try {
			const sliver = await sliverPromise;
			this.#secondarySlivers.set(sliverIndex, sliver);
			return sliver;
		} catch (error) {
			this.#secondarySlivers.delete(sliverIndex);
			throw error;
		}
	}

	async *#sliverator(startIndex: number) {
		for (let i = startIndex; i < this.#numShards; i++) {
			yield this.#getSecondarySliver({ sliverIndex: i });
		}
	}

	async #readBytesFromSlivers(sliver: number, length: number, offset = 0, columnSize?: number) {
		if (!length) {
			return new Uint8Array(0);
		}

		columnSize = columnSize ?? (await this.#getSecondarySliver({ sliverIndex: sliver })).length;
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

		function addSlice(col: number, row: number, skip: number, take: number) {
			const baseIndex = row * rowSize + col * symbolSize;
			const startIndex = baseIndex + skip;
			const endIndex = Math.min(baseIndex + symbolSize, startIndex + take, blob.length);

			if (startIndex >= blob.length) {
				throw new Error('Index out of bounds');
			}

			const size = endIndex - startIndex;
			const subArray = blob.subarray(startIndex, endIndex);
			result.set(subArray, bytesRead);
			bytesRead += size;
		}

		while (bytesRead < length) {
			addSlice(currentCol, currentRow, remainingOffset, length - bytesRead);
			remainingOffset = 0;

			currentRow = (currentRow + 1) % nRows;
			if (currentRow === 0) {
				currentCol += 1;
			}
		}

		return result;
	}

	async #readBytes(sliver: number, length: number, offset = 0, columnSize?: number) {
		if (this.#blobBytes) {
			return this.#readBytesFromBlob(sliver, length, offset);
		}

		try {
			return await this.#readBytesFromSlivers(sliver, length, offset, columnSize);
		} catch (_error) {
			// fallback to reading the full blob
			return this.#readBytesFromBlob(sliver, length, offset);
		}
	}

	async getFullBlob() {
		if (!this.#blobBytes) {
			this.#blobBytes = this.#client.readBlob({ blobId: this.blobId });
		}

		return this.#blobBytes;
	}

	async #readBlob(sliverIndexes: number[]) {
		const slivers = await Promise.all(
			sliverIndexes.map((sliverIndex) => this.#getSecondarySliver({ sliverIndex })),
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

		let tags: Map<string, string> | null = null;
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
			if (this.#blobBytes) {
				Promise.resolve(this.#blobBytes)
					.then((bytes) => {
						const { rowSize, symbolSize } = this.#getSizes(bytes.length);

						return (bytes.length / rowSize) * symbolSize;
					})
					.then(resolve)
					.catch(reject);
			}

			return this.#getSecondarySliver({ sliverIndex: 0 })
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

		return index.patches.map((patch, i) => ({
			startIndex: i === 0 ? indexSlivers : index.patches[i - 1].endIndex,
			...patch,
		}));
	}
}
