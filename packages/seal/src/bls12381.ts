// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toHex } from '@mysten/bcs';
import type { Fp2, Fp12 } from '@noble/curves/abstract/tower';
import type { ProjPointType } from '@noble/curves/abstract/weierstrass';
import { bls12_381 } from '@noble/curves/bls12-381';

export class G1Element {
	point: ProjPointType<bigint>;

	public static readonly SIZE = 48;

	constructor(point: ProjPointType<bigint>) {
		this.point = point;
	}

	static generator(): G1Element {
		return new G1Element(bls12_381.G1.ProjectivePoint.BASE);
	}

	static fromBytes(bytes: Uint8Array): G1Element {
		return new G1Element(bls12_381.G1.ProjectivePoint.fromHex(toHex(bytes)));
	}

	toBytes(): Uint8Array<ArrayBuffer> {
		return this.point.toBytes() as Uint8Array<ArrayBuffer>;
	}

	multiply(scalar: Scalar): G1Element {
		return new G1Element(this.point.multiply(scalar.scalar));
	}

	add(other: G1Element): G1Element {
		return new G1Element(this.point.add(other.point));
	}

	subtract(other: G1Element): G1Element {
		return new G1Element(this.point.subtract(other.point));
	}

	static hashToCurve(data: Uint8Array): G1Element {
		return new G1Element(
			bls12_381.G1.ProjectivePoint.fromAffine(bls12_381.G1.hashToCurve(data).toAffine()),
		);
	}

	pairing(other: G2Element): GTElement {
		return new GTElement(bls12_381.pairing(this.point, other.point));
	}
}

export class G2Element {
	point: ProjPointType<Fp2>;

	public static readonly SIZE = 96;

	constructor(point: ProjPointType<Fp2>) {
		this.point = point;
	}

	static generator(): G2Element {
		return new G2Element(bls12_381.G2.ProjectivePoint.BASE);
	}

	static fromBytes(bytes: Uint8Array): G2Element {
		return new G2Element(bls12_381.G2.ProjectivePoint.fromHex(toHex(bytes)));
	}

	toBytes(): Uint8Array<ArrayBuffer> {
		return this.point.toBytes() as Uint8Array<ArrayBuffer>;
	}

	multiply(scalar: Scalar): G2Element {
		return new G2Element(this.point.multiply(scalar.scalar));
	}

	add(other: G2Element): G2Element {
		return new G2Element(this.point.add(other.point));
	}

	static hashToCurve(data: Uint8Array): G2Element {
		return new G2Element(
			bls12_381.G2.ProjectivePoint.fromAffine(bls12_381.G2.hashToCurve(data).toAffine()),
		);
	}

	equals(other: G2Element): boolean {
		return this.point.equals(other.point);
	}
}

export class GTElement {
	element: Fp12;

	public static readonly SIZE = 576;

	constructor(element: Fp12) {
		this.element = element;
	}

	toBytes(): Uint8Array<ArrayBuffer> {
		// This permutation reorders the 6 pairs of coefficients of the GT element for compatability with the Rust and Move implementations.
		//
		// The permutation P may be computed as:
		// for i in 0..3 {
		//   for j in 0..2 {
		//     P[2 * i + j] = i + 3 * j;
		//   }
		// }
		const P = [0, 3, 1, 4, 2, 5];
		const PAIR_SIZE = GTElement.SIZE / P.length;

		const bytes = bls12_381.fields.Fp12.toBytes(this.element);
		const result = new Uint8Array(GTElement.SIZE);

		for (let i = 0; i < P.length; i++) {
			const sourceStart = P[i] * PAIR_SIZE;
			const sourceEnd = sourceStart + PAIR_SIZE;
			const targetStart = i * PAIR_SIZE;
			result.set(bytes.subarray(sourceStart, sourceEnd), targetStart);
		}

		return result;
	}

	equals(other: GTElement): boolean {
		return bls12_381.fields.Fp12.eql(this.element, other.element);
	}
}

export class Scalar {
	scalar: bigint;

	public static readonly SIZE = 32;

	constructor(scalar: bigint) {
		this.scalar = scalar;
	}

	static random(): Scalar {
		return Scalar.fromBytes(bls12_381.utils.randomPrivateKey());
	}

	toBytes(): Uint8Array<ArrayBuffer> {
		return new Uint8Array(bls12_381.fields.Fr.toBytes(this.scalar)) as Uint8Array<ArrayBuffer>;
	}

	static fromBytes(bytes: Uint8Array): Scalar {
		return new Scalar(bls12_381.fields.Fr.fromBytes(bytes));
	}

	static fromNumber(num: number): Scalar {
		return new Scalar(BigInt(num));
	}
}
