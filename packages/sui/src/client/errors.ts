// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from './types.js';

/**
 * Structured per-transport escape hatch attached to any `SuiClientError`.
 */
export type TransportDetails =
	| {
			$kind: 'jsonRpc';
			/** The raw `ObjectResponseError` payload from the JSON-RPC response. */
			response: unknown;
	  }
	| {
			$kind: 'grpc';
			/** The `google.rpc.Status` attached to the per-object gRPC result. */
			status: { code: number; message: string; details: unknown[] };
	  }
	| {
			/** No wire payload — GraphQL omits missing objects rather than emitting structured errors. */
			$kind: 'graphql';
	  };

export class SuiClientError extends Error {
	readonly transportDetails?: TransportDetails;

	constructor(
		message?: string,
		options?: { cause?: unknown; transportDetails?: TransportDetails },
	) {
		super(message, { cause: options?.cause });
		this.transportDetails = options?.transportDetails;
	}
}

export class SimulationError extends SuiClientError {
	readonly executionError?: SuiClientTypes.ExecutionError;

	constructor(
		message: string,
		options?: {
			cause?: unknown;
			executionError?: SuiClientTypes.ExecutionError;
			transportDetails?: TransportDetails;
		},
	) {
		super(message, options);
		this.executionError = options?.executionError;
	}
}

export type ObjectErrorCode = 'notFound' | 'unknown';

export class ObjectError extends SuiClientError {
	readonly code: ObjectErrorCode;
	readonly objectId: string;
	declare readonly transportDetails: TransportDetails;

	constructor(
		code: ObjectErrorCode,
		objectId: string,
		options: { cause?: unknown; transportDetails: TransportDetails },
	) {
		super(ObjectError.#formatMessage(code, objectId), options);
		this.code = code;
		this.objectId = objectId;
	}

	static #formatMessage(code: ObjectErrorCode, objectId: string): string {
		switch (code) {
			case 'notFound':
				return `Object not found: ${objectId}`;
			case 'unknown':
				return `Unknown object error: ${objectId}`;
		}
	}
}
