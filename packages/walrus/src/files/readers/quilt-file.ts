// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { FileReader } from '../file.js';
import type { QuiltReader } from './quilt.js';

export interface QuiltBlobHeader {
	identifier: string;
	tags: Record<string, string> | null;
	blobSize: number;
	contentOffset: number;
	columnSize: number;
}

export class QuiltFileReader implements FileReader {
	#quilt: QuiltReader;
	#sliverIndex: number;
	#identifier: string | null;
	#tags?: Record<string, string> | null;

	constructor({
		quilt,
		sliverIndex,
		identifier,
		tags,
	}: {
		quilt: QuiltReader;
		sliverIndex: number;
		identifier?: string;
		tags?: Record<string, string>;
	}) {
		this.#quilt = quilt;
		this.#sliverIndex = sliverIndex;
		this.#identifier = identifier ?? null;
		this.#tags = tags;
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

		const header = await this.#quilt.getBlobHeader(this.#sliverIndex);

		this.#identifier = header.identifier;
		return this.#identifier;
	}

	async getTags() {
		if (this.#tags !== undefined) {
			return this.#tags;
		}

		const header = await this.#quilt.getBlobHeader(this.#sliverIndex);
		this.#tags = header.tags;
		return header.tags;
	}
}
