// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalrusBlob } from './blob.js';

export abstract class WalrusFile {
	blob?: WalrusBlob;
	#bytes?: Promise<Uint8Array> | Uint8Array | null;
	#identifier?: string | null;
	#tags?: Record<string, string> | null;

	abstract getIdentifier(): Promise<string | null>;
	abstract getTags(): Promise<Record<string, string> | null>;

	abstract bytes(): Promise<Uint8Array>;
	abstract text(): Promise<string>;
	abstract json(): Promise<unknown>;
}
