// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferOutput } from 'valibot';
import { parse, safeParse } from 'valibot';

import { withResolvers } from '../../utils/withResolvers.js';
import type { SupportedNetwork } from '../types.js';
import type {
	EnokiConnectRequestData,
	EnokiConnectResponsePayload,
	EnokiConnectResponseTypes,
} from './events.js';
import { EnokiConnectRequest, EnokiConnectResponse } from './events.js';

export { EnokiConnectRequest, EnokiConnectResponse };

export class EnokiConnectPopup {
	#popup: Window;
	#id: string;
	#origin: string;
	#name: string;
	#network: SupportedNetwork;
	#promise: Promise<unknown>;
	#resolve: (data: unknown) => void;
	#reject: (error: Error) => void;
	#interval: ReturnType<typeof setInterval> | null = null;
	#publicAppSlug: string;

	constructor({
		name,
		network,
		origin,
		publicAppSlug,
	}: {
		name: string;
		network: SupportedNetwork;
		origin: string;
		publicAppSlug: string;
	}) {
		const popup = window.open('about:blank', '_blank');

		if (!popup) {
			throw new Error('Failed to open new window');
		}
		this.#popup = popup;

		this.#id = crypto.randomUUID();
		this.#origin = origin;
		this.#name = name;
		this.#network = network;
		this.#publicAppSlug = publicAppSlug;
		const { promise, resolve, reject } = withResolvers();
		this.#promise = promise;
		this.#resolve = resolve;
		this.#reject = reject;

		this.#interval = setInterval(() => {
			try {
				if (this.#popup.closed) {
					this.#cleanup();
					reject(new Error('User closed the Enoki Connect window'));
				}
			} catch {
				// This can error during the login flow, but that's fine.
			}
		}, 1000);
	}

	send<T extends EnokiConnectRequestData['type']>({
		type,
		...data
	}: {
		type: T;
	} & Extract<EnokiConnectRequestData, { type: T }>): Promise<EnokiConnectResponseTypes[T]> {
		window.addEventListener('message', this.#listener);
		this.#popup.location.assign(
			`${this.#origin}/dapp/${type}?${new URLSearchParams({ network: this.#network })}#${encodeURIComponent(
				JSON.stringify({
					id: this.#id,
					origin: window.origin,
					name: this.#name,
					payload: { type, ...data } as EnokiConnectRequestData,
					publicAppSlug: this.#publicAppSlug,
				} satisfies EnokiConnectRequest),
			)}`,
		);

		return this.#promise as Promise<EnokiConnectResponseTypes[T]>;
	}

	close() {
		this.#cleanup();
		this.#popup.close();
	}

	#listener = (event: MessageEvent) => {
		if (!event.isTrusted || event.origin !== this.#origin) {
			return;
		}
		const { success, output } = safeParse(EnokiConnectResponse, event.data);

		if (!success || output.id !== this.#id) {
			return;
		}

		this.#cleanup();

		if (output.payload.type === 'reject') {
			this.#reject(new Error('User rejected the request'));
		} else if (output.payload.type === 'resolve') {
			this.#resolve(output.payload.data);
		}
	};

	#cleanup() {
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = null;
		}
		window.removeEventListener('message', this.#listener);
	}
}

export class EnokiConnectHost {
	#request: InferOutput<typeof EnokiConnectRequest>;

	constructor(request: InferOutput<typeof EnokiConnectRequest>) {
		if (typeof window === 'undefined' || !window.opener) {
			throw new Error(
				'Enoki Connect can only be used in a window opened through `window.open`. `window.opener` is not available.',
			);
		}

		this.#request = request;
	}

	static fromUrl(url: string = window.location.href) {
		const parsed = new URL(url);
		const type = parsed.pathname.split('/').pop();
		const urlHashData = parsed.hash ? JSON.parse(decodeURIComponent(parsed.hash.slice(1))) : {};
		const request = parse(EnokiConnectRequest, urlHashData);

		if (request.payload.type !== type) {
			throw new Error(`Request type mismatch: ${request.payload.type} !== ${type}`);
		}

		return new EnokiConnectHost(request);
	}

	getRequestData() {
		return this.#request;
	}

	sendMessage(payload: EnokiConnectResponsePayload) {
		window.opener.postMessage(
			{
				id: this.#request.id,
				source: `enoki-connect-channel`,
				payload,
			} satisfies EnokiConnectResponse,
			this.#request.origin,
		);
	}

	close(payload?: EnokiConnectResponsePayload) {
		if (payload) {
			this.sendMessage(payload);
		}
		window.close();
	}
}
