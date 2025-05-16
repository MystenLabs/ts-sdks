// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parse } from 'valibot';
import type { RequestType } from './requests.js';
import { Request } from './requests.js';
import type { ResponsePayloadType, ResponseType } from './responses.js';
import { verifyJwtSession } from '../jwt-session/index.js';

export class WalletPostMessageChannel {
	#request: RequestType;
	#isSendCalled: boolean = false;

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

		return new WalletPostMessageChannel(request);
	}

	static fromUrlHash(hash: string = window.location.hash.slice(1)) {
		const decoded = atob(decodeURIComponent(hash));
		const request = parse(Request, JSON.parse(decoded));

		return new WalletPostMessageChannel(request);
	}

	getRequestData() {
		return this.#request;
	}

	async verifyJwtSession(secretKey: Parameters<typeof verifyJwtSession>[1]) {
		if (!('session' in this.#request.payload)) {
			return null;
		}

		if (!window.opener?.location.href) {
			throw new Error(
				'This functionality requires a window opened through `window.open`. `window.opener` is not available.',
			);
		}

		const session = await verifyJwtSession(this.#request.payload.session, secretKey);

		if (session.aud !== new URL(this.#request.appUrl).origin) {
			throw new Error('App and session origin mismatch');
		}

		const requestAddress = this.#request.payload.address;
		const addressInSession = session.payload.accounts.find(
			(account) => account.address === requestAddress,
		);

		if (!addressInSession) {
			throw new Error('Requested account not found in session');
		}

		return session;
	}

	sendMessage(payload: ResponsePayloadType) {
		if (this.#isSendCalled) {
			throw new Error('sendMessage() can only be called once');
		}

		this.#isSendCalled = true;

		window.opener.postMessage(
			{
				id: this.#request.requestId,
				source: 'web-wallet-channel',
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
