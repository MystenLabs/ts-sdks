// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { FileReader } from '../quilt/reader.js';

export class WalrusFile {
	#reader: FileReader;

	constructor({ reader }: { reader: FileReader }) {
		this.#reader = reader;
	}

	getIdentifier() {
		return this.#reader.getIdentifier();
	}
	getTags() {
		return this.#reader.getTags();
	}

	bytes() {
		return this.#reader.getBytes();
	}

	async text() {
		const bytes = await this.bytes();

		return new TextDecoder().decode(bytes);
	}

	async json() {
		return JSON.parse(await this.text());
	}
}
