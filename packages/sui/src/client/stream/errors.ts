// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export type SuiStreamErrorCode =
	/** An option combination or bound value was rejected before any request. */
	| 'InvalidOptions'
	/** Not a resume token, an unsupported version, or a non-canonical encoding. */
	| 'InvalidToken'
	/** A token from another transport, chain, family or filter, or a changed order or end. */
	| 'IncompatibleToken'
	/** The history the stream needs has been pruned by the server. */
	| 'HistoryUnavailable'
	/** The server broke a documented invariant. */
	| 'Protocol'
	/** The live feed kept ending without progress until the retry budget ran out. */
	| 'Disconnected';

/** A ledger stream failure that is not a transport error. */
export class SuiStreamError extends Error {
	readonly code: SuiStreamErrorCode;

	constructor(code: SuiStreamErrorCode, message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'SuiStreamError';
		this.code = code;
	}
}

/**
 * Internal: a live feed ended. Feeds never complete, so the core treats the end as a disconnect
 * and reconnects. Never escapes the stream: an exhausted budget throws `Disconnected` instead.
 */
export class StreamDisconnected extends Error {
	constructor(message = 'Live feed ended') {
		super(message);
		this.name = 'StreamDisconnected';
	}
}

const callbackErrors = new WeakSet<object>();

/** Marks an error thrown by a user callback, so the core never retries or reports it. */
export function markCallbackError(error: unknown) {
	if (typeof error === 'object' && error !== null) callbackErrors.add(error);
}

export function isCallbackError(error: unknown): boolean {
	return typeof error === 'object' && error !== null && callbackErrors.has(error);
}

/** Adapters call this once per page: a page cursor that did not move would loop forever. */
export function assertAdvanced(previous: string | undefined, next: string, what = 'cursor') {
	if (previous !== undefined && previous === next) {
		throw new SuiStreamError('Protocol', `Pagination did not advance: repeated ${what}`);
	}
}
