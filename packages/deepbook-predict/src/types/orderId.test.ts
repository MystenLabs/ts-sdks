// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { POS_INF_TICK, POSITION_LOT_SIZE } from '../utils/constants.js';
import { decodeOrderId, encodeOrderId, quantityToLots } from './orderId.js';

const U32_MASK = (1n << 32n) - 1n;
const U64_MASK = (1n << 64n) - 1n;

// Independent oracle: pack via multiplication/addition (2**offset) rather than the
// codec's shift/OR. Agreement pins both the bit offsets and the complement scheme
// against `deepbook_predict::order`, so a wrong-but-round-trip-consistent offset
// is still caught.
function packReference(t: {
	lowerTick: bigint;
	higherTick: bigint;
	floorShares: bigint;
	quantity: bigint;
	sequence: bigint;
}): bigint {
	const lots = t.quantity / POSITION_LOT_SIZE;
	const quantityLotsKey = U32_MASK - lots;
	const floorSharesKey = U64_MASK - t.floorShares;
	return (
		quantityLotsKey * 2n ** 164n +
		floorSharesKey * 2n ** 100n +
		t.lowerTick * 2n ** 70n +
		t.higherTick * 2n ** 40n +
		t.sequence
	);
}

const CASES = [
	{ lowerTick: 0n, higherTick: 5n, floorShares: 0n, quantity: 20_000n, sequence: 7n },
	{ lowerTick: 1n, higherTick: POS_INF_TICK, floorShares: 0n, quantity: 10_000n, sequence: 0n },
	{ lowerTick: 100n, higherTick: 200n, floorShares: 40_000n, quantity: 50_000n, sequence: 12345n },
	{
		lowerTick: POS_INF_TICK - 1n,
		higherTick: POS_INF_TICK,
		floorShares: 10_000n,
		quantity: 10_000n,
		sequence: (1n << 40n) - 1n,
	},
];

describe('order-id codec', () => {
	it('matches the independent reference packing', () => {
		for (const c of CASES) {
			expect(encodeOrderId(c)).toBe(packReference(c));
		}
	});

	it('round-trips encode -> decode', () => {
		for (const c of CASES) {
			const decoded = decodeOrderId(encodeOrderId(c));
			expect(decoded.lowerTick).toBe(c.lowerTick);
			expect(decoded.higherTick).toBe(c.higherTick);
			expect(decoded.floorShares).toBe(c.floorShares);
			expect(decoded.quantity).toBe(c.quantity);
			expect(decoded.sequence).toBe(c.sequence);
			expect(decoded.quantityLots).toBe(c.quantity / POSITION_LOT_SIZE);
			expect(decoded.isLeveraged).toBe(c.floorShares > 0n);
			expect(decoded.orderId >> 196n).toBe(0n);
		}
	});

	it('isolates fields — changing one input changes only that decoded field', () => {
		const base = {
			lowerTick: 10n,
			higherTick: 20n,
			floorShares: 0n,
			quantity: 30_000n,
			sequence: 1n,
		};
		const bumped = decodeOrderId(encodeOrderId({ ...base, sequence: 2n }));
		const baseDecoded = decodeOrderId(encodeOrderId(base));
		expect(bumped.sequence).toBe(2n);
		expect(bumped.lowerTick).toBe(baseDecoded.lowerTick);
		expect(bumped.higherTick).toBe(baseDecoded.higherTick);
		expect(bumped.quantity).toBe(baseDecoded.quantity);
	});

	it('accepts number and string inputs', () => {
		const fromBig = encodeOrderId({
			lowerTick: 3n,
			higherTick: 9n,
			floorShares: 0n,
			quantity: 10_000n,
			sequence: 4n,
		});
		expect(
			encodeOrderId({ lowerTick: 3, higherTick: 9, floorShares: 0, quantity: 10_000, sequence: 4 }),
		).toBe(fromBig);
		expect(decodeOrderId(fromBig.toString()).orderId).toBe(fromBig);
	});

	describe('rejections', () => {
		it('rejects the (neg_inf, pos_inf) range', () => {
			expect(() =>
				encodeOrderId({
					lowerTick: 0n,
					higherTick: POS_INF_TICK,
					floorShares: 0n,
					quantity: 10_000n,
					sequence: 0n,
				}),
			).toThrow();
		});

		it('rejects lowerTick >= higherTick', () => {
			expect(() =>
				encodeOrderId({
					lowerTick: 5n,
					higherTick: 5n,
					floorShares: 0n,
					quantity: 10_000n,
					sequence: 0n,
				}),
			).toThrow();
		});

		it('rejects a tick above POS_INF_TICK', () => {
			expect(() =>
				encodeOrderId({
					lowerTick: 1n,
					higherTick: POS_INF_TICK + 1n,
					floorShares: 0n,
					quantity: 10_000n,
					sequence: 0n,
				}),
			).toThrow();
		});

		it('rejects a quantity that is not a whole lot', () => {
			expect(() => quantityToLots(15_000n)).toThrow();
			expect(() =>
				encodeOrderId({
					lowerTick: 1n,
					higherTick: 2n,
					floorShares: 0n,
					quantity: 15_000n,
					sequence: 0n,
				}),
			).toThrow();
		});

		it('rejects floorShares > quantity', () => {
			expect(() =>
				encodeOrderId({
					lowerTick: 1n,
					higherTick: 2n,
					floorShares: 20_000n,
					quantity: 10_000n,
					sequence: 0n,
				}),
			).toThrow();
		});

		it('rejects an ID with bits set above 196', () => {
			expect(() => decodeOrderId(1n << 196n)).toThrow();
		});
	});
});
