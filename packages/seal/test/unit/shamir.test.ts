// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { combine, GF256, interpolate, Polynomial, split } from '../../src/shamir';
import { fromHex } from '@mysten/bcs';

const DEFAULT_SECRET = new Uint8Array([
	54, 73, 146, 97, 76, 123, 231, 6, 176, 180, 101, 228, 201, 216, 14, 65, 60, 155, 160, 238, 132,
	92, 76, 35, 11, 197, 34, 172, 114, 81, 94, 42,
]);

describe("Shamir's secret sharing", () => {
	it('secret sharing roundtrip', () => {
		const shares = split(DEFAULT_SECRET, 3, 4);

		expect(combine(shares)).toEqual(DEFAULT_SECRET);
		expect(combine(shares.slice(0, 3))).toEqual(DEFAULT_SECRET);
		expect(combine(shares.slice(0, 2))).not.toEqual(DEFAULT_SECRET);
		expect(combine(shares.slice(0, 1))).not.toEqual(DEFAULT_SECRET);

		const interpolated = interpolate(shares);
		shares.forEach((share) => {
			expect(interpolated(share.index)).toEqual(share.share);
		});
	});

	it('should handle large secrets', () => {
		const largeSecret = new Uint8Array(1024);
		crypto.getRandomValues(largeSecret);

		const shares = split(largeSecret, 5, 10);
		expect(combine(shares)).toEqual(largeSecret);
		expect(combine(shares.slice(0, 5))).toEqual(largeSecret);
		expect(combine(shares.slice(0, 4))).not.toEqual(largeSecret);
	});

	it('test edge cases', () => {
		expect(combine(split(DEFAULT_SECRET, 1, 1))).toEqual(DEFAULT_SECRET);
		expect(combine(split(DEFAULT_SECRET, 2, 2))).toEqual(DEFAULT_SECRET);
		expect(combine(split(DEFAULT_SECRET, 3, 3))).toEqual(DEFAULT_SECRET);
		expect(combine(split(new Uint8Array(0), 3, 3))).toEqual(new Uint8Array(0));
		expect(combine(split(new Uint8Array(32), 2, 3))).toEqual(new Uint8Array(32));
		expect(() => combine(split(DEFAULT_SECRET, 0, 0))).toThrow();
		expect(() => combine(split(DEFAULT_SECRET, 0, 1))).toThrow();
		expect(() => combine(split(DEFAULT_SECRET, 1, 0))).toThrow();
		expect(() => combine(split(DEFAULT_SECRET, 2, 1))).toThrow();

		// 255 shares ok, 256 shares fail
		const shares2 = split(DEFAULT_SECRET, 10, 255);
		expect(combine(shares2.slice(0, 10))).toEqual(DEFAULT_SECRET);
		expect(() => split(DEFAULT_SECRET, 10, 256)).toThrow();

		const shares = split(DEFAULT_SECRET, 3, 5);
		// Corrupt one share
		const corruptedShares = [...shares];
		corruptedShares[0] = { ...corruptedShares[0], share: new Uint8Array(32) };
		// Works with enough good shares
		expect(combine(corruptedShares.slice(1, 4))).toEqual(DEFAULT_SECRET);
		// Wrong secret with corrupted shares included
		expect(combine(corruptedShares.slice(0, 3))).not.toEqual(DEFAULT_SECRET);
	});

	it('test polynomial interpolation', () => {
		const coordinates = [
			{ x: 1, y: 7 },
			{ x: 2, y: 11 },
			{ x: 3, y: 17 },
		];
		const interpolated = Polynomial.interpolate(
			coordinates.map(({ x, y }) => ({ x: new GF256(x), y: new GF256(y) })),
		);
		coordinates.forEach(({ x, y }) => {
			expect(interpolated.evaluate(new GF256(x))).toEqual(new GF256(y));
		});

		// Single point interpolation
		const singlePoint = [{ x: new GF256(1), y: new GF256(42) }];
		const interpolated2 = Polynomial.interpolate(singlePoint);
		expect(interpolated2.evaluate(new GF256(1))).toEqual(new GF256(42));

		// All same x-coordinates fails
		const sameX = [
			{ x: new GF256(1), y: new GF256(10) },
			{ x: new GF256(1), y: new GF256(20) },
		];
		expect(() => Polynomial.interpolate(sameX)).toThrow();
	});

	it('test vector', () => {
		const shares = [
			{ index: 0x2d, share: fromHex('0bbad0cd0d222fe2fe7c17080198a95c186d66c523bbba') },
			{ index: 0x59, share: fromHex('94ed01a1e8e883b0110555e38cb50ca8014ffc8badd19a') },
			{ index: 0x3d, share: fromHex('16cad5ae8279f9e59fc3bb05817abc6370160cdd8e82f7') },
		];
		const combined = combine(shares);
		expect(combined).toEqual(new TextEncoder().encode('My super secret message'));
	});

	it('polynomial arithmetic', () => {
		const p1 = new Polynomial([new GF256(1), new GF256(2), new GF256(3)]);
		const p2 = new Polynomial([new GF256(4), new GF256(5)]);
		const p3 = new Polynomial([new GF256(2)]);

		expect(p1.add(p2)).toEqual(new Polynomial([new GF256(5), new GF256(7), new GF256(3)]));
		expect(p1.div(new GF256(2))).toEqual(
			new Polynomial([new GF256(141), new GF256(1), new GF256(140)]),
		);

		expect(p1.mul(p3)).toEqual(new Polynomial([new GF256(2), new GF256(4), new GF256(6)]));
		expect(p1.scale(new GF256(2))).toEqual(
			new Polynomial([new GF256(2), new GF256(4), new GF256(6)]),
		);

		const x = new GF256(2);
		const result = p1.evaluate(x);
		const expected = new GF256(1).add(new GF256(2).mul(x)).add(new GF256(3).mul(x).mul(x));
		expect(result).toEqual(expected);
	});

	it('GF256 arithmetic sanity check', () => {
		const a = new GF256(117);
		expect(a.mul(GF256.one())).toEqual(a);
		expect(a.mul(GF256.zero())).toEqual(GF256.zero());
		expect(a.add(GF256.zero())).toEqual(a);
		expect(a.sub(GF256.zero())).toEqual(a);
		expect(a.div(GF256.one())).toEqual(a);
		expect(() => a.div(GF256.zero())).toThrow();
	});

	it('GF256 test vector', () => {
		// Test vector, partly from https://en.wikipedia.org/wiki/Finite_field_arithmetic#Rijndael's_(AES)_finite_field
		const a = new GF256(0x53);
		const b = new GF256(0xca);

		expect(a.add(b)).toEqual(new GF256(0x99));
		expect(a.sub(b)).toEqual(new GF256(0x99));
		expect(a.mul(b)).toEqual(new GF256(0x01));
		expect(a.div(b)).toEqual(new GF256(0xb5));

		const max = new GF256(255);
		expect(max.add(new GF256(1))).toEqual(new GF256(254));
		expect(max.add(max)).toEqual(new GF256(0));
		expect(new GF256(1).add(new GF256(1))).toEqual(new GF256(0));
	});
});
