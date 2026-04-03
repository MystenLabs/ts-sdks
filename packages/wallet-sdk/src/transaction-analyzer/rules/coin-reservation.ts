// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Copied from @mysten/sui/src/utils/coin-reservation.ts
// Detects and parses synthetic coin reservation refs in gas payment arrays.

import { fromBase58 } from '@mysten/sui/utils';

const COIN_RESERVATION_MAGIC = new Uint8Array([
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
