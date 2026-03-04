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

/** Check if a type string is a Coin wrapper (0x2::coin::Coin<...>) */
export function isCoinType(type: string): boolean {
	return /::coin::Coin</.test(type);
}

/** Extract the short struct name from a full Move type string */
export function getTypeName(type: string): string {
	// Remove generics for the display name
	const base = type.replace(/<.*>$/, '');
	const parts = base.split('::');
	return parts.length >= 3 ? parts[parts.length - 1] : type;
}

export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export const NETWORK_COLORS: Record<string, string> = {
	mainnet: '#f97316',
	testnet: '#22c55e',
	devnet: '#3b82f6',
	localnet: '#6b7280',
};

export interface PairableAdapter {
	readonly isPaired: boolean;
}

export function isPairableAdapter(adapter: unknown): adapter is PairableAdapter {
	return adapter != null && typeof adapter === 'object' && 'isPaired' in adapter;
}

/** Dispatch a composed, bubbling custom event from a host element. */
export function emitEvent(host: HTMLElement, name: string, detail?: unknown): void {
	host.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
}

/** Clone a Set and toggle an item in/out of it. */
export function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
	const next = new Set(set);
	if (next.has(item)) {
		next.delete(item);
	} else {
		next.add(item);
	}
	return next;
}

/** Extract a user-facing error message, with a fallback for non-Error throws. */
export function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

/** Find the adapter that owns a given address. */
export function findAdapterForAddress<T extends { getAccount(address: string): unknown }>(
	adapters: readonly T[],
	address: string,
): T | undefined {
	return adapters.find((a) => a.getAccount(address) !== undefined);
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
