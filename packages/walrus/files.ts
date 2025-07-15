// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface WriteResult {
	id: string;
	blobId: string;
	isQuilt: boolean;
	blobObjectId: string;
}

export abstract class WalrusClient {
	abstract readFiles(options: { ids: string[] }): Promise<WalrusFile[]>;
	abstract writeFiles(options: { files: WalrusFile[] }): Promise<WriteResult[]>;
}

export abstract class WalrusFile {
	// I think we will always need a reference to a walrus client
	#client: WalrusClient;

	abstract json(): Promise<unknown>;
	abstract text(): Promise<string>;
	abstract bytes(): Promise<Uint8Array>;
	abstract size(): Promise<number>;
	abstract id(): Promise<string>;

	abstract save(options: { epochs: number; deletable: boolean; signer: Signer }): Promise<void>;

	static abstract from(contents: Uint8Array | string): LocalWalrusFile;
}

export abstract class LocalWalrusFile extends WalrusFile {
	id() {
		throw new Error('Blob does not have an ID yet');
	}
}
export abstract class WalrusBlobFile extends WalrusFile {
	abstract isQuilt(): Promise<boolean>;
	// Should this return an empty array, return null, or throw if the blob is not a quilt?
	abstract listQuiltFiles(): Promise<null | WalrusQuiltFile[]>;
	abstract getQuiltFileByPatchId(id: string): Promise<WalrusQuiltFile>;
	abstract getQuiltFileByIdentifier(identifier: string): Promise<WalrusQuiltFile>;
	abstract getQuiltFilesByTag(tagName: string, tagValue?: string): Promise<WalrusQuiltFile[]>;
	abstract getAttributes(): Promise<Record<string, string>>;
	abstract setAttributes(attributes: Record<string, string | null>): Promise<void>;
}

export abstract class WalrusQuiltFile extends WalrusFile {
	#blob: WalrusBlobFile;
	abstract getIdentifier(): Promise<string>;
	abstract getTags(): Promise<Record<string, string>>;
	abstract getQuiltBlob(): Promise<WalrusBlobFile>;
}
