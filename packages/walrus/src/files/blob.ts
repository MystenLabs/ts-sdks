// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalrusClient } from '../client.js';
import { BlobReader } from './readers/blob.js';
import { WalrusFile } from './file.js';
import { ClientCache } from '@mysten/sui/client';

export class WalrusBlob {
	#reader: BlobReader;
	#client: WalrusClient | undefined;
	#cache = new ClientCache();

	constructor({ reader, client }: { reader: BlobReader; client?: WalrusClient }) {
		this.#reader = reader;
		this.#client = client;
	}

	/**
	 * Create a WalrusBlob from pre-fetched bytes (e.g. downloaded from an aggregator).
	 * The returned blob can be used for quilt/file reading without connecting to storage nodes.
	 *
	 * Status methods (exists(), storedUntil()) are not available without a client.
	 */
	static fromBytes({
		bytes,
		blobId,
		numShards,
		client,
	}: {
		bytes: Uint8Array;
		blobId: string;
		numShards: number;
		client?: WalrusClient;
	}) {
		return new WalrusBlob({
			reader: new BlobReader({ blobId, numShards, bytes, client }),
			client,
		});
	}

	/**
	 * Create a WalrusBlob from pre-fetched secondary slivers.
	 * If a client is provided, missing slivers will be fetched from the network as a fallback.
	 * Without a client, only the provided slivers are available.
	 */
	static fromSlivers({
		slivers,
		blobId,
		numShards,
		client,
	}: {
		slivers: Map<number, Uint8Array>;
		blobId: string;
		numShards: number;
		client?: WalrusClient;
	}) {
		const reader = new BlobReader({ blobId, numShards, client });
		reader.seedSlivers(slivers);
		return new WalrusBlob({ reader, client });
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

	#requireClient(method: string): WalrusClient {
		if (!this.#client) {
			throw new Error(
				`WalrusBlob.${method}() requires a WalrusClient. ` +
					'Use WalrusClient.getBlob() if you need status information, ' +
					'or pass a client to WalrusBlob.fromBytes()/fromSlivers().',
			);
		}
		return this.#client;
	}

	async #blobStatus() {
		const client = this.#requireClient('exists/storedUntil');
		return this.#cache.read(['blobStatus', this.#reader.blobId], () =>
			client.getVerifiedBlobStatus({ blobId: this.#reader.blobId }),
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
