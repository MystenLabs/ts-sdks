// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { QuiltIndexV1, QuiltPatchBlobHeader, QuiltPatchId, QuiltPatchTags } from '../utils/bcs.js';
import { HAS_TAGS_FLAG, parseQuiltPatchId, QUILT_PATCH_BLOB_HEADER_SIZE } from '../utils/quilts.js';
import type { WalrusClient } from '../client.js';
import { getSizes, getSourceSymbols, urlSafeBase64 } from '../utils/index.js';

export interface BlobReaderOptions {
	client: WalrusClient;
	blobId: string;
	numShards: number;
	bytes?: Uint8Array;
}

export interface QuiltReaderOptions {
	blob: BlobReader;
}

export interface QuiltBlobHeader {
	identifier: string;
	tags: Record<string, string> | null;
	blobSize: number;
	contentOffset: number;
	columnSize: number;
}

export interface FileReader {
	getIdentifier(): Promise<string | null>;
	getTags(): Promise<Record<string, string> | null>;
	getBytes(): Promise<Uint8Array>;
}

export class BlobReader implements FileReader {
	blobId: string;

	#client: WalrusClient;
	#secondarySlivers = new Map<number, Uint8Array | Promise<Uint8Array>>();
	#blobBytes: Uint8Array | Promise<Uint8Array> | null = null;
	#blobSize: number | null = null;

	constructor({ client, blobId, bytes }: BlobReaderOptions) {
		this.#client = client;
		this.blobId = blobId;
		this.#blobBytes = bytes ?? null;
	}

	async getIdentifier() {
		return null;
	}

	async getTags() {
		return null;
	}

	// TODO: this is currently async incase we want to do some validation or check to ensure this is actually a quilt
	async getQuiltReader() {
		return new QuiltReader({ blob: this });
	}

	async getBytes() {
		if (!this.#blobBytes) {
			this.#blobBytes = this.#client.readBlob({ blobId: this.blobId });
		}

		return this.#blobBytes;
	}

	get isLoadingFullBlob() {
		return this.#blobBytes !== null;
	}

	async getSize(): Promise<number> {
		if (this.#blobSize !== null) {
			return this.#blobSize;
		}

		if (this.#blobBytes && !('then' in this.#blobBytes)) {
			this.#blobSize = this.#blobBytes.length;
			return this.#blobBytes.length;
		}

		if (this.#secondarySlivers.size > 0) {
			try {
				const sliver = await Promise.any(this.#secondarySlivers.values());
				const columnSize = sliver.length;
				const { committee } = await this.#client.systemState();
				const { secondarySymbols } = getSourceSymbols(committee.n_shards);
				this.#blobSize = columnSize * secondarySymbols;
				return this.#blobSize;
			} catch (error) {
				// fallback to other methods
			}
		}

		// TODO: should this fall back to something else before loading the full blob (loading blob metadata, loading a random sliver, etc?)
		const blob = await this.getBytes();
		this.#blobSize = blob.length;
		return this.#blobSize;
	}

	async getSizes() {
		const { committee } = await this.#client.systemState();
		return getSizes(await this.getSize(), committee.n_shards);
	}

	// TODO: We should handle retries and epoch changes
	async getSecondarySliver({ sliverIndex, signal }: { sliverIndex: number; signal?: AbortSignal }) {
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
}

export class QuiltReader {
	#blob: BlobReader;
	#blobHeaders = new Map<number, Promise<QuiltBlobHeader>>();

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

	async #getBlobHeader(sliverIndex: number) {
		if (this.#blobHeaders.has(sliverIndex)) {
			return this.#blobHeaders.get(sliverIndex)!;
		}

		const headerPromise = this.readBlobHeader(sliverIndex);
		this.#blobHeaders.set(sliverIndex, headerPromise);
		headerPromise.catch(() => {
			this.#blobHeaders.delete(sliverIndex);
		});

		return this.#blobHeaders.get(sliverIndex)!;
	}

	async readBlobHeader(sliverIndex: number) {
		const firstSliver = await this.#blob.getSecondarySliver({ sliverIndex });
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

		return {
			identifier,
			tags,
			blobSize,
			contentOffset: offset,
			columnSize: firstSliver.length,
		};
	}

	async readBlob(sliverIndex: number) {
		const blobHeader = await this.#getBlobHeader(sliverIndex);
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

		return new QuiltBlobReader({ quilt: this, sliverIndex: patchId.startIndex });
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

			return {
				startIndex: i === 0 ? indexSlivers : index.patches[i - 1].endIndex,
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
				...patch,
			};
		});
	}
}

export class QuiltBlobReader implements FileReader {
	#quilt: QuiltReader;
	#sliverIndex: number;
	#identifier: string | null = null;
	#tags?: Record<string, string> | null;

	constructor({ quilt, sliverIndex }: { quilt: QuiltReader; sliverIndex: number }) {
		this.#quilt = quilt;
		this.#sliverIndex = sliverIndex;
	}

	async getBytes(): Promise<Uint8Array> {
		const { blobContents, identifier, tags } = await this.#quilt.readBlob(this.#sliverIndex);
		this.#identifier = identifier;
		this.#tags = tags;
		return blobContents;
	}

	async getIdentifier() {
		if (this.#identifier !== null) {
			return this.#identifier;
		}

		const header = await this.#quilt.readBlobHeader(this.#sliverIndex);

		this.#identifier = header.identifier;
		return this.#identifier;
	}

	async getTags() {
		if (this.#tags !== undefined) {
			return this.#tags;
		}

		const header = await this.#quilt.readBlobHeader(this.#sliverIndex);
		this.#tags = header.tags;
		return header.tags;
	}
}
