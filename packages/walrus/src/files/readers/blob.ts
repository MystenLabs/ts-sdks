// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ClientCache } from '@mysten/sui/experimental';
import type { FileReader } from '../file.js';
import type { WalrusClient } from '../../client.js';
import { getSizes, getSourceSymbols } from '../../utils/index.js';
import { QuiltReader } from './quilt.js';

export interface BlobReaderOptions {
	client: WalrusClient;
	blobId: string;
	numShards: number;
	bytes?: Uint8Array;
}

export class BlobReader implements FileReader {
	blobId: string;

	#cache = new ClientCache();

	#client: WalrusClient;
	#secondarySlivers = new Map<number, Uint8Array | Promise<Uint8Array>>();
	#blobBytes: Uint8Array | Promise<Uint8Array> | null = null;
	// TODO: not sure if/when we can actually set this.  Would be useful for getting the size of quilts
	#isQuilt?: boolean;

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

	getMetadata() {
		return this.#cache.read(['getMetadata'], () =>
			this.#client.getBlobMetadata({ blobId: this.blobId }),
		);
	}

	getSize() {
		return this.#cache.read(['getSize'], async () => {
			if (this.#blobBytes && !('then' in this.#blobBytes)) {
				return this.#blobBytes.length;
			}

			// This calculation only works for blobs that have a size that is a multiple of primarySymbols * secondarySymbols
			if (this.#isQuilt && this.#secondarySlivers.size > 0) {
				try {
					const sliver = await Promise.any(this.#secondarySlivers.values());
					const columnSize = sliver.length;
					const { committee } = await this.#client.systemState();
					const { secondarySymbols } = getSourceSymbols(committee.n_shards);

					return columnSize * secondarySymbols;
				} catch (error) {
					// fallback to other methods
				}
			}

			if (this.isLoadingFullBlob) {
				const blob = await this.getBytes();
				return blob.length;
			}

			const metadata = await this.getMetadata();
			return Number(metadata.metadata.V1.unencoded_length);
		});
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
