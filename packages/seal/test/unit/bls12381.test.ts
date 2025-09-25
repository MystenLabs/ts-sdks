// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { G1Element, G2Element, Scalar } from '../../src/bls12381';
import { bls12_381 } from '@noble/curves/bls12-381';
import { fromHex, toHex } from '@mysten/bcs';

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
		const s2 = Scalar.fromBytes(bytes);
		expect(s1).toBeDefined();
		expect(s2).toBeDefined();
		expect(s1!.scalar).toEqual(expectedLE);
		expect(s2!.scalar).toEqual(expectedBE);
		expect(s2!.toBytes()).toEqual(bytes);

		expect(Scalar.fromBytesLE(new Uint8Array([]))).toBeUndefined();
		expect(Scalar.fromBytes(new Uint8Array([]))).toBeUndefined();
		expect(Scalar.fromBytesLE(new Uint8Array([1, 2, 3]))).toBeUndefined();
		expect(Scalar.fromBytes(new Uint8Array([1, 2, 3]))).toBeUndefined();
		expect(Scalar.fromBytesLE(new Uint8Array(Scalar.SIZE + 1))).toBeUndefined();
		expect(Scalar.fromBytes(new Uint8Array(Scalar.SIZE + 1))).toBeUndefined();
		expect(Scalar.fromBytesLE(new Uint8Array(Scalar.SIZE))).toBeDefined();
		expect(Scalar.fromBytes(new Uint8Array(Scalar.SIZE))).toBeDefined();
		expect(Scalar.fromBytesLE(new Uint8Array(Scalar.SIZE - 1))).toBeUndefined();
		expect(Scalar.fromBytes(new Uint8Array(Scalar.SIZE - 1))).toBeUndefined();
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

	it('G1 encoding', () => {
		expect(toHex(G1Element.generator().toBytes())).toEqual(
			'97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb',
		);
		expect(G1Element.fromBytes(G1Element.generator().toBytes())).toEqual(G1Element.generator());

		const sevenG = G1Element.generator().multiply(Scalar.fromBigint(7n)!);
		expect(toHex(sevenG.toBytes())).toEqual(
			'b928f3beb93519eecf0145da903b40a4c97dca00b21f12ac0df3be9116ef2ef27b2ae6bcd4c5bc2d54ef5a70627efcb7',
		);
		expect(G1Element.fromBytes(sevenG.toBytes())).toEqual(sevenG);

		// Invalid point (not on curve)
		const invalidBytes = fromHex(
			'b928f3beb93519eecf0145da903b40a4c97dca00b21f12ac0df3be9116ef2ef27b2ae6bcd4c5bc2d54ef5a70627efcb6',
		);
		expect(() => G1Element.fromBytes(invalidBytes)).toThrowError();

		// Wrong length
		const wrongLengthInput = fromHex(
			'b928f3beb93519eecf0145da903b40a4c97dca00b21f12ac0df3be9116ef2ef27b2ae6bcd4c5bc2d54ef5a70627efcb7ff',
		);
		expect(() => G1Element.fromBytes(wrongLengthInput)).toThrowError();
	});

	it('G2 encoding', () => {
		expect(toHex(G2Element.generator().toBytes())).toEqual(
			'93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8',
		);
		expect(G2Element.fromBytes(G2Element.generator().toBytes())).toEqual(G2Element.generator());

		const sevenG = G2Element.generator().multiply(Scalar.fromBigint(7n)!);
		expect(toHex(sevenG.toBytes())).toEqual(
			'8d0273f6bf31ed37c3b8d68083ec3d8e20b5f2cc170fa24b9b5be35b34ed013f9a921f1cad1644d4bdb14674247234c8049cd1dbb2d2c3581e54c088135fef36505a6823d61b859437bfc79b617030dc8b40e32bad1fa85b9c0f368af6d38d3c',
		);
		expect(G2Element.fromBytes(sevenG.toBytes())).toEqual(sevenG);

		// Invalid point (not on curve)
		const invalidBytes = fromHex(
			'8d0273f6bf31ed37c3b8d68083ec3d8e20b5f2cc170fa24b9b5be35b34ed013f9a921f1cad1644d4bdb14674247234c8049cd1dbb2d2c3581e54c088135fef36505a6823d61b859437bfc79b617030dc8b40e32bad1fa85b9c0f368af6d38d3d',
		);
		expect(() => G2Element.fromBytes(invalidBytes)).toThrowError();

		// Wrong length
		const wrongLengthInput = fromHex(
			'8d0273f6bf31ed37c3b8d68083ec3d8e20b5f2cc170fa24b9b5be35b34ed013f9a921f1cad1644d4bdb14674247234c8049cd1dbb2d2c3581e54c088135fef36505a6823d61b859437bfc79b617030dc8b40e32bad1fa85b9c0f368af6d38d3cff',
		);
		expect(() => G2Element.fromBytes(wrongLengthInput)).toThrowError();
	});
});
