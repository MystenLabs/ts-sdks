// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../types.js';

/** The only caller of `onStatus`. `Connected` and `Live` are reported once per attempt. */
export class StatusReporter {
	readonly #onStatus: ((status: SuiClientTypes.StreamStatus) => void) | undefined;
	#connected = false;
	#live = false;
	#callbackFailed = false;

	constructor(onStatus: ((status: SuiClientTypes.StreamStatus) => void) | undefined) {
		this.#onStatus = onStatus;
	}

	/** Whether `onStatus` threw. Its error then ends the stream, never retried. */
	get callbackFailed() {
		return this.#callbackFailed;
	}

	connecting(attempt: number) {
		this.#connected = false;
		this.#live = false;
		this.#emit({ $kind: 'Connecting', attempt });
	}

	connected() {
		if (this.#connected) return;
		this.#connected = true;
		this.#emit({ $kind: 'Connected' });
	}

	live() {
		if (this.#live) return;
		this.#live = true;
		this.#emit({ $kind: 'Live' });
	}

	retrying(attempt: number, delay: number, reason: SuiClientTypes.RetryReason, error: unknown) {
		this.#emit({ $kind: 'Retrying', attempt, delay, reason, error });
	}

	#emit(status: SuiClientTypes.StreamStatus) {
		try {
			this.#onStatus?.(status);
		} catch (error) {
			this.#callbackFailed = true;
			throw error;
		}
	}
}
