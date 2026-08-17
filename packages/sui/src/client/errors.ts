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

export interface ObjectErrorOptions {
	/** A transport-neutral reason shared by all Core API clients. */
	reason: ObjectErrorReason;
	/** The requested object ID, when the lookup identifies one. */
	objectId?: string;
	/**
	 * The transport's error code, when it supplies one.
	 *
	 * @deprecated New callers should not supply transport-specific codes. Preserve the original
	 * transport error through `cause` instead.
	 */
	code?: string;
	/** The original transport error or response. */
	cause?: unknown;
}

/** An error returned for an individual object lookup. */
export class ObjectError extends SuiClientError {
	/**
	 * The transport's error code.
	 *
	 * @deprecated Use `reason` for transport-neutral handling. Transport-specific detail is
	 * available through `cause`.
	 */
	code: string;
	/** A transport-neutral reason shared by all Core API clients. */
	readonly reason: ObjectErrorReason;
	/** The requested object ID, when the lookup identifies one. */
	readonly objectId?: string;

	constructor(message: string, options: ObjectErrorOptions);
	/** @deprecated Use `new ObjectError(message, { reason, objectId, cause })`. */
	constructor(code: string, message: string);
	constructor(messageOrCode: string, optionsOrMessage: ObjectErrorOptions | string) {
		const options = typeof optionsOrMessage === 'string' ? undefined : optionsOrMessage;
		const message = typeof optionsOrMessage === 'string' ? optionsOrMessage : messageOrCode;

		super(message, { cause: options?.cause });
		this.code = options ? (options.code ?? options.reason) : messageOrCode;
		this.reason = options?.reason ?? 'unknown';
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
