// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { abortableAsyncGenerator, sleep } from '../../utils/abort.js';
import type { SuiClientTypes } from '../types.js';
import type { CoreFrame, ErrorClass, LedgerStreamAdapter } from './adapter.js';
import { StreamDisconnected, SuiStreamError } from './errors.js';
import { followLive } from './follow.js';
import {
	assertStartRetained,
	assertTokensCompatible,
	decodeStreamTokens,
	planStream,
	prepareStream,
	resolveTraversal,
	type StreamPlan,
} from './plan.js';
import { RetryBudget } from './retry.js';
import { StreamSession } from './session.js';
import { StatusReporter } from './status.js';

/** A resumable ledger stream. Nothing runs, not even `createAdapter`, before the first `next()`. */
export function createLedgerStream<Item, Frame extends { resumeToken: string }>(
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>,
	createAdapter: () => LedgerStreamAdapter<Item, Frame>,
): AsyncGenerator<CoreFrame<Frame>> {
	return abortableAsyncGenerator(async function* (signal) {
		const status = new StatusReporter(options.onStatus);
		try {
			yield* runStream(options, createAdapter(), status, signal);
		} catch (error) {
			if (!signal.aborted && !status.callbackFailed) status.error(error);
			throw error;
		}
	}, options.signal);
}

async function* runStream<Item, Frame extends { resumeToken: string }>(
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>,
	adapter: LedgerStreamAdapter<Item, Frame>,
	status: StatusReporter,
	signal: AbortSignal,
): AsyncGenerator<CoreFrame<Frame>, void> {
	// Everything that needs no network is validated before the first request, so a failing or
	// retrying request can never hide an option or token error.
	const tokens = decodeStreamTokens(options);
	const traversal = resolveTraversal(options, tokens);
	const retry = new RetryBudget(options.retry);
	const prepared = prepareStream(traversal, tokens, adapter);

	/** Waits before the next attempt, or throws when `error` ends the stream. */
	async function backOff(error: unknown, advanced: boolean) {
		if (signal.aborted || status.callbackFailed) throw error;
		const delay = retry.onFailure(error, classify(error, adapter), advanced);
		status.retrying(retry.attempt, delay, error);
		await sleep(delay, signal);
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

	const identity = await withRetries(() => adapter.initialize(signal));
	if (!identity.chain) throw new SuiStreamError('Protocol', 'Stream chain identity is missing');
	assertTokensCompatible(tokens, identity, adapter);
	// Bounds that depend on the tip fail here with `InvalidOptions`, outside the retry loop.
	const plan = await planStream(
		prepared,
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
	if (plan.empty) {
		yield* session.complete();
		return;
	}
	assertStartRetained(plan, adapter.family, identity.retainedFrom);

	while (true) {
		session.beginAttempt(retry.attempt);
		try {
			yield* runAttempt(plan, session, adapter);
			return;
		} catch (error) {
			session.endAttempt();
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
			yield* session.replay(plan.end ?? 'tip', 'history');
			yield* session.complete();
			return;
		case 'poll':
			while (true) {
				yield* session.replay('tip', 'history');
				session.markLive();
				await sleep(plan.pollInterval, session.signal);
			}
		case 'follow':
			yield* followLive(session, adapter);
			// Unreachable: `deliver()` only ends by throwing.
			throw new SuiStreamError('Protocol', 'Live handoff ended without an error');
	}
}

/** The core decides what it can; transport errors are left to the adapter. */
function classify(
	error: unknown,
	adapter: Pick<LedgerStreamAdapter<never, never>, 'classify'>,
): ErrorClass {
	if (typeof error !== 'object' || error === null) return 'fatal';
	if (error instanceof SuiStreamError) return 'fatal';
	if (error instanceof StreamDisconnected) return 'disconnect';
	return adapter.classify(error);
}
