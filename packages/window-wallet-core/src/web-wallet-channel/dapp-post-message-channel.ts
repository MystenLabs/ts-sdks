// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { safeParse } from 'valibot';
import type { JsonData, RequestDataType, RequestType } from './requests.js';
import type { ResponseTypes } from './responses.js';
import { Response } from './responses.js';
import { promiseWithResolvers } from '@mysten/utils';
import { getClientMetadata } from './utils.js';

type DappPostMessageChannelOptions = {
	appName: string;
	hostOrigin: string;
	hostPathname?: string;
	extraRequestOptions?: Record<string, JsonData>;
	popupWindow?: Window;
};

export class DappPostMessageChannel {
	#popup: Window;
	#version = '1' as const;
	#id: string;
	#hostOrigin: string;
	#hostPathname: string;
	#appName: string;
	#extraRequestOptions?: Record<string, JsonData>;
	#promise: Promise<unknown>;
	#resolve: (data: unknown) => void;
	#reject: (error: Error) => void;
	#interval: ReturnType<typeof setInterval> | null = null;
	#isSendCalled: boolean = false;

	constructor({
		appName,
		hostOrigin,
		hostPathname = 'dapp-request',
		extraRequestOptions,
		popupWindow,
	}: DappPostMessageChannelOptions) {
		const popup = popupWindow ?? window.open('about:blank', '_blank');

		if (!popup) {
			throw new Error('Failed to open new window');
		}

		this.#id = crypto.randomUUID();
		this.#popup = popup;
		this.#hostOrigin = hostOrigin;
		this.#hostPathname = hostPathname;
		this.#appName = appName;

		const { promise, resolve, reject } = promiseWithResolvers();

		this.#promise = promise;
		this.#resolve = resolve;
		this.#reject = reject;
		this.#extraRequestOptions = extraRequestOptions;
		this.#interval = setInterval(() => {
			try {
				if (this.#popup.closed) {
					this.#cleanup();
					reject(new Error('User closed the wallet window'));
				}
			} catch {
				// This can error during the login flow, but that's fine.
			}
		}, 1000);
	}

	send<T extends RequestDataType['type']>({
		type,
		...data
	}: {
		type: T;
	} & Extract<RequestDataType, { type: T }>): Promise<ResponseTypes[T]> {
		if (this.#popup.closed) {
			throw new Error('User closed the wallet window');
		}

		if (this.#isSendCalled) {
			throw new Error('send() can only be called once');
		}

		this.#isSendCalled = true;

		window.addEventListener('message', this.#listener);

		const requestData = {
			version: this.#version,
			requestId: this.#id,
			appUrl: window.location.href.split('#')[0],
			appName: this.#appName,
			payload: {
				type,
				...data,
			} as RequestDataType,
			metadata: getClientMetadata(),
			extraRequestOptions: this.#extraRequestOptions,
		} satisfies RequestType;
		const encodedRequestData = encodeURIComponent(btoa(JSON.stringify(requestData)));

		this.#popup.location.assign(`${this.#hostOrigin}/${this.#hostPathname}#${encodedRequestData}`);

		return this.#promise as Promise<ResponseTypes[T]>;
	}

	close() {
		this.#cleanup();
		this.#popup.close();
	}

	#listener = (event: MessageEvent) => {
		if (event.origin !== this.#hostOrigin) {
			return;
		}

		const { success, output } = safeParse(Response, event.data);

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
