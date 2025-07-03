// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { QuiltIndexV1, QuiltPatchBlobHeader, QuiltPatchTags } from '../utils/bcs.js';
import { parseQuiltPatchId, QUILT_PATCH_BLOB_HEADER_SIZE } from '../utils/quilts.js';
import type { WalrusClient } from '../client.js';

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

	async getFullBlob() {
		if (!this.#blobBytes) {
			this.#blobBytes = this.#client.readBlob({ blobId: this.blobId });
		}

		return this.#blobBytes;
	}

	async #readBlobFromSlivers(sliverIndexes: number[]) {
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

		const identifier = bcs
			.string()
			.parse(new Uint8Array(firstSliver.buffer, offset, identifierLength));

		offset += identifierLength;

		let tags: Map<string, string> | null = null;
		if (blobHeader.mask & HAS_TAGS_FLAG) {
			const tagsSize = new DataView(firstSliver.buffer, offset, 2).getUint16(0, true);
			offset += 2;

			tags = QuiltPatchTags.parse(new Uint8Array(firstSliver.buffer, offset, tagsSize));

			blobSize -= tagsSize + 2;
			offset += tagsSize;
		}

		const blobContents = await this.#readBytesFromSlivers(
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

		return this.#readBlobFromSlivers(sliverIndexes);
	}

	async #readQuiltIndexFromSlivers() {
		const firstSliver = await this.#getSecondarySliver({
			sliverIndex: 0,
		});

		const version = firstSliver[0];

		if (version !== 1) {
			throw new Error(`Unsupported quilt version ${version}`);
		}

		const indexSize = new DataView(firstSliver.buffer, 1, 4).getUint32(0, true);
		const indexBytes = await this.#readBytesFromSlivers(0, indexSize, 5, firstSliver.length);
		const indexSlivers = Math.ceil(indexSize / firstSliver.length);
		const index = QuiltIndexV1.parse(indexBytes);

		return index.patches.map((patch, i) => ({
			startIndex: i === 0 ? indexSlivers : index.patches[i - 1].endIndex,
			...patch,
		}));
	}

	async readQuiltIndex() {
		const index = await this.#readQuiltIndexFromSlivers();

		return index;
	}
}
