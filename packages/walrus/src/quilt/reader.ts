// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalrusClient } from '../client.js';
import type { SliverData } from '../storage-node/types.js';
import { QuiltPatchBlobHeader, QuiltPatchV1 } from '../utils/bcs.js';
import { parseQuiltPatchId, QUILT_PATCH_BLOB_HEADER_SIZE } from '../utils/quilts.js';

interface QuiltReaderOptions {
	client: WalrusClient;
	blobId: string;
}

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

			console.log(sliver);

			return new Uint8Array(sliver.symbols.data);
		});

		const firstSliver = slivers[0];

		if (!firstSliver) {
			throw new Error('Cannot read blob from an empty set of slivers');
		}

		const blobHeader = QuiltPatchBlobHeader.parse(firstSliver);
		const blobContents = new Uint8Array(blobHeader.length);
		const remainingSlivers = [firstSliver.slice(QUILT_PATCH_BLOB_HEADER_SIZE), ...slivers.slice(1)];
		let offset = 0;

		console.log(firstSliver);

		for (let i = 0; i < remainingSlivers.length; i++) {
			const sliver = remainingSlivers[i];

			if (offset + sliver.length > blobContents.length) {
				blobContents.set(sliver.slice(0, blobContents.length - offset), offset);
				break;
			} else {
				blobContents.set(sliver, offset);
				offset += sliver.length;
			}
		}

		console.log(blobHeader);
		const patch = QuiltPatchV1.parse(blobContents);

		const patchLength = QuiltPatchV1.serialize(patch).toBytes().length;
		console.log(patch, patchLength);

		console.log(blobContents.slice(patchLength, patch.endIndex));
		return blobContents.slice(patchLength, patch.endIndex);
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

		if (sliverIndexes.length === 0) {
			throw new Error(`The requested patch ${patchId} is invalid`);
		}

		await Promise.all(sliverIndexes.map(async (sliverIndex) => this.#loadSliver(sliverIndex)));

		return this.#readBlobFromSlivers(sliverIndexes);
	}
}
