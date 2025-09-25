// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { Scalar } from '../../src/bls12381';
import { bls12_381 } from '@noble/curves/bls12-381';

describe('BLS12-381', () => {
	it('Scalar encoding', () => {
		const bytes = new Uint8Array([
			38, 196, 73, 8, 169, 135, 223, 142, 36, 222, 81, 40, 235, 6, 33, 37, 228, 11, 43, 93, 234, 37,
			214, 125, 130, 138, 225, 251, 123, 98, 10, 19,
		]);
		const expectedBE =
			17534694331877247445378328100165814381144285655212774018840362823117283920403n;
		const expectedLE =
			8612292307471438173884862806171156776133559907408652485196507992924388705318n;

		const s1 = Scalar.fromBytesLE(bytes);
		const s2 = Scalar.fromBytesBE(bytes);
		expect(s1).toBeDefined();
		expect(s2).toBeDefined();
		expect(s1!.scalar).toEqual(expectedLE);
		expect(s2!.scalar).toEqual(expectedBE);
		expect(s2!.toBytesBE()).toEqual(bytes);

		expect(Scalar.fromBytesLE(new Uint8Array([]))).toBeUndefined();
		expect(Scalar.fromBytesBE(new Uint8Array([]))).toBeUndefined();
		expect(Scalar.fromBytesLE(new Uint8Array([1, 2, 3]))).toBeUndefined();
		expect(Scalar.fromBytesBE(new Uint8Array([1, 2, 3]))).toBeUndefined();
		expect(Scalar.fromBytesLE(new Uint8Array(Scalar.SIZE + 1))).toBeUndefined();
		expect(Scalar.fromBytesBE(new Uint8Array(Scalar.SIZE + 1))).toBeUndefined();
		expect(Scalar.fromBytesLE(new Uint8Array(Scalar.SIZE))).toBeDefined();
		expect(Scalar.fromBytesBE(new Uint8Array(Scalar.SIZE))).toBeDefined();
		expect(Scalar.fromBytesLE(new Uint8Array(Scalar.SIZE - 1))).toBeUndefined();
		expect(Scalar.fromBytesBE(new Uint8Array(Scalar.SIZE - 1))).toBeUndefined();
	});

	it('Canonical scalars', () => {
		const ORDER = bls12_381.fields.Fr.ORDER;
		expect(Scalar.fromBigint(-1n)).toBeUndefined();
		expect(Scalar.fromBigint(0n)).toBeDefined();
		expect(Scalar.fromBigint(1n)).toBeDefined();
		expect(Scalar.fromBigint(ORDER - 1n)).toBeDefined();
		expect(Scalar.fromBigint(ORDER)).toBeUndefined();
		expect(Scalar.fromBigint(ORDER + 1n)).toBeUndefined();
	});
});
