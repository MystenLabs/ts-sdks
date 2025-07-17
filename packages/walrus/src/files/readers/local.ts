// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { FileReader } from '../file.js';

export class LocalReader implements FileReader {
	#contents: Uint8Array | Blob;
	#identifier: string | null;
	#tags: Record<string, string> | null;

	constructor({
		contents,
		identifier,
		tags,
	}: {
		contents: Uint8Array | Blob;
		identifier?: string;
		tags?: Record<string, string>;
	}) {
		this.#contents = contents;
		this.#identifier = identifier ?? null;
		this.#tags = tags ?? null;
	}

	async getBytes() {
		if ('arrayBuffer' in this.#contents) {
			return new Uint8Array(await this.#contents.arrayBuffer());
		}

		return this.#contents;
	}

	async getIdentifier() {
		return this.#identifier;
	}

	async getTags() {
		return this.#tags;
	}
}
