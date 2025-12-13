// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ClientCache } from '@mysten/sui/client';
import type { FileReader } from '../file.js';
import type { WalrusClient } from '../../client.js';
import { getSizes, getSourceSymbols } from '../../utils/index.js';
import { QuiltReader } from './quilt.js';

export interface BlobReaderOptions {
	client: WalrusClient;
	blobId: string;
	numShards: number;
}

export class BlobReader implements FileReader {
	blobId: string;

	#cache = new ClientCache();

	#client: WalrusClient;
	#secondarySlivers = new Map<number, Uint8Array | Promise<Uint8Array>>();
	hasStartedLoadingFullBlob = false;
	#numShards: number;

	constructor({ client, blobId, numShards }: BlobReaderOptions) {
		this.#client = client;
		this.blobId = blobId;
		this.#numShards = numShards;
	}

	async getIdentifier() {
		return null;
	}

	async getTags() {
		return {};
	}

	getQuiltReader() {
		return new QuiltReader({ blob: this });
	}

	async getBytes() {
		return this.#cache.read(['getBytes'], async () => {
			this.hasStartedLoadingFullBlob = true;
			try {
				const blob = await this.#client.readBlob({ blobId: this.blobId });
				return blob;
			} catch (error) {
				this.hasStartedLoadingFullBlob = false;
				throw error;
			}
		});
	}

	getMetadata() {
		return this.#cache.read(['getMetadata'], () =>
			this.#client.getBlobMetadata({ blobId: this.blobId }),
		);
	}

	async getColumnSize() {
		return this.#cache.read(['getColumnSize'], async () => {
			const loadingSlivers = [...this.#secondarySlivers.values()];

			if (loadingSlivers.length > 0) {
				const sliver = await Promise.any(loadingSlivers).catch(() => null);

				if (sliver) {
					return sliver.length;
				}
			}

			if (this.hasStartedLoadingFullBlob) {
				const blob = await this.getBytes();
				const { columnSize } = getSizes(blob.length, this.#numShards);
				return columnSize;
			}

			const metadata = await this.getMetadata();
			const { columnSize } = getSizes(
				Number(metadata.metadata.V1.unencoded_length),
				this.#numShards,
			);

			return columnSize;
		});
	}

	async getSymbolSize() {
		const columnSize = await this.getColumnSize();
		const { primarySymbols } = getSourceSymbols(this.#numShards);

		if (columnSize % primarySymbols !== 0) {
			throw new Error('column size should be divisible by primary symbols');
		}

		return columnSize / primarySymbols;
	}

	async getRowSize() {
		const symbolSize = await this.getSymbolSize();
		const { secondarySymbols } = getSourceSymbols(this.#numShards);
		return symbolSize * secondarySymbols;
	}

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
