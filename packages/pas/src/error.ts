// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Base error class for PAS client errors
 */
export class PASClientError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PASClientError';
	}
}

export class PolicyNotFoundError extends PASClientError {
	constructor(assetType: string, message?: string) {
		super(message ?? `Policy not found for asset type ${assetType}.`);
		this.name = 'PolicyNotFoundError';
	}
}

export class InvalidObjectOwnershipError extends PASClientError {
	constructor(objectId: string, ownerKind: string) {
		super(
			`Object ${objectId} has ownership kind "${ownerKind}" which is not allowed in PAS templates. ` +
				`Only shared and immutable objects can be referenced by templates.`,
		);
		this.name = 'InvalidObjectOwnershipError';
	}
}
