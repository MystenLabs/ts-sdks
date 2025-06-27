// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import type { WalrusClient } from '../client.js';
import type { SliverData } from '../storage-node/types.js';
import { QuiltPatchBlobHeader, QuiltPatchTags } from '../utils/bcs.js';
import { parseQuiltPatchId, QUILT_PATCH_BLOB_HEADER_SIZE } from '../utils/quilts.js';

interface QuiltReaderOptions {
	client: WalrusClient;
	blobId: string;
}

const HAS_TAGS_FLAG = 1 << 0;

export class QuiltReader {
	#client: WalrusClient;
	#blobId: string;
	#slivers = new Map<number, SliverData>();

	constructor({ client, blobId }: QuiltReaderOptions) {
		this.#client = client;
		this.#blobId = blobId;
	}

	async #loadSliver(sliverIndex: number) {
		if (this.#slivers.has(sliverIndex)) {
			return;
		}

		const sliver = await this.#client.getSecondarySliver({
			blobId: this.#blobId,
			index: sliverIndex,
		});

		this.#slivers.set(sliverIndex, sliver);
	}

	#readBlobFromSlivers(sliverIndexes: number[]) {
		const slivers = sliverIndexes.map((sliverIndex) => {
			const sliver = this.#slivers.get(sliverIndex);

			if (!sliver) {
				throw new Error(`Sliver ${sliverIndex} has not been loaded`);
			}

			return new Uint8Array(sliver.symbols.data);
		});

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

	async readPatchById(id: string) {
		const { quiltId, patchId } = parseQuiltPatchId(id);

		if (quiltId !== this.#blobId) {
			throw new Error(`The requested patch ${patchId} is not part of the quilt ${this.#blobId}`);
		}

		const sliverIndexes = [];

		for (let i = patchId.startIndex; i < patchId.endIndex; i++) {
			sliverIndexes.push(i);
		}

		console.log(patchId);

		if (sliverIndexes.length === 0) {
			throw new Error(`The requested patch ${patchId} is invalid`);
		}

		await Promise.all(sliverIndexes.map(async (sliverIndex) => this.#loadSliver(sliverIndex)));

		return this.#readBlobFromSlivers(sliverIndexes);
	}
}
