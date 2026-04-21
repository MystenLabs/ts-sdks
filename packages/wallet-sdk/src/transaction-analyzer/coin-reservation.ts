// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, fromHex, toHex } from '@mysten/bcs';
import { normalizeStructTag, normalizeSuiAddress, parseStructTag } from '@mysten/sui/utils';

const COIN_RESERVATION_MAGIC = new Uint8Array([
	0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac,
	0xac, 0xac, 0xac, 0xac,
]);

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

export function isCoinReservationDigest(digestBase58: string): boolean {
	const digestBytes = fromBase58(digestBase58);
	const last20Bytes = digestBytes.slice(12, 32);
	return last20Bytes.every((byte, i) => byte === COIN_RESERVATION_MAGIC[i]);
}

export function parseCoinReservationBalance(digestBase58: string): bigint {
	const digestBytes = fromBase58(digestBase58);
	const view = new DataView(digestBytes.buffer, digestBytes.byteOffset, digestBytes.byteLength);
	return view.getBigUint64(0, true);
}

/**
 * XORs an object id with the chain identifier. Self-inverse — converts
 * between a reservation ref's masked id and the underlying accumulator-field
 * object id.
 */
export function xorCoinReservationObjectId(objectId: string, chainIdentifier: string): string {
	const idBytes = fromHex(objectId);
	if (idBytes.length !== 32) {
		throw new Error(`Invalid object id length: expected 32 bytes, got ${idBytes.length}`);
	}
	const chainBytes = fromBase58(chainIdentifier);
	if (chainBytes.length !== 32) {
		throw new Error(`Invalid chain identifier length: expected 32 bytes, got ${chainBytes.length}`);
	}
	const xored = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		xored[i] = idBytes[i] ^ chainBytes[i];
	}
	return `0x${toHex(xored)}`;
}

/**
 * Given an accumulator-field object's struct tag
 * (`0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<T>>, 0x2::accumulator::U128>`),
 * returns the normalized coin type `T`. Returns `null` if the type tag
 * doesn't match the expected shape.
 */
export function parseAccumulatorFieldCoinType(objectType: string): string | null {
	let field;
	try {
		field = parseStructTag(objectType);
	} catch {
		return null;
	}
	if (
		field.address !== SUI_FRAMEWORK ||
		field.module !== 'dynamic_field' ||
		field.name !== 'Field' ||
		field.typeParams.length !== 2
	) {
		return null;
	}

	const [keyParam, valueParam] = field.typeParams;
	if (typeof keyParam === 'string' || typeof valueParam === 'string') {
		return null;
	}
	if (
		valueParam.address !== SUI_FRAMEWORK ||
		valueParam.module !== 'accumulator' ||
		valueParam.name !== 'U128'
	) {
		return null;
	}
	if (
		keyParam.address !== SUI_FRAMEWORK ||
		keyParam.module !== 'accumulator' ||
		keyParam.name !== 'Key' ||
		keyParam.typeParams.length !== 1
	) {
		return null;
	}

	const balanceParam = keyParam.typeParams[0];
	if (typeof balanceParam === 'string') return null;
	if (
		balanceParam.address !== SUI_FRAMEWORK ||
		balanceParam.module !== 'balance' ||
		balanceParam.name !== 'Balance' ||
		balanceParam.typeParams.length !== 1
	) {
		return null;
	}

	const innerType = balanceParam.typeParams[0];
	if (typeof innerType === 'string') return null;
	return normalizeStructTag(innerType);
}
