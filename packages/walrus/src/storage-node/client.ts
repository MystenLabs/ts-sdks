// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BlobMetadata, BlobMetadataWithId, SliverData } from '../utils/bcs.js';
import {
	ConnectionTimeoutError,
	StorageNodeAPIError,
	StorageNodeError,
	UserAbortError,
} from './error.js';
import type {
	GetBlobMetadataRequestInput,
	GetBlobMetadataResponse,
	GetBlobStatusRequestInput,
	GetBlobStatusResponse,
	GetDeletableBlobConfirmationRequestInput,
	GetDeletableBlobConfirmationResponse,
	GetPermanentBlobConfirmationRequestInput,
	GetPermanentBlobConfirmationResponse,
	GetSliverRequestInput,
	GetSliverResponse,
	RawGetBlobStatusResponse,
	StoreBlobMetadataRequestInput,
	StoreBlobMetadataResponse,
	StoreSliverRequestInput,
	StoreSliverResponse,
} from './types.js';
import { mergeHeaders } from './utils.js';

export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export type StorageNodeClientOptions = {
	/**
	 * An optional custom fetch function.
	 *
	 * If not provided, defaults to the global `fetch` function (`globalThis.fetch`).
	 *
	 * @default globalThis.fetch
	 */
	fetch?: Fetch;

	/**
	 * An optional timeout for requests.
	 * @default 30_000ms (30 seconds)
	 */
	timeout?: number;

	/**
	 * Callback for individual network errors.
	 */
	onError?: (error: Error) => void;
};

export type RequestOptions = {
	nodeUrl: string;
	timeout?: number;
	headers?: ReturnType<typeof mergeHeaders>;
} & Omit<RequestInit, 'headers'>;

export class StorageNodeClient {
	#fetch: Fetch;
	#timeout: number;
	#onError?: (error: Error) => void;
	constructor({ fetch: overriddenFetch, timeout, onError }: StorageNodeClientOptions = {}) {
		this.#fetch = overriddenFetch ?? globalThis.fetch;
		this.#timeout = timeout ?? 30_000;
		this.#onError = onError;
	}

	/**
	 * Gets the metadata associated with a Walrus blob.
	 */
	async getBlobMetadata(
		{ blobId }: GetBlobMetadataRequestInput,
		options: RequestOptions,
	): Promise<GetBlobMetadataResponse> {
		const response = await this.#request(`/v1/blobs/${blobId}/metadata`, {
			...options,
			headers: mergeHeaders({ Accept: 'application/octet-stream' }, options.headers),
		});

		const bcsBytes = await response.arrayBuffer();
		return BlobMetadataWithId.parse(new Uint8Array(bcsBytes));
	}

	/**
	 * Gets the status associated with a Walrus blob.
	 */
	async getBlobStatus(
		{ blobId }: GetBlobStatusRequestInput,
		options: RequestOptions,
	): Promise<GetBlobStatusResponse> {
		const response = await this.#request(`/v1/blobs/${blobId}/status`, options);

		const json: RawGetBlobStatusResponse = await response.json();
		const blobStatus = json.success.data;

		if (blobStatus === 'nonexistent') {
			return { type: 'nonexistent' };
		}

		if ('invalid' in blobStatus) {
			return {
				type: 'invalid',
				...blobStatus.invalid,
			};
		}

		if ('permanent' in blobStatus) {
			return {
				type: 'permanent',
				...blobStatus.permanent,
			};
		}

		if ('deletable' in blobStatus) {
			return {
				type: 'deletable',
				...blobStatus.deletable,
			};
		}

		throw new StorageNodeError(`Unknown blob status received: ${blobStatus}`);
	}

	/**
	 * Stores the metadata associated with a registered Walrus blob at this storage
	 * node. This is a pre-requisite for storing the encoded slivers of the blob. The
	 * ID of the blob must first be registered on Sui, after which storing the metadata
	 * becomes possible.
	 *
	 * This endpoint may return an error if the node has not yet received the
	 * registration event from the chain.
	 */
	async storeBlobMetadata(
		{ blobId, metadata }: StoreBlobMetadataRequestInput,
		options: RequestOptions,
	): Promise<StoreBlobMetadataResponse> {
		const isBcsInput = typeof metadata === 'object' && 'V1' in metadata;
		const body = isBcsInput ? BlobMetadata.serialize(metadata).toBytes() : metadata;

		const response = await this.#request(`/v1/blobs/${blobId}/metadata`, {
			...options,
			method: 'PUT',
			body: body as Uint8Array<ArrayBuffer>,
			headers: mergeHeaders({ 'Content-Type': 'application/octet-stream' }, options.headers),
		});

		const json: StoreBlobMetadataResponse = await response.json();
		return json;
	}

	/**
	 * Gets the primary or secondary sliver identified by the specified blob ID and
	 * index. The index should represent a sliver that is assigned to be stored at one
	 * of the shards managed by this storage node during this epoch.
	 */
	async getSliver(
		{ blobId, sliverPairIndex, sliverType }: GetSliverRequestInput,
		options: RequestOptions,
	): Promise<GetSliverResponse> {
		const response = await this.#request(
			`/v1/blobs/${blobId}/slivers/${sliverPairIndex}/${sliverType}`,
			{
				...options,
				headers: mergeHeaders({ Accept: 'application/octet-stream' }, options.headers),
			},
		);

		const bcsBytes = await response.arrayBuffer();
		return new Uint8Array(bcsBytes);
	}

	/**
	 * Stores a primary or secondary blob sliver at the storage node.
	 */
	async storeSliver(
		{ blobId, sliverPairIndex, sliverType, sliver }: StoreSliverRequestInput,
		options: RequestOptions,
	): Promise<StoreSliverResponse> {
		const isBcsInput = typeof sliver === 'object' && 'symbols' in sliver;
		const body = isBcsInput ? SliverData.serialize(sliver).toBytes() : sliver;

		const response = await this.#request(
			`/v1/blobs/${blobId}/slivers/${sliverPairIndex}/${sliverType}`,
			{
				...options,
				method: 'PUT',
				body: body as Uint8Array<ArrayBuffer>,
				headers: mergeHeaders({ 'Content-Type': 'application/octet-stream' }, options.headers),
			},
		);

		const json: StoreSliverResponse = await response.json();
		return json;
	}

	/**
	 * Gets a signed storage confirmation from this storage node, indicating that all shards
	 * assigned to this storage node for the current epoch have stored their respective slivers.
	 */
	async getDeletableBlobConfirmation(
		{ blobId, objectId }: GetDeletableBlobConfirmationRequestInput,
		options: RequestOptions,
	): Promise<GetDeletableBlobConfirmationResponse> {
		const response = await this.#request(
			`/v1/blobs/${blobId}/confirmation/deletable/${objectId}`,
			options,
		);

		const json: GetDeletableBlobConfirmationResponse = await response.json();
		return json;
	}

	/**
	 * Gets a signed storage confirmation from this storage node, indicating that all shards
	 * assigned to this storage node for the current epoch have stored their respective slivers.
	 */
	async getPermanentBlobConfirmation(
		{ blobId }: GetPermanentBlobConfirmationRequestInput,
		options: RequestOptions,
	): Promise<GetPermanentBlobConfirmationResponse> {
		const response = await this.#request(`/v1/blobs/${blobId}/confirmation/permanent`, options);

		const json: GetPermanentBlobConfirmationResponse = await response.json();
		return json;
	}

	async #request(path: string, options: RequestOptions) {
		const { nodeUrl, signal, timeout, ...init } = options;

		if (signal?.aborted) {
			throw new UserAbortError();
		}

		const timeoutSignal = AbortSignal.timeout(timeout ?? this.#timeout);

		let response: Response | undefined;

		try {
			const fetch = this.#fetch;
			response = await fetch(`${nodeUrl}${path}`, {
				...init,
				signal: signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal,
			});
		} catch (error) {
			if (signal?.aborted) {
				throw new UserAbortError();
			}

			if (error instanceof Error && error.name === 'AbortError') {
				const error = new ConnectionTimeoutError();
				this.#onError?.(error);
				throw error;
			}

			this.#onError?.(error as Error);

			throw error;
		}

		if (!response.ok) {
			const errorText = await response.text().catch((reason) => reason);
			const errorJSON = safeParseJSON(errorText);
			const errorMessage = errorJSON ? undefined : errorText;
			const error = StorageNodeAPIError.generate(response.status, errorJSON, errorMessage);
			this.#onError?.(error);
			throw error;
		}

		return response;
	}
}

function safeParseJSON(value: string) {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}
