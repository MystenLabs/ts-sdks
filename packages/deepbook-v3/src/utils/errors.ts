// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * @description Base class for DeepBook errors
 */
export class DeepBookError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DeepBookError';
	}
}

/**
 * @description Error thrown when a resource is not found
 */
export class ResourceNotFoundError extends DeepBookError {
	constructor(resourceType: string, key: string) {
		super(`${resourceType} not found for key: ${key}`);
		this.name = 'ResourceNotFoundError';
	}
}

/**
 * @description Error thrown when configuration is invalid or missing
 */
export class ConfigurationError extends DeepBookError {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigurationError';
	}
}

/**
 * @description Error thrown when transaction validation fails
 */
export class ValidationError extends DeepBookError {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * @description Standard error messages
 */
export const ErrorMessages = {
	// Configuration errors
	ADMIN_CAP_NOT_SET: 'Admin capability not configured',
	MARGIN_ADMIN_CAP_NOT_SET: 'Margin admin capability not configured',
	MARGIN_MAINTAINER_CAP_NOT_SET: 'Margin maintainer capability not configured',

	// Resource errors
	COIN_NOT_FOUND: (key: string) => `Coin not found for key: ${key}`,
	POOL_NOT_FOUND: (key: string) => `Pool not found for key: ${key}`,
	MARGIN_POOL_NOT_FOUND: (key: string) => `Margin pool not found for key: ${key}`,
	BALANCE_MANAGER_NOT_FOUND: (key: string) => `Balance manager with key ${key} not found`,
	MARGIN_MANAGER_NOT_FOUND: (key: string) => `Margin manager with key ${key} not found`,
	PRICE_INFO_NOT_FOUND: (coinKey: string) => `Price info object not found for ${coinKey}`,

	// Validation errors
	INVALID_ARGUMENT_COUNT: (expected: number, got: number) =>
		`Invalid number of arguments, expected ${expected}, got ${got}`,
	PARAMETER_REQUIRED: (name: string) => `Parameter ${name} is required`,
	INVALID_ARGUMENT: (arg: string, type: string) => `Invalid argument ${arg} for type ${type}`,
	INVALID_ADDRESS: 'Address must be a valid Sui address',
} as const;
