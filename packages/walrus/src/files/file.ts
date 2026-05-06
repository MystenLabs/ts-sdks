// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LocalReader } from './readers/local.js';

export interface FileReader {
	getIdentifier(): Promise<string | null>;
	getTags(): Promise<Record<string, string>>;
	getBytes(): Promise<Uint8Array>;
}

export class WalrusFile {
	#reader: FileReader;

	static from(options: {
		contents: Uint8Array | Blob;
		identifier: string;
		tags?: Record<string, string>;
	}): WalrusFile {
		return new WalrusFile({
			reader: new LocalReader(options),
		});
	}

	constructor({ reader }: { reader: FileReader }) {
		this.#reader = reader;
	}

	getIdentifier(): Promise<string | null> {
		return this.#reader.getIdentifier();
	}
	getTags(): Promise<Record<string, string>> {
		return this.#reader.getTags();
	}

	bytes(): Promise<Uint8Array> {
		return this.#reader.getBytes();
	}

	async text(): Promise<string> {
		const bytes = await this.bytes();

		return new TextDecoder().decode(bytes);
	}

	async json<T = JsonValue>(): Promise<T> {
		return JSON.parse(await this.text()) as T;
	}
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
