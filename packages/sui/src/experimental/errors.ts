// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ObjectResponseError } from '../client/index.js';

export class SuiClientError extends Error {}

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
