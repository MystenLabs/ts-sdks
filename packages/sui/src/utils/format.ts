// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SUI_DECIMALS } from './constants.js';

const ELLIPSIS = '\u{2026}';

export function formatAddress(address: string) {
	if (address.length <= 6) {
		return address;
	}

	const offset = address.startsWith('0x') ? 2 : 0;

	return `0x${address.slice(offset, offset + 4)}${ELLIPSIS}${address.slice(-4)}`;
}

export function formatDigest(digest: string) {
	// Use 10 first characters
	return `${digest.slice(0, 10)}${ELLIPSIS}`;
}

/**
 * Convert an amount from its smallest unit representation to a human-readable decimal string.
 * Handles negative values correctly. Uses bigint arithmetic exclusively — no floating point.
 *
 * @example
 * ```ts
 * formatAmount(1000000000n, 9) // => '1'
 * formatAmount(1500000000n, 9) // => '1.5'
 * formatAmount(100n, 6)        // => '0.0001'
 * formatAmount(-1500000000n, 9) // => '-1.5'
 * ```
 */
export function formatAmount(amount: bigint, decimals: number): string {
	if (decimals < 0 || !Number.isInteger(decimals) || decimals > 77) {
		throw new Error(`Invalid decimals: ${decimals}`);
	}

	const negative = amount < 0n;
	const absolute = negative ? -amount : amount;

	const divisor = 10n ** BigInt(decimals);
	const whole = absolute / divisor;
	const remainder = absolute % divisor;

	let result: string;
	if (remainder === 0n) {
		result = whole.toString();
	} else {
		const fractional = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
		result = `${whole}.${fractional}`;
	}

	return negative ? `-${result}` : result;
}

const AMOUNT_REGEX = /^-?[0-9]+\.?[0-9]*$/;

/**
 * Convert a human-readable decimal string to the smallest unit representation.
 * Throws on excess decimal places rather than rounding — callers must handle precision explicitly.
 * Uses bigint arithmetic exclusively — no floating point.
 *
 * @example
 * ```ts
 * parseAmount('1', 9)      // => 1000000000n
 * parseAmount('1.5', 9)    // => 1500000000n
 * parseAmount('0.0001', 6) // => 100n
 * parseAmount('-1.5', 9)   // => -1500000000n
 * ```
 */
export function parseAmount(value: string, decimals: number): bigint {
	if (decimals < 0 || !Number.isInteger(decimals) || decimals > 77) {
		throw new Error(`Invalid decimals: ${decimals}`);
	}

	if (!AMOUNT_REGEX.test(value)) {
		throw new Error(`Invalid amount: "${value}"`);
	}

	const negative = value.startsWith('-');
	const stripped = negative ? value.slice(1) : value;

	const [whole = '0', fraction = ''] = stripped.split('.');

	if (fraction.length > decimals) {
		throw new Error(
			`Too many decimal places: "${value}" has ${fraction.length} but max is ${decimals}`,
		);
	}

	// When decimals=0, padEnd produces '' which BigInt() can't parse
	const paddedFraction = fraction.padEnd(decimals, '0') || '0';
	const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction);

	return negative ? -result : result;
}

/**
 * Format a MIST balance as a SUI decimal string.
 *
 * @example
 * ```ts
 * formatSui(1000000000n) // => '1'
 * formatSui(1500000000n) // => '1.5'
 * ```
 */
export function formatSui(balance: bigint): string {
	return formatAmount(balance, SUI_DECIMALS);
}

/**
 * Parse a SUI decimal string into MIST.
 *
 * @example
 * ```ts
 * parseSui('1')   // => 1000000000n
 * parseSui('1.5') // => 1500000000n
 * ```
 */
export function parseSui(value: string): bigint {
	return parseAmount(value, SUI_DECIMALS);
}
