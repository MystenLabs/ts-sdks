// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { POS_INF_TICK, POSITION_LOT_SIZE } from '../utils/constants.js';

/**
 * Order-ID codec — TypeScript mirror of `deepbook_predict::order`.
 *
 * A Predict order ID is a packed `u256` (196 significant bits). The Move module
 * exposes no public accessors, so the SDK replicates the packing to read and
 * construct order IDs. Layout (bit 0 = least significant):
 *
 * ```
 *   sequence      : bits   0..39   (40 bits)
 *   higher_tick   : bits  40..69   (30 bits)
 *   lower_tick    : bits  70..99   (30 bits)
 *   floor_shares  : bits 100..163  (64 bits, stored as U64_MASK - floor_shares)
 *   quantity_lots : bits 164..195  (32 bits, stored as U32_MASK - quantity_lots)
 * ```
 *
 * `quantity = quantity_lots * POSITION_LOT_SIZE`. Lower tick `0` is the
 * negative-infinity sentinel; higher tick `POS_INF_TICK` is the positive-infinity
 * sentinel. The two complemented fields (`quantity_lots`, `floor_shares`) preserve
 * a price-time-like ordering on the raw ID.
 */

const QUANTITY_LOTS_OFFSET = 164n;
const FLOOR_SHARES_OFFSET = 100n;
const LOWER_TICK_OFFSET = 70n;
const HIGHER_TICK_OFFSET = 40n;
const ORDER_ID_BITS = 196n;

const TICK_MASK = (1n << 30n) - 1n;
const U32_MASK = (1n << 32n) - 1n;
const U40_MASK = (1n << 40n) - 1n;
const U64_MASK = (1n << 64n) - 1n;

/** Immutable contract terms encoded in an order ID. */
export interface OrderTerms {
	/** Lower strike tick; `0` (`NEG_INF_TICK`) is the negative-infinity sentinel. */
	lowerTick: bigint;
	/** Higher strike tick; `POS_INF_TICK` is the positive-infinity sentinel. */
	higherTick: bigint;
	/** Static floor `F` (payout primitive, in quote units); `0` = unleveraged. */
	floorShares: bigint;
	/** User-facing quantity; a positive multiple of `POSITION_LOT_SIZE`. */
	quantity: bigint;
	/** Expiry-local sequence. */
	sequence: bigint;
}

/** Decoded view of a packed order ID. */
export interface DecodedOrder extends OrderTerms {
	/** The canonical packed order ID. */
	orderId: bigint;
	/** Encoded quantity in position lots (`quantity / POSITION_LOT_SIZE`). */
	quantityLots: bigint;
	/** Whether the order carries a non-zero static floor. */
	isLeveraged: boolean;
}

type BigIntish = bigint | number | string;

function toBig(value: BigIntish): bigint {
	return typeof value === 'bigint' ? value : BigInt(value);
}

function assertShape(lowerTick: bigint, higherTick: bigint): void {
	if (lowerTick > POS_INF_TICK || higherTick > POS_INF_TICK) {
		throw new RangeError(`order tick out of range (max ${POS_INF_TICK})`);
	}
	if (lowerTick >= higherTick) {
		throw new RangeError('order requires lowerTick < higherTick');
	}
	if (lowerTick === 0n && higherTick === POS_INF_TICK) {
		throw new RangeError('order range cannot be (neg_inf, pos_inf)');
	}
}

/** Convert a user-facing quantity to position lots, validating the increment. */
export function quantityToLots(quantity: BigIntish): bigint {
	const q = toBig(quantity);
	if (q <= 0n || q % POSITION_LOT_SIZE !== 0n) {
		throw new RangeError(`quantity must be a positive multiple of ${POSITION_LOT_SIZE}`);
	}
	const lots = q / POSITION_LOT_SIZE;
	if (lots > U32_MASK) {
		throw new RangeError('quantity exceeds max encodable lots');
	}
	return lots;
}

/** Pack validated contract terms into a canonical order ID. */
export function encodeOrderId(terms: {
	lowerTick: BigIntish;
	higherTick: BigIntish;
	floorShares: BigIntish;
	quantity: BigIntish;
	sequence: BigIntish;
}): bigint {
	const lowerTick = toBig(terms.lowerTick);
	const higherTick = toBig(terms.higherTick);
	const floorShares = toBig(terms.floorShares);
	const quantity = toBig(terms.quantity);
	const sequence = toBig(terms.sequence);

	const quantityLots = quantityToLots(quantity);
	if (sequence < 0n || sequence > U40_MASK) {
		throw new RangeError('sequence out of range');
	}
	if (floorShares < 0n || floorShares > quantity) {
		throw new RangeError('floorShares must satisfy 0 <= F <= quantity');
	}
	assertShape(lowerTick, higherTick);

	const quantityLotsKey = U32_MASK - quantityLots;
	const floorSharesKey = U64_MASK - floorShares;

	return (
		(quantityLotsKey << QUANTITY_LOTS_OFFSET) |
		(floorSharesKey << FLOOR_SHARES_OFFSET) |
		(lowerTick << LOWER_TICK_OFFSET) |
		(higherTick << HIGHER_TICK_OFFSET) |
		sequence
	);
}

/** Decode and validate a packed order ID into its contract terms. */
export function decodeOrderId(orderId: BigIntish): DecodedOrder {
	const id = toBig(orderId);
	if (id < 0n || id >> ORDER_ID_BITS !== 0n) {
		throw new RangeError('invalid order ID: bits set above the 196-bit field');
	}

	const quantityLots = U32_MASK - ((id >> QUANTITY_LOTS_OFFSET) & U32_MASK);
	if (quantityLots === 0n) {
		throw new RangeError('invalid order ID: zero quantity');
	}
	const floorShares = U64_MASK - ((id >> FLOOR_SHARES_OFFSET) & U64_MASK);
	const lowerTick = (id >> LOWER_TICK_OFFSET) & TICK_MASK;
	const higherTick = (id >> HIGHER_TICK_OFFSET) & TICK_MASK;
	const sequence = id & U40_MASK;
	const quantity = quantityLots * POSITION_LOT_SIZE;

	if (floorShares > quantity) {
		throw new RangeError('invalid order ID: floorShares exceeds quantity');
	}
	assertShape(lowerTick, higherTick);

	return {
		orderId: id,
		lowerTick,
		higherTick,
		floorShares,
		quantity,
		quantityLots,
		sequence,
		isLeveraged: floorShares > 0n,
	};
}
