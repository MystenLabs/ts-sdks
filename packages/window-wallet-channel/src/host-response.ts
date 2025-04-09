// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parse } from 'valibot';
import type { RequestType } from './requests.js';
import { Request } from './requests.js';
import type { ResponsePayloadType, ResponseType } from './responses.js';

export class HostResponse {
	#request: RequestType;

	constructor(request: RequestType) {
		if (typeof window === 'undefined' || !window.opener) {
			throw new Error(
				'This functionality requires a window opened through `window.open`. `window.opener` is not available.',
			);
		}

		this.#request = request;
	}

	static fromPayload(payload: RequestType) {
		const request = parse(Request, payload);

		return new HostResponse(request);
	}

	static fromUrlHash(hash: string = window.location.hash.slice(1)) {
		const decoded = atob(decodeURIComponent(hash));
		const request = parse(Request, JSON.parse(decoded));

		return new HostResponse(request);
	}

	getRequestData() {
		return this.#request;
	}

	sendMessage(payload: ResponsePayloadType) {
		window.opener.postMessage(
			{
				id: this.#request.requestId,
				source: 'window-wallet-channel',
				payload,
				version: this.#request.version,
			} satisfies ResponseType,
			this.#request.appUrl,
		);
	}

	close(payload?: ResponsePayloadType) {
		if (payload) {
			this.sendMessage(payload);
		}
		window.close();
	}
}
