// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../types.js';
import type { ErrorClass } from './adapter.js';
import { SuiStreamError } from './errors.js';

/** The pause after an attempt that advanced only by progress (at most `initialDelay`). */
const PROGRESS_ONLY_DELAY = 250;

/**
 * Counts consecutive failures without progress (a change in the committed position). Progress
 * resets the count, and a disconnect after progress reconnects without counting, so long-lived
 * feeds keep working even with `maxAttempts: 0`.
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

	/**
	 * Returns the delay before reconnecting, or throws when the failure ends the stream. A broken
	 * connection after progress is free, like a live feed that ended. After progress the stream
	 * reconnects at once, or after a short pause when the attempt delivered no item
	 * (`progressOnly`), so a server that sends one progress edge and then fails is not hit in a
	 * tight loop.
	 */
	onFailure(
		error: unknown,
		errorClass: ErrorClass,
		advanced: boolean,
		reason?: SuiClientTypes.StreamRetryReason,
		progressOnly = false,
	): number {
		if (errorClass === 'fatal') throw error;
		const afterProgress = progressOnly ? Math.min(this.#initialDelay, PROGRESS_ONLY_DELAY) : 0;
		if (advanced) this.#attempt = 0;
		if (advanced && (errorClass === 'disconnect' || reason === 'Disconnected')) {
			return afterProgress;
		}

		this.#attempt += 1;
		if (this.#attempt > this.#maxAttempts) {
			throw errorClass === 'disconnect'
				? new SuiStreamError('Disconnected', 'Live feed kept disconnecting without progress', {
						cause: error,
					})
				: error;
		}
		if (advanced) return afterProgress;
		const exponential = this.#initialDelay * 2 ** Math.min(this.#attempt - 1, 52);
		return Math.min(this.#maxDelay, exponential) + this.#random() * this.#jitter;
	}
}

function nonNegative(value: number, name: string): number {
	if (!(value >= 0)) throw new SuiStreamError('InvalidOptions', `${name} must not be negative`);
	return value;
}
