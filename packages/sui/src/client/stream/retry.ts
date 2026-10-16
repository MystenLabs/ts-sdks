// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../types.js';
import type { ErrorClass } from './adapter.js';
import { SuiStreamError } from './errors.js';

/**
 * Counts consecutive failures without progress.
 *
 * "Progress" means the committed position changed during the failed attempt. Progress resets
 * the count and makes the next reconnect immediate. A disconnect after progress (the routine
 * end of a long-lived connection) is not counted at all, so it works even with `maxAttempts: 0`.
 * Everything else is counted, including a disconnect or overflow that made no progress.
 */
export class RetryBudget {
	readonly #initialDelay: number;
	readonly #maxDelay: number;
	readonly #jitter: number;
	readonly #maxAttempts: number;
	readonly #random: () => number;
	#attempt = 0;

	constructor(options: SuiClientTypes.StreamRetryOptions = {}, random = Math.random) {
		this.#initialDelay = nonNegative(options.initialDelay ?? 250, 'retry.initialDelay');
		this.#maxDelay = nonNegative(options.maxDelay ?? 30_000, 'retry.maxDelay');
		this.#jitter = nonNegative(options.jitter ?? 500, 'retry.jitter');
		this.#maxAttempts = nonNegative(options.maxAttempts ?? Infinity, 'retry.maxAttempts');
		this.#random = random;
	}

	/** Consecutive counted failures; 0 after progress. */
	get attempt() {
		return this.#attempt;
	}

	/** Returns the delay before reconnecting, or throws when the failure ends the stream. */
	onFailure(error: unknown, errorClass: ErrorClass, advanced: boolean): number {
		if (errorClass === 'fatal') throw error;
		if (advanced) this.#attempt = 0;
		if (errorClass === 'disconnect' && advanced) return 0;

		this.#attempt += 1;
		if (this.#attempt > this.#maxAttempts) {
			throw errorClass === 'disconnect'
				? new SuiStreamError('Disconnected', 'Live feed kept disconnecting without progress', {
						cause: error,
					})
				: error;
		}
		if (advanced) return 0;
		const exponential = this.#initialDelay * 2 ** Math.min(this.#attempt - 1, 52);
		return Math.min(this.#maxDelay, exponential) + this.#random() * this.#jitter;
	}
}

function nonNegative(value: number, name: string): number {
	if (!(value >= 0)) throw new SuiStreamError('InvalidOptions', `${name} must not be negative`);
	return value;
}
