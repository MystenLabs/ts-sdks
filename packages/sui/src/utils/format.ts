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

const AMOUNT_REGEX = /^-?[0-9]*\.?[0-9]+$/;

/** Parse a decimal string into its smallest-unit bigint representation. No floating point. */
export function parseToUnits(amount: string, decimals: number): bigint {
	if (decimals < 0 || !Number.isInteger(decimals)) {
		throw new Error(`Invalid decimals: ${decimals}`);
	}

	if (!AMOUNT_REGEX.test(amount)) {
		throw new Error(`Invalid amount: "${amount}"`);
	}

	const negative = amount.startsWith('-');
	const stripped = negative ? amount.slice(1) : amount;

	const [whole, fraction = ''] = stripped.split('.');

	if (fraction.length > decimals) {
		throw new Error(
			`Too many decimal places: "${amount}" has ${fraction.length} but max is ${decimals}`,
		);
	}

	const paddedFraction = fraction.padEnd(decimals, '0') || '0';
	const result = BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(paddedFraction);

	return negative ? -result : result;
}

/** Parse a SUI decimal string into MIST (10^-9 SUI). */
export function parseToMist(amount: string): bigint {
	return parseToUnits(amount, SUI_DECIMALS);
}
