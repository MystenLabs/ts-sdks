// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalrusClient } from '../client.js';

export interface BlobReaderOptions {
	client: WalrusClient;
	blobId: string;
	fullBlob?: Uint8Array;
}

export class BlobReader {
	blobId: string;
	#client: WalrusClient;
	#secondarySlivers = new Map<number, Uint8Array | Promise<Uint8Array>>();
	protected blobBytes: Uint8Array | Promise<Uint8Array> | null = null;

	constructor({ client, blobId, fullBlob }: BlobReaderOptions) {
		this.#client = client;
		this.blobId = blobId;
		this.blobBytes = fullBlob ?? null;
	}

	// TODO: We should handle retries and epoch changes
	protected async getSecondarySliver({
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

	async getFullBlob() {
		if (!this.blobBytes) {
			this.blobBytes = this.#client.readBlob({ blobId: this.blobId });
		}

		return this.blobBytes;
	}
}
