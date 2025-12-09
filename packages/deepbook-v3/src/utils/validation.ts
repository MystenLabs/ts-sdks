// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isValidSuiAddress } from '@mysten/sui/utils';
import { ValidationError, ConfigurationError } from './errors.js';

/**
 * @description Validate that a required configuration value is set
 * @param {T | undefined} value - The value to validate
 * @param {string} errorMessage - Error message if validation fails
 * @returns {T} The validated value
 * @throws {ConfigurationError} If the value is not set
 */
export function validateRequired<T>(value: T | undefined, errorMessage: string): T {
	if (value === undefined || value === null) {
		throw new ConfigurationError(errorMessage);
	}
	return value;
}

/**
 * @description Validate that a Sui address is valid
 * @param {string} address - The address to validate
 * @param {string} [fieldName='Address'] - Name of the field for error messages
 * @returns {string} The validated address
 * @throws {ValidationError} If the address is invalid
 */
export function validateAddress(address: string, fieldName: string = 'Address'): string {
	if (!isValidSuiAddress(address)) {
		throw new ValidationError(`${fieldName} must be a valid Sui address`);
	}
	return address;
}

/**
 * @description Validate that a number is positive
 * @param {number} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} The validated value
 * @throws {ValidationError} If the value is not positive
 */
export function validatePositiveNumber(value: number, fieldName: string): number {
	if (value <= 0) {
		throw new ValidationError(`${fieldName} must be a positive number`);
	}
	return value;
}

/**
 * @description Validate that a number is non-negative
 * @param {number} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} The validated value
 * @throws {ValidationError} If the value is negative
 */
export function validateNonNegativeNumber(value: number, fieldName: string): number {
	if (value < 0) {
		throw new ValidationError(`${fieldName} must be non-negative`);
	}
	return value;
}

/**
 * @description Validate that a value is within a specified range
 * @param {number} value - The value to validate
 * @param {number} min - Minimum allowed value (inclusive)
 * @param {number} max - Maximum allowed value (inclusive)
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} The validated value
 * @throws {ValidationError} If the value is outside the range
 */
export function validateRange(value: number, min: number, max: number, fieldName: string): number {
	if (value < min || value > max) {
		throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
	}
	return value;
}

/**
 * @description Validate array is not empty
 * @param {T[]} array - The array to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {T[]} The validated array
 * @throws {ValidationError} If the array is empty
 */
export function validateNonEmptyArray<T>(array: T[], fieldName: string): T[] {
	if (!array || array.length === 0) {
		throw new ValidationError(`${fieldName} cannot be empty`);
	}
	return array;
}
