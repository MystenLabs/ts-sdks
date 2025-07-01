// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { QuiltPatchBlobHeader, QuiltPatchTags } from '../utils/bcs.js';
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

		const remainingSlivers = [new Uint8Array(firstSliver.buffer, offset), ...slivers.slice(1)];
		const blobContents = new Uint8Array(blobSize);

		let sliverOffset = 0;

		for (let i = 0; i < remainingSlivers.length; i++) {
			const sliver = remainingSlivers[i];

			if (sliverOffset + sliver.length > blobContents.length) {
				blobContents.set(sliver.slice(0, blobContents.length - sliverOffset), sliverOffset);
				break;
			} else {
				blobContents.set(sliver, sliverOffset);
				sliverOffset += sliver.length;
			}
		}

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

		console.log(patchId);

		if (sliverIndexes.length === 0) {
			throw new Error(`The requested patch ${patchId} is invalid`);
		}

		return this.#readBlobFromSlivers(sliverIndexes);
	}

	async readQuiltMetadata() {
		const firstSliver = await this.#getSecondarySliver({
			sliverIndex: 0,
		});

		const version = firstSliver[0];

		if (version !== 1) {
			throw new Error(`Unsupported quilt version ${version}`);
		}

		const columnSize = firstSliver.length;
		const indexSize = new DataView(firstSliver.buffer, 1, 4).getUint32(0, true);

		// const metadata = QuiltPatchMetadata.parse(firstSliver);
	}
}
