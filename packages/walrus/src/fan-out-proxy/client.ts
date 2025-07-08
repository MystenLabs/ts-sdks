// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectionTimeoutError, StorageNodeAPIError } from '../storage-node/error.js';
import { UserAbortError } from '../storage-node/error.js';
import type { mergeHeaders } from '../storage-node/utils.js';
import type {
	EncodingType,
	FanOutTipConfig,
	ProtocolMessageCertificate,
	WalrusClientRequestOptions,
} from '../types.js';
import { fromUrlSafeBase64, urlSafeBase64 } from '../utils/index.js';

export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export type FanOutProxyClientOptions = {
	host: string;
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
	path: string;
	timeout?: number;
	headers?: ReturnType<typeof mergeHeaders>;
} & Omit<RequestInit, 'headers'>;

export type WriteBlobToFanOutProxyOptions = {
	blobId: string;
	nonce: Uint8Array;
	txDigest: string;
	blob: Uint8Array;
	blobObjectId: string;
	deletable: boolean;
	requiresTip: boolean;
	encodingType?: EncodingType;
} & WalrusClientRequestOptions;

export class FanOutProxyClient {
	host: string;
	#fetch: Fetch;
	#timeout: number;
	#onError?: (error: Error) => void;
	constructor({ host, fetch: overriddenFetch, timeout, onError }: FanOutProxyClientOptions) {
		this.host = host;
		this.#fetch = overriddenFetch ?? globalThis.fetch;
		this.#timeout = timeout ?? 30_000;
		this.#onError = onError;
	}

	async tipConfig(): Promise<FanOutTipConfig> {
		const response = await this.#request({
			method: 'GET',
			path: '/v1/tip-config',
		});

		const data = (await response.json()) as {
			send_tip: {
				address: string;
				kind:
					| {
							const: number;
					  }
					| {
							base: number;
							encoded_size_mul_per_kb: number;
					  };
			};
		};

		if ('const' in data.send_tip.kind) {
			return {
				address: data.send_tip.address,
				kind: {
					const: data.send_tip.kind.const,
				},
			};
		}

		return {
			address: data.send_tip.address,
			kind: {
				linear: {
					base: data.send_tip.kind.base,
					perEncodedKb: data.send_tip.kind.encoded_size_mul_per_kb,
				},
			},
		};
	}

	async writeBlob({
		blobId,
		nonce,
		txDigest,
		blob,
		deletable,
		blobObjectId,
		requiresTip,
		encodingType,
		...options
	}: WriteBlobToFanOutProxyOptions): Promise<{
		blobId: string;
		certificate: ProtocolMessageCertificate;
	}> {
		const query = new URLSearchParams({
			blob_id: blobId,
		});

		if (requiresTip) {
			query.set('nonce', urlSafeBase64(nonce));
			query.set('tx_id', txDigest);
		}

		if (deletable) {
			query.set('deletable_blob_object', blobObjectId);
		}

		if (encodingType) {
			query.set('encoding_type', encodingType);
		}

		const response = await this.#request({
			method: 'POST',
			path: `/v1/blob-fan-out?${query.toString()}`,
			body: blob,
			...options,
		});

		const data: {
			blob_id: number[];
			confirmation_certificate: {
				signers: number[];
				serialized_message: number[];
				signature: string;
			};
		} = await response.json();

		return {
			blobId,
			certificate: {
				signers: data.confirmation_certificate.signers,
				serializedMessage: new Uint8Array(data.confirmation_certificate.serialized_message),
				signature: fromUrlSafeBase64(data.confirmation_certificate.signature),
			},
		};
	}

	async #request(options: RequestOptions) {
		const { signal, timeout, ...init } = options;

		if (signal?.aborted) {
			throw new UserAbortError();
		}

		const timeoutSignal = AbortSignal.timeout(timeout ?? this.#timeout);

		let response: Response | undefined;

		try {
			response = await (0, this.#fetch)(`${this.host}${options.path}`, {
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
