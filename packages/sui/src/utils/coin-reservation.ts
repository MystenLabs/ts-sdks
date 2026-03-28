// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, fromHex, toBase58, toHex } from '@mysten/bcs';
import { parse } from 'valibot';

import { bcs, TypeTagSerializer } from '../bcs/index.js';
import { ObjectRefSchema } from '../transactions/data/internal.js';
import { deriveDynamicFieldID } from './dynamic-fields.js';
import { normalizeSuiAddress } from './index.js';

const SUI_ACCUMULATOR_ROOT_OBJECT_ID = normalizeSuiAddress('0xacc');
const ACCUMULATOR_KEY_TYPE_TAG = TypeTagSerializer.parseFromStr(
	'0x2::accumulator::Key<0x2::balance::Balance<0x2::sui::SUI>>',
);

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

	// XOR the accumulator object ID bytes with the chain identifier bytes
	const accBytes = fromHex(accumulatorId.slice(2));
	const chainBytes = fromBase58(chainIdentifier);
	if (chainBytes.length !== 32) {
		throw new Error(`Invalid chain identifier length: expected 32 bytes, got ${chainBytes.length}`);
	}
	const xored = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		xored[i] = accBytes[i] ^ chainBytes[i];
	}
	return `0x${toHex(xored)}`;
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
