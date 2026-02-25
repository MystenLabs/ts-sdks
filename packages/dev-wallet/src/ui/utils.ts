// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export function isSuiCoinType(coinType: string): boolean {
	return coinType.endsWith('::sui::SUI');
}

export function formatAddress(address: string): string {
	if (address.length <= 16) return address;
	return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function getCoinSymbol(coinType: string): string {
	if (isSuiCoinType(coinType)) return 'SUI';
	const parts = coinType.split('::');
	return parts.length >= 3 ? parts[2] : coinType;
}

// Known decimals for common Sui tokens. Unknown tokens default to 0 (raw display).
const KNOWN_DECIMALS: Record<string, number> = {
	SUI: 9,
	USDC: 6,
	USDT: 6,
	WETH: 8,
};

export function getCoinDecimals(coinType: string): number {
	if (isSuiCoinType(coinType)) return 9;
	const symbol = getCoinSymbol(coinType);
	return KNOWN_DECIMALS[symbol] ?? 0;
}

export function formatCoinBalance(balance: string | bigint, decimals: number): string {
	if (decimals === 0) return balance.toString();

	const value = typeof balance === 'string' ? BigInt(balance) : balance;
	const divisor = BigInt(10 ** decimals);
	const whole = value / divisor;
	const fraction = value % divisor;

	if (fraction === 0n) return whole.toString();
	const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
	return `${whole}.${fractionStr}`;
}
