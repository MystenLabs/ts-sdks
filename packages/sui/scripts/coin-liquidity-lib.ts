// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Pure helpers for `coin-liquidity-audit.ts`.
 *
 * Kept separate from the CLI entry point so the type-matching and amount
 * extraction logic can be exercised without a network round trip.
 */

import { normalizeSuiAddress } from '../src/utils/sui-types.js';

/** The svBTC coin type this audit was originally written for. */
export const DEFAULT_COIN_TYPE =
	'0x7a479e7a6e75323ac9125656a9ca795e11ea42165ac4206af44d1b66e9563be9::svbtc::SVBTC';

export const GRAPHQL_ENDPOINTS = {
	mainnet: 'https://graphql.mainnet.sui.io/graphql',
	testnet: 'https://graphql.testnet.sui.io/graphql',
	devnet: 'https://graphql.devnet.sui.io/graphql',
} as const;

export type Network = keyof typeof GRAPHQL_ENDPOINTS;

/**
 * Generic-parameter position -> field-name suffixes protocols conventionally
 * use for that position. Lets the fallback pass tell `reserve_a` from
 * `reserve_b` when the coin is the first type argument of a `Pool<A, B>`.
 */
const POSITIONAL_SUFFIXES = [
	['a', 'x', '0', 'base'],
	['b', 'y', '1', 'quote'],
];

/** Field names that plausibly hold a reserve amount, for the fallback pass. */
const AMOUNT_FIELD_HINTS =
	/balance|reserve|coin|liquidity|supply|available|deposit|total|amount|cash/i;

export interface Match {
	/** Dotted path to the value inside the venue's Move struct. */
	path: string;
	amount: bigint;
	/** `typed` means the node confirmed the field's type names the coin. */
	confidence: 'typed' | 'inferred';
	type?: string;
}

export interface VenueReport {
	id: string;
	type: string | null;
	matches: Match[];
	total: bigint;
	confidence: 'typed' | 'inferred' | 'none';
	error?: string;
}

export interface OwnerReport {
	owner: string;
	amount: bigint;
	error?: string;
}

/**
 * Sui returns type strings with fully-expanded addresses, but hand-pasted types
 * are usually short (`0x2::sui::SUI`). Expand every address in a type string so
 * comparisons hold regardless of where the string came from.
 */
export function canonicalizeType(type: string): string {
	return type.replace(/0x[0-9a-fA-F]+/g, (address) => normalizeSuiAddress(address)).toLowerCase();
}

export function formatUnits(value: bigint, decimals: number): string {
	const negative = value < 0n;
	const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
	const whole = digits.slice(0, digits.length - decimals);
	const fraction = decimals === 0 ? '' : digits.slice(digits.length - decimals).replace(/0+$/, '');
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export function toBigInt(value: unknown): bigint | null {
	if (typeof value === 'string' && /^\d+$/.test(value)) {
		return BigInt(value);
	}
	if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
		return BigInt(value);
	}
	if (typeof value === 'bigint') {
		return value;
	}
	return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pull the generic arguments out of a Move type string, respecting nesting so
 * `Pool<Balance<A>, B>` yields two arguments rather than three.
 */
export function genericArgs(type: string): string[] {
	const open = type.indexOf('<');
	if (open === -1 || !type.endsWith('>')) {
		return [];
	}

	const args: string[] = [];
	let depth = 0;
	let current = '';

	for (const char of type.slice(open + 1, -1)) {
		if (char === '<') {
			depth++;
		} else if (char === '>') {
			depth--;
		}

		if (char === ',' && depth === 0) {
			args.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		args.push(current.trim());
	}

	return args;
}

/** Base type without generic arguments: `0x2::balance::Balance<X>` -> `...::Balance`. */
export function baseType(type: string): string {
	const open = type.indexOf('<');
	return open === -1 ? type : type.slice(0, open);
}

/**
 * A field holds the target coin when its type is `Balance<COIN>` or
 * `Coin<COIN>` — the two Move types that denominate an amount in a coin.
 */
export function denominatesCoin(typeRepr: string, canonicalCoin: string): boolean {
	const canonical = canonicalizeType(typeRepr);
	const base = baseType(canonical);

	if (
		base !== canonicalizeType('0x2::balance::Balance') &&
		base !== canonicalizeType('0x2::coin::Coin')
	) {
		return false;
	}

	return genericArgs(canonical).some((arg) => arg === canonicalCoin);
}

/**
 * Read the numeric amount out of a `Balance` or `Coin` JSON value. A `Balance`
 * serializes as its `value`, a `Coin` nests one under `balance`.
 */
export function amountFromJson(json: unknown): bigint | null {
	const direct = toBigInt(json);
	if (direct !== null) {
		return direct;
	}

	if (!isRecord(json)) {
		return null;
	}

	const value = toBigInt(json.value);
	if (value !== null) {
		return value;
	}

	if (isRecord(json.balance)) {
		return toBigInt(json.balance.value);
	}

	return toBigInt(json.balance);
}

/**
 * Enumerate dotted paths into a parsed Move struct, breadth-first, so the node
 * can be asked for the concrete type of each one.
 */
export function enumeratePaths(json: unknown, depth: number, prefix = ''): string[] {
	if (depth < 1 || !isRecord(json)) {
		return [];
	}

	const paths: string[] = [];

	for (const [key, value] of Object.entries(json)) {
		const path = prefix ? `${prefix}.${key}` : key;
		paths.push(path);

		if (depth > 1 && isRecord(value)) {
			paths.push(...enumeratePaths(value, depth - 1, path));
		}
	}

	return paths;
}

/**
 * Drop any match nested inside another match, so a `Balance<COIN>` held within
 * a `Coin<COIN>` is not counted twice.
 */
export function dedupeMatches(matches: Match[]): Match[] {
	return matches.filter(
		(match) => !matches.some((other) => other !== match && match.path.startsWith(`${other.path}.`)),
	);
}

/**
 * Fallback for venues that store reserves as bare integers — common in CLMM
 * pools, where the struct is `Pool<A, B>` and the reserves are plain `u64`.
 * Only consulted when no typed match was found, and every result is flagged.
 */
export function inferFromFieldNames(
	json: unknown,
	venueType: string,
	canonicalCoin: string,
): Match[] {
	if (!isRecord(json)) {
		return [];
	}

	const args = genericArgs(canonicalizeType(venueType));
	const position = args.findIndex((arg) => arg === canonicalCoin);
	if (position === -1) {
		return [];
	}

	const suffixes = POSITIONAL_SUFFIXES[position] ?? [];
	const otherSuffixes = POSITIONAL_SUFFIXES.filter((_, index) => index !== position).flat();
	const matches: Match[] = [];

	for (const [key, value] of Object.entries(json)) {
		const amount = toBigInt(value);
		if (amount === null || amount === 0n || !AMOUNT_FIELD_HINTS.test(key)) {
			continue;
		}

		// Drop fields that clearly belong to the other side of the pair.
		const lower = key.toLowerCase();
		const claimsThisSide = suffixes.some((suffix) => lower.endsWith(`_${suffix}`));
		const claimsOtherSide = otherSuffixes.some((suffix) => lower.endsWith(`_${suffix}`));

		if (claimsOtherSide && !claimsThisSide) {
			continue;
		}

		matches.push({ path: key, amount, confidence: 'inferred', type: venueType });
	}

	return matches;
}

export function splitList(values: string[] | undefined): string[] {
	return (values ?? [])
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter(Boolean);
}
