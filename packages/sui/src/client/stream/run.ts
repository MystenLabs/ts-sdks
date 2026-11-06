// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { abortableAsyncGenerator, sleep } from '../../utils/abort.js';
import { MvrRequestError } from '../mvr.js';
import type { SuiClientTypes } from '../types.js';
import type { CoreFrame, LedgerStreamAdapter } from './adapter.js';
import { StreamDisconnected, SuiStreamError } from './errors.js';
import { followLive } from './follow.js';
import { isEmptyRange, planStream, validateOptions, type StreamPlan } from './plan.js';
import { StreamSession } from './session.js';
import { StatusReporter } from './status.js';

/**
 * About two minutes of failures without progress with the default delays: long enough for a node
 * restart or a load balancer failover, short enough that a dead endpoint or an error that recurs
 * on every attempt surfaces. Progress resets the count.
 */
const DEFAULT_MAX_ATTEMPTS = 10;

/** A resumable ledger stream. Nothing runs, not even `createAdapter`, before the first `next()`. */
export function createLedgerStream<Item, Frame extends { resumeToken: string }>(
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>,
	createAdapter: () => LedgerStreamAdapter<Item, Frame>,
): AsyncGenerator<CoreFrame<Frame>> {
	return abortableAsyncGenerator(
		(signal) => runStream(options, createAdapter(), signal),
		options.signal,
	);
}

async function* runStream<Item, Frame extends { resumeToken: string }>(
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>,
	adapter: LedgerStreamAdapter<Item, Frame>,
	signal: AbortSignal,
): AsyncGenerator<CoreFrame<Frame>, void> {
	const status = new StatusReporter(options.onStatus);
	const retry = retryDelays(options.retry);
	const validated = validateOptions(options, adapter);
	let attempt = 0;

	/** Waits, then reports the next attempt, or throws when `error` ends the stream. */
	async function backOff(error: unknown, advanced: boolean) {
		const reason =
			signal.aborted || status.callbackFailed || error instanceof SuiStreamError
				? undefined
				: error instanceof StreamDisconnected
					? 'Unavailable'
					: error instanceof MvrRequestError
						? error.reason
						: adapter.retryReason(error);
		if (!reason) throw error;
		attempt = advanced ? 1 : attempt + 1;
		if (attempt > retry.maxAttempts) {
			throw error instanceof StreamDisconnected
				? new SuiStreamError('Disconnected', 'Live feed kept disconnecting without progress', {
						cause: error,
					})
				: error;
		}
		const delay = retry.delay(attempt);
		status.retrying(attempt, delay, reason, error);
		await sleep(delay, signal);
		status.connecting(attempt);
	}
	async function withRetries<T>(request: () => Promise<T>): Promise<T> {
		while (true) {
			try {
				return await request();
			} catch (error) {
				await backOff(error, false);
			}
		}
	}

	status.connecting(0);
	const identity = await withRetries(() => adapter.initialize(signal));
	if (!identity.chain) throw new SuiStreamError('Protocol', 'Stream chain identity is missing');
	const plan = await planStream(
		validated,
		identity,
		adapter,
		async () => identity.indexedTip ?? (await withRetries(() => adapter.indexedTip(signal))),
	);
	const session = new StreamSession({
		plan,
		identity,
		adapter,
		frames: options.frames,
		status,
		signal,
	});
	// Startup retries don't spend the stream's budget.
	attempt = 0;
	if (isEmptyRange(plan, adapter.family)) {
		yield* session.complete();
		return;
	}

	while (true) {
		session.beginAttempt();
		try {
			yield* runAttempt(plan, session, adapter);
			return;
		} catch (error) {
			await backOff(error, session.advancedThisAttempt());
		}
	}
}

// One attempt. Only a finite stream returns; the other modes end by throwing.
async function* runAttempt<Item, Frame extends { resumeToken: string }>(
	plan: StreamPlan,
	session: StreamSession<Item, Frame>,
	adapter: LedgerStreamAdapter<Item, Frame>,
): AsyncGenerator<CoreFrame<Frame>, void> {
	switch (plan.mode) {
		case 'finite':
			yield* session.replay(plan.end);
			yield* session.complete();
			return;
		case 'poll':
			while (true) {
				yield* session.replay(undefined);
				await sleep(plan.pollInterval, session.signal);
			}
		case 'follow':
			return yield* followLive(session, adapter);
	}
}

/** Exponential backoff, less up to 20% jitter. */
function retryDelays(options: SuiClientTypes.StreamRetryOptions = {}) {
	const initialDelay = nonNegative(options.initialDelay ?? 250, 'retry.initialDelay');
	const maxDelay = nonNegative(options.maxDelay ?? 30_000, 'retry.maxDelay');
	const maxAttempts = nonNegative(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, 'retry.maxAttempts');
	return {
		maxAttempts,
		delay: (attempt: number) =>
			Math.min(maxDelay, initialDelay * 2 ** Math.min(attempt - 1, 52)) * (1 - Math.random() / 5),
	};
}

function nonNegative(value: number, name: string): number {
	if (!(value >= 0)) throw new SuiStreamError('InvalidOptions', `${name} must not be negative`);
	return value;
}
