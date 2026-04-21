// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, fromHex, toBase58, toHex } from '@mysten/bcs';
import { parse } from 'valibot';

import { bcs, TypeTagSerializer } from '../bcs/index.js';
import { ObjectRefSchema } from '../transactions/data/internal.js';
import { deriveDynamicFieldID } from './dynamic-fields.js';
import { normalizeStructTag, normalizeSuiAddress, parseStructTag } from './index.js';

const SUI_ACCUMULATOR_ROOT_OBJECT_ID = normalizeSuiAddress('0xacc');
const ACCUMULATOR_KEY_TYPE_TAG = TypeTagSerializer.parseFromStr(
	'0x2::accumulator::Key<0x2::balance::Balance<0x2::sui::SUI>>',
);
const SUI_FRAMEWORK = normalizeSuiAddress('0x2');

export const COIN_RESERVATION_MAGIC = new Uint8Array([
	0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac,
	0xac, 0xac, 0xac, 0xac,
]);

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

function xorObjectIdWithChainIdentifier(objectId: string, chainIdentifier: string): string {
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
 * Unmasks a coin reservation object id by XORing with the chain identifier.
 * Returns the underlying accumulator-field object id, which can be fetched
 * via `getObjects` to discover the coin type.
 */
export function unmaskCoinReservationObjectId(
	maskedObjectId: string,
	chainIdentifier: string,
): string {
	return xorObjectIdWithChainIdentifier(maskedObjectId, chainIdentifier);
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

/**
 * Derives the accumulator dynamic field object ID for the given owner,
 * then XORs it with the chain identifier bytes to produce the objectId
 * for the coin reservation ref.
 */
function deriveReservationObjectId(owner: string, chainIdentifier: string): string {
	const keyBcs = bcs.Address.serialize(owner).toBytes();
	const accumulatorId = deriveDynamicFieldID(
		SUI_ACCUMULATOR_ROOT_OBJECT_ID,
		ACCUMULATOR_KEY_TYPE_TAG,
		keyBcs,
	);
	return xorObjectIdWithChainIdentifier(accumulatorId, chainIdentifier);
}

export function createCoinReservationRef(
	reservedBalance: bigint,
	owner: string,
	chainIdentifier: string,
	epoch: string,
) {
	const digestBytes = new Uint8Array(32);
	const view = new DataView(digestBytes.buffer);
	// Bytes 0-7: reserved balance as LE u64
	view.setBigUint64(0, reservedBalance, true);
	// Bytes 8-11: epoch_id as LE u32
	const epochNum = Number(epoch);
	if (!Number.isSafeInteger(epochNum) || epochNum < 0 || epochNum > 0xffffffff) {
		throw new Error(`Epoch ${epoch} out of u32 range for coin reservation digest`);
	}
	view.setUint32(8, epochNum, true);
	// Bytes 12-31: magic bytes
	digestBytes.set(COIN_RESERVATION_MAGIC, 12);

	return parse(ObjectRefSchema, {
		objectId: deriveReservationObjectId(owner, chainIdentifier),
		version: '0',
		digest: toBase58(digestBytes),
	});
}
