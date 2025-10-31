// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalrusClient } from '../client.js';
import type { BlobReader } from './readers/blob.js';
import { WalrusFile } from './file.js';
import { ClientCache } from '@mysten/sui/client';

export class WalrusBlob {
	#reader: BlobReader;
	#client: WalrusClient;
	#cache = new ClientCache();

	constructor({ reader, client }: { reader: BlobReader; client: WalrusClient }) {
		this.#reader = reader;
		this.#client = client;
	}

	// Get the blob as a file (i.e. do not use Quilt encoding)
	asFile() {
		return new WalrusFile({ reader: this.#reader });
	}

	async blobId(): Promise<string | null> {
		return this.#reader.blobId;
	}

	// Gets quilt-based files associated with this blob.
	async files(
		filters: {
			ids?: string[];
			tags?: { [tagName: string]: string }[];
			identifiers?: string[];
		} = {},
	) {
		const quiltReader = await this.#reader.getQuiltReader();
		const index = await quiltReader.readIndex();

		const files = [];

		for (const patch of index) {
			if (filters.ids && !filters.ids.includes(patch.patchId)) {
				continue;
			}

			if (filters.identifiers && !filters.identifiers.includes(patch.identifier)) {
				continue;
			}

			if (
				filters.tags &&
				!filters.tags.some((tags) =>
					Object.entries(tags).every(([tagName, tagValue]) => patch.tags[tagName] === tagValue),
				)
			) {
				continue;
			}

			files.push(new WalrusFile({ reader: quiltReader.readerForPatchId(patch.patchId) }));
		}

		return files;
	}

	async #blobStatus() {
		return this.#cache.read(['blobStatus', this.#reader.blobId], () =>
			this.#client.getVerifiedBlobStatus({ blobId: this.#reader.blobId }),
		);
	}

	async exists() {
		const status = await this.#blobStatus();
		return status.type === 'permanent' || status.type === 'deletable';
	}

	async storedUntil() {
		const status = await this.#blobStatus();

		if (status.type === 'permanent') {
			return status.endEpoch;
		}

		return null;
	}
}
