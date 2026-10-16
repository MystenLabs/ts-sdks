// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../types.js';
import type { Coverage } from './adapter.js';
import { markCallbackError } from './errors.js';

type Phase = 'reading' | 'recovering' | 'live';

/**
 * The only caller of `onStatus`. Statuses describe the stream's phase, so repeats are dropped:
 * `Connected` is reported once per attempt, and `Recovering`/`Live` only when the phase changes.
 * `Page`, `Retrying` and `Error` are always reported.
 */
export class StatusReporter {
	readonly #onStatus: ((status: SuiClientTypes.StreamStatus) => void) | undefined;
	#phase: Phase = 'reading';
	#connected = false;

	constructor(onStatus: ((status: SuiClientTypes.StreamStatus) => void) | undefined) {
		this.#onStatus = onStatus;
	}

	connecting(attempt: number) {
		this.#phase = 'reading';
		this.#connected = false;
		this.#emit({ $kind: 'Connecting', attempt });
	}

	connected() {
		if (this.#connected) return;
		this.#connected = true;
		this.#emit({ $kind: 'Connected' });
	}

	recovering() {
		if (this.#phase === 'recovering') return;
		this.#phase = 'recovering';
		this.#emit({ $kind: 'Recovering' });
	}

	live() {
		if (this.#phase === 'live') return;
		this.#phase = 'live';
		this.#emit({ $kind: 'Live' });
	}

	page(stage: 'history' | 'gap', end: SuiClientTypes.StreamPageEnd, coverage: Coverage) {
		this.#emit({
			$kind: 'Page',
			stage,
			end,
			...(coverage.$kind === 'Through' && { coveredCheckpoint: coverage.checkpoint.toString() }),
		});
	}

	retrying(attempt: number, delay: number, error: unknown) {
		this.#emit({ $kind: 'Retrying', attempt, delay, error });
	}

	error(error: unknown) {
		this.#emit({ $kind: 'Error', error });
	}

	#emit(status: SuiClientTypes.StreamStatus) {
		try {
			this.#onStatus?.(status);
		} catch (error) {
			// A throwing callback ends the stream with its own error: never retried or reported.
			markCallbackError(error);
			throw error;
		}
	}
}
