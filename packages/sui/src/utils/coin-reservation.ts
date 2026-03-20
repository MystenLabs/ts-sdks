// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58 } from '@mysten/bcs';

// Magic number used to identify fake address balance coins (last 20 bytes of the digest)
// See: sui/crates/sui-types/src/coin_reservation.rs
export const COIN_RESERVATION_MAGIC = new Uint8Array([
	0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac,
	0xac, 0xac, 0xac, 0xac,
]);

/**
 * Checks if a digest indicates a fake address balance coin.
 * These "coins" are created by the JSON RPC to represent address balances
 * and should be filtered out from coin listings.
 */
export function isCoinReservationDigest(digestBase58: string): boolean {
	const digestBytes = fromBase58(digestBase58);
	// Check if the last 20 bytes match the magic number
	const last20Bytes = digestBytes.slice(12, 32);
	return last20Bytes.every((byte, i) => byte === COIN_RESERVATION_MAGIC[i]);
}
