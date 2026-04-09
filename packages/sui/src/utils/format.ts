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

// Requires at least one digit before an optional fractional part, and if a
// fractional part is present it must have at least one digit. This rejects
// ambiguous forms like "1." or "." while still accepting leading zeros
// ("01.5") which are an ecosystem norm (e.g. viem's parseUnits).
const AMOUNT_REGEX = /^-?[0-9]+(\.[0-9]+)?$/;

/**
 * Parse a human-readable decimal string into a bigint in the smallest unit for a coin
 * with the given number of decimals. Uses pure bigint arithmetic — no floating point —
 * so it preserves precision for values well above `Number.MAX_SAFE_INTEGER`.
 *
 * Throws on excess decimal places rather than rounding: callers must handle precision
 * explicitly.
 *
 * @example
 * ```ts
 * parseToUnits('1', 9)      // => 1000000000n
 * parseToUnits('1.5', 9)    // => 1500000000n
 * parseToUnits('0.0001', 6) // => 100n
 * parseToUnits('-1.5', 9)   // => -1500000000n
 * ```
 */
export function parseToUnits(amount: string, decimals: number): bigint {
	if (decimals < 0 || !Number.isInteger(decimals) || decimals > 77) {
		throw new Error(`Invalid decimals: ${decimals}`);
	}

	if (!AMOUNT_REGEX.test(amount)) {
		throw new Error(`Invalid amount: "${amount}"`);
	}

	const negative = amount.startsWith('-');
	const stripped = negative ? amount.slice(1) : amount;

	const [whole = '0', fraction = ''] = stripped.split('.');

	if (fraction.length > decimals) {
		throw new Error(
			`Too many decimal places: "${amount}" has ${fraction.length} but max is ${decimals}`,
		);
	}

	// When decimals=0, padEnd produces '' which BigInt() can't parse
	const paddedFraction = fraction.padEnd(decimals, '0') || '0';
	const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction);

	return negative ? -result : result;
}

/**
 * Parse a human-readable SUI decimal string into MIST (SUI's smallest unit, 10^-9 SUI).
 * Thin wrapper around {@link parseToUnits} that hard-codes SUI's 9-decimal precision.
 *
 * @example
 * ```ts
 * parseToMist('1')   // => 1000000000n
 * parseToMist('1.5') // => 1500000000n
 * ```
 */
export function parseToMist(amount: string): bigint {
	return parseToUnits(amount, SUI_DECIMALS);
}
