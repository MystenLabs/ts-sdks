// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { GF256, Polynomial } from '../../src/tss.js';

describe('gf256', () => {
	it('arithmetic test vectors', async () => {
		const a = new GF256(0x53);
		const b = new GF256(0xca);
		expect(a.add(b).equals(new GF256(0x99))).toBe(true);
		expect(a.sub(b).equals(new GF256(0x99))).toBe(true);
		expect(a.mul(b).equals(new GF256(0x01))).toBe(true);
		expect(a.div(b).equals(new GF256(0xb5))).toBe(true);
	});
});

describe('polynomial', () => {
	it('polynomial arithmetic', async () => {
		const p1 = new Polynomial([new GF256(1), new GF256(2), new GF256(3)]);
		const p2 = new Polynomial([new GF256(4), new GF256(5)]);
		const p3 = new Polynomial([new GF256(2)]);
		expect(p1.add(p2).equals(new Polynomial([new GF256(5), new GF256(7), new GF256(3)]))).toBe(
			true,
		);
		expect(p1.mul(p3).equals(new Polynomial([new GF256(2), new GF256(4), new GF256(6)]))).toBe(
			true,
		);
	});

	it('interpolation test vectors', async () => {
		const x = [new GF256(1), new GF256(2), new GF256(3)];
		const y = [new GF256(7), new GF256(11), new GF256(17)];
		const polynomial = Polynomial.interpolate(x, y);

		expect(polynomial.degree()).toBeLessThanOrEqual(2);

		x.forEach((x, i) => {
			expect(polynomial.evaluate(x).equals(y[i])).toBe(true);
		});
	});
});
