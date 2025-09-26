// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export function formatBalance(balance: string, decimals: number = 9): string {
	const num = BigInt(balance);
	const divisor = BigInt(10 ** decimals);
	const quotient = num / divisor;
	const remainder = num % divisor;

	if (remainder === 0n) {
		return quotient.toString();
	}

	const remainderStr = remainder.toString().padStart(decimals, '0');
	const trimmed = remainderStr.replace(/0+$/, '');
	return `${quotient}.${trimmed}`;
}

export function formatAddress(
	address: string,
	prefixLength: number = 6,
	suffixLength: number = 4,
): string {
	if (address.length <= prefixLength + suffixLength) {
		return address;
	}
	return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
