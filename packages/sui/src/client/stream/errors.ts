// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClientError } from '../errors.js';

export type SuiStreamErrorCode =
	/** An invalid option or bound. Never retried. */
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
export class SuiStreamError extends SuiClientError {
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
