// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { WalrusClient } from '../client.js';
import type { WalrusFile } from './file.js';

export abstract class WalrusBlob {
	#files: WalrusFile[] | null = null;
	#blobId: string | null = null;
	#bytes: Promise<Uint8Array> | Uint8Array | null = null;
	#client: WalrusClient;
	#signer: Signer | null = null;

	// Get the blob as a file (i.e. do not use Quilt encoding)
	abstract asFile(): WalrusFile;

	// Gets quilt-based files associated with this blob.
	abstract files(
		filter: { ids: string[] } | { tags: { [tagName: string]: string }[] },
	): Promise<WalrusFile[]>;

	abstract delete(): Promise<void>;
	abstract exists(): Promise<boolean>;

	abstract getAttributes(): Promise<{ [key: string]: string }>;
	abstract setAttributes(attributes: { [key: string]: string }): Promise<void>;

	abstract isDeletable(): Promise<boolean>;
	abstract storageEpochs(): Promise<number>;
}
