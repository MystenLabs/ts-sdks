// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Convert a quantity value (amount, deposit, etc.) to on-chain u64.
 * If bigint: use as raw on-chain value. If number: scale with Math.round.
 */
export function convertQuantity(value: number | bigint, scalar: number): bigint {
	return typeof value === 'bigint' ? value : BigInt(Math.round(value * scalar));
}

/**
 * Convert a price value to on-chain u64.
 * If bigint: use as raw on-chain value. If number: scale with cross-scalar formula.
 */
export function convertPrice(
	value: number | bigint,
	floatScalar: number,
	quoteScalar: number,
	baseScalar: number,
): bigint {
	return typeof value === 'bigint'
		? value
		: BigInt(Math.round((value * floatScalar * quoteScalar) / baseScalar));
}

/**
 * Convert a rate/fee value to on-chain u64.
 * If bigint: use as raw on-chain value. If number: scale with FLOAT_SCALAR.
 */
export function convertRate(value: number | bigint, floatScalar: number): bigint {
	return typeof value === 'bigint' ? value : BigInt(Math.round(value * floatScalar));
}
