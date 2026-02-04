// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ObjectResponseError } from '../jsonRpc/index.js';
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

export class ObjectError extends SuiClientError {
	code: string;

	constructor(code: string, message: string) {
		super(message);
		this.code = code;
	}

	static fromResponse(response: ObjectResponseError, objectId?: string): ObjectError {
		switch (response.code) {
			case 'notExists':
				return new ObjectError(response.code, `Object ${response.object_id} does not exist`);
			case 'dynamicFieldNotFound':
				return new ObjectError(
					response.code,
					`Dynamic field not found for object ${response.parent_object_id}`,
				);
			case 'deleted':
				return new ObjectError(response.code, `Object ${response.object_id} has been deleted`);
			case 'displayError':
				return new ObjectError(response.code, `Display error: ${response.error}`);
			case 'unknown':
			default:
				return new ObjectError(
					response.code,
					`Unknown error while loading object${objectId ? ` ${objectId}` : ''}`,
				);
		}
	}
}
