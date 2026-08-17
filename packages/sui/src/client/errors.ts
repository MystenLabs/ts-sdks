// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from './types.js';

export class SuiClientError extends Error {}

export class SimulationError extends SuiClientError {
	executionError?: SuiClientTypes.ExecutionError;

	constructor(
		message: string,
		options?: { cause?: unknown; executionError?: SuiClientTypes.ExecutionError },
	) {
		super(message, { cause: options?.cause });
		this.executionError = options?.executionError;
	}
}

export type ObjectErrorReason = 'notFound' | 'deleted' | 'unknown';

/** An error returned for an individual object lookup. */
export class ObjectError extends SuiClientError {
	/** The transport's existing error code. Use `reason` for transport-neutral handling. */
	readonly code: string;
	/** A transport-neutral reason shared by all Core API clients. */
	readonly reason: ObjectErrorReason;
	/** The requested object ID, when the lookup identifies one. */
	readonly objectId?: string;

	constructor(
		code: string,
		message: string,
		options?: { cause?: unknown; reason?: ObjectErrorReason; objectId?: string },
	) {
		super(message, options);
		this.code = code;
		this.reason = options?.reason ?? inferObjectErrorReason(code);
		this.objectId = options?.objectId;
	}
}

export type TransactionErrorReason = 'notFound';

/** An error returned by a transaction lookup. */
export class TransactionError extends SuiClientError {
	/** A transport-neutral reason shared by all Core API clients. */
	readonly reason: TransactionErrorReason;
	/** The requested transaction digest. */
	readonly digest: string;

	constructor(reason: TransactionErrorReason, digest: string, options?: { cause?: unknown }) {
		super(`Transaction ${digest} not found`, options);
		this.reason = reason;
		this.digest = digest;
	}
}

function inferObjectErrorReason(code: string): ObjectErrorReason {
	switch (code) {
		case 'notExists':
		case 'dynamicFieldNotFound':
		case 'notFound':
			return 'notFound';
		case 'deleted':
			return 'deleted';
		case 'displayError':
		case 'unknown':
		default:
			return 'unknown';
	}
}
