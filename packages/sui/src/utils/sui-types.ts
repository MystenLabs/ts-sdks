// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, splitGenericParameters } from '@mysten/bcs';

import { isValidNamedPackage } from './move-registry.js';

const TX_DIGEST_LENGTH = 32;

/** Returns whether the tx digest is valid based on the serialization format */
export function isValidTransactionDigest(value: string): value is string {
	try {
		const buffer = fromBase58(value);
		return buffer.length === TX_DIGEST_LENGTH;
	} catch {
		return false;
	}
}

// TODO - can we automatically sync this with rust length definition?
// Source of truth is
// https://github.com/MystenLabs/sui/blob/acb2b97ae21f47600e05b0d28127d88d0725561d/crates/sui-types/src/base_types.rs#L67
// which uses the Move account address length
// https://github.com/move-language/move/blob/67ec40dc50c66c34fd73512fcc412f3b68d67235/language/move-core/types/src/account_address.rs#L23 .

export const SUI_ADDRESS_LENGTH = 32;
export function isValidSuiAddress(value: string): value is string {
	return isHex(value) && getHexByteLength(value) === SUI_ADDRESS_LENGTH;
}

export function isValidSuiObjectId(value: string): boolean {
	return isValidSuiAddress(value);
}

const MOVE_IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function isValidMoveIdentifier(name: string): boolean {
	return MOVE_IDENTIFIER_REGEX.test(name);
}

const PRIMITIVE_TYPE_TAGS = [
	'bool',
	'u8',
	'u16',
	'u32',
	'u64',
	'u128',
	'u256',
	'address',
	'signer',
];

const VECTOR_TYPE_REGEX = /^vector<(.+)>$/;

function isValidTypeTag(type: string): boolean {
	if (PRIMITIVE_TYPE_TAGS.includes(type)) return true;

	const vectorMatch = type.match(VECTOR_TYPE_REGEX);
	if (vectorMatch) return isValidTypeTag(vectorMatch[1]);

	if (type.includes('::')) return isValidStructTag(type);

	return false;
}

function isValidParsedStructTag(tag: StructTag): boolean {
	if (!isValidSuiAddress(tag.address) && !isValidNamedPackage(tag.address)) {
		return false;
	}

	if (!isValidMoveIdentifier(tag.module) || !isValidMoveIdentifier(tag.name)) {
		return false;
	}

	return tag.typeParams.every((param) => {
		if (typeof param === 'string') {
			return isValidTypeTag(param);
		}
		return isValidParsedStructTag(param);
	});
}

export function isValidStructTag(type: string): boolean {
	try {
		const tag = parseStructTag(type);
		return isValidParsedStructTag(tag);
	} catch {
		return false;
	}
}

export type StructTag = {
	address: string;
	module: string;
	name: string;
	typeParams: (string | StructTag)[];
};

function parseTypeTag(type: string): string | StructTag {
	if (type.startsWith('vector<')) {
		if (!type.endsWith('>')) {
			throw new Error(`Invalid type tag: ${type}`);
		}
		const inner = type.slice(7, -1);
		if (!inner) {
			throw new Error(`Invalid type tag: ${type}`);
		}
		const parsed = parseTypeTag(inner);
		if (typeof parsed === 'string') {
			return `vector<${parsed}>`;
		}
		return `vector<${normalizeStructTag(parsed)}>`;
	}

	if (!type.includes('::')) return type;

	return parseStructTag(type);
}

export function parseStructTag(type: string): StructTag {
	const parts = type.split('::');

	if (parts.length < 3) {
		throw new Error(`Invalid struct tag: ${type}`);
	}

	const [address, module] = parts;
	const isMvrPackage = isValidNamedPackage(address);

	const rest = type.slice(address.length + module.length + 4);
	const name = rest.includes('<') ? rest.slice(0, rest.indexOf('<')) : rest;
	const typeParams = rest.includes('<')
		? splitGenericParameters(rest.slice(rest.indexOf('<') + 1, rest.lastIndexOf('>'))).map(
				(typeParam) => parseTypeTag(typeParam.trim()),
			)
		: [];

	return {
		address: isMvrPackage ? address : normalizeSuiAddress(address),
		module,
		name,
		typeParams,
	};
}

export function normalizeStructTag(type: string | StructTag): string {
	const { address, module, name, typeParams } =
		typeof type === 'string' ? parseStructTag(type) : type;

	const formattedTypeParams =
		typeParams?.length > 0
			? `<${typeParams
					.map((typeParam) =>
						typeof typeParam === 'string' ? typeParam : normalizeStructTag(typeParam),
					)
					.join(',')}>`
			: '';

	return `${address}::${module}::${name}${formattedTypeParams}`;
}

/**
 * Perform the following operations:
 * 1. Make the address lower case
 * 2. Prepend `0x` if the string does not start with `0x`.
 * 3. Add more zeros if the length of the address(excluding `0x`) is less than `SUI_ADDRESS_LENGTH`
 *
 * WARNING: if the address value itself starts with `0x`, e.g., `0x0x`, the default behavior
 * is to treat the first `0x` not as part of the address. The default behavior can be overridden by
 * setting `forceAdd0x` to true
 *
 */
export function normalizeSuiAddress(value: string, forceAdd0x: boolean = false): string {
	let address = value.toLowerCase();
	if (!forceAdd0x && address.startsWith('0x')) {
		address = address.slice(2);
	}
	return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, '0')}`;
}

export function normalizeSuiObjectId(value: string, forceAdd0x: boolean = false): string {
	return normalizeSuiAddress(value, forceAdd0x);
}

function isHex(value: string): boolean {
	return /^(0x|0X)?[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
}

function getHexByteLength(value: string): number {
	return /^(0x|0X)/.test(value) ? (value.length - 2) / 2 : value.length / 2;
}
