// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { allEqual, hasDuplicates } from './utils.js';

const GF256_SIZE = 256;

/**
 * A field element in the Rijndael finite field GF(2⁸) with a fixed generator g = 0x03.
 */
export class GF256 {
	value: number;

	constructor(value: number) {
		if (value < 0 || value >= GF256_SIZE) {
			throw new Error(`Invalid value ${value} for GF256`);
		}
		this.value = value;
	}

	log(): number {
		if (this.value === 0) {
			throw new Error('Invalid value');
		}
		return LOG[this.value - 1];
	}

	static exp(x: number): GF256 {
		return new GF256(EXP[x % (GF256_SIZE - 1)]);
	}

	add(other: GF256): GF256 {
		return new GF256(this.value ^ other.value);
	}

	sub(other: GF256): GF256 {
		// Addition is the same as subtraction in a binary field.
		return this.add(other);
	}

	neg(): GF256 {
		// Negation doesn't change the value in a binary field.
		return this;
	}

	mul(other: GF256): GF256 {
		if (this.value === 0 || other.value === 0) {
			return new GF256(0);
		}
		return GF256.exp(this.log() + other.log());
	}

	div(other: GF256): GF256 {
		return this.mul(GF256.exp(GF256_SIZE - other.log() - 1));
	}

	equals(other: GF256): boolean {
		return this.value === other.value;
	}

	static zero(): GF256 {
		return new GF256(0);
	}

	static one(): GF256 {
		return new GF256(1);
	}
}

/// Table of Eᵢ = gⁱ where g = 0x03 generates the multiplicative group of the field.
const EXP: number[] = [
	0x01, 0x03, 0x05, 0x0f, 0x11, 0x33, 0x55, 0xff, 0x1a, 0x2e, 0x72, 0x96, 0xa1, 0xf8, 0x13, 0x35,
	0x5f, 0xe1, 0x38, 0x48, 0xd8, 0x73, 0x95, 0xa4, 0xf7, 0x02, 0x06, 0x0a, 0x1e, 0x22, 0x66, 0xaa,
	0xe5, 0x34, 0x5c, 0xe4, 0x37, 0x59, 0xeb, 0x26, 0x6a, 0xbe, 0xd9, 0x70, 0x90, 0xab, 0xe6, 0x31,
	0x53, 0xf5, 0x04, 0x0c, 0x14, 0x3c, 0x44, 0xcc, 0x4f, 0xd1, 0x68, 0xb8, 0xd3, 0x6e, 0xb2, 0xcd,
	0x4c, 0xd4, 0x67, 0xa9, 0xe0, 0x3b, 0x4d, 0xd7, 0x62, 0xa6, 0xf1, 0x08, 0x18, 0x28, 0x78, 0x88,
	0x83, 0x9e, 0xb9, 0xd0, 0x6b, 0xbd, 0xdc, 0x7f, 0x81, 0x98, 0xb3, 0xce, 0x49, 0xdb, 0x76, 0x9a,
	0xb5, 0xc4, 0x57, 0xf9, 0x10, 0x30, 0x50, 0xf0, 0x0b, 0x1d, 0x27, 0x69, 0xbb, 0xd6, 0x61, 0xa3,
	0xfe, 0x19, 0x2b, 0x7d, 0x87, 0x92, 0xad, 0xec, 0x2f, 0x71, 0x93, 0xae, 0xe9, 0x20, 0x60, 0xa0,
	0xfb, 0x16, 0x3a, 0x4e, 0xd2, 0x6d, 0xb7, 0xc2, 0x5d, 0xe7, 0x32, 0x56, 0xfa, 0x15, 0x3f, 0x41,
	0xc3, 0x5e, 0xe2, 0x3d, 0x47, 0xc9, 0x40, 0xc0, 0x5b, 0xed, 0x2c, 0x74, 0x9c, 0xbf, 0xda, 0x75,
	0x9f, 0xba, 0xd5, 0x64, 0xac, 0xef, 0x2a, 0x7e, 0x82, 0x9d, 0xbc, 0xdf, 0x7a, 0x8e, 0x89, 0x80,
	0x9b, 0xb6, 0xc1, 0x58, 0xe8, 0x23, 0x65, 0xaf, 0xea, 0x25, 0x6f, 0xb1, 0xc8, 0x43, 0xc5, 0x54,
	0xfc, 0x1f, 0x21, 0x63, 0xa5, 0xf4, 0x07, 0x09, 0x1b, 0x2d, 0x77, 0x99, 0xb0, 0xcb, 0x46, 0xca,
	0x45, 0xcf, 0x4a, 0xde, 0x79, 0x8b, 0x86, 0x91, 0xa8, 0xe3, 0x3e, 0x42, 0xc6, 0x51, 0xf3, 0x0e,
	0x12, 0x36, 0x5a, 0xee, 0x29, 0x7b, 0x8d, 0x8c, 0x8f, 0x8a, 0x85, 0x94, 0xa7, 0xf2, 0x0d, 0x17,
	0x39, 0x4b, 0xdd, 0x7c, 0x84, 0x97, 0xa2, 0xfd, 0x1c, 0x24, 0x6c, 0xb4, 0xc7, 0x52, 0xf6,
];

/// Table of Lᵢ = LOG[i + 1] such that g^Lᵢ = i where g = 0x03.
const LOG: number[] = [
	0x00, 0x19, 0x01, 0x32, 0x02, 0x1a, 0xc6, 0x4b, 0xc7, 0x1b, 0x68, 0x33, 0xee, 0xdf, 0x03, 0x64,
	0x04, 0xe0, 0x0e, 0x34, 0x8d, 0x81, 0xef, 0x4c, 0x71, 0x08, 0xc8, 0xf8, 0x69, 0x1c, 0xc1, 0x7d,
	0xc2, 0x1d, 0xb5, 0xf9, 0xb9, 0x27, 0x6a, 0x4d, 0xe4, 0xa6, 0x72, 0x9a, 0xc9, 0x09, 0x78, 0x65,
	0x2f, 0x8a, 0x05, 0x21, 0x0f, 0xe1, 0x24, 0x12, 0xf0, 0x82, 0x45, 0x35, 0x93, 0xda, 0x8e, 0x96,
	0x8f, 0xdb, 0xbd, 0x36, 0xd0, 0xce, 0x94, 0x13, 0x5c, 0xd2, 0xf1, 0x40, 0x46, 0x83, 0x38, 0x66,
	0xdd, 0xfd, 0x30, 0xbf, 0x06, 0x8b, 0x62, 0xb3, 0x25, 0xe2, 0x98, 0x22, 0x88, 0x91, 0x10, 0x7e,
	0x6e, 0x48, 0xc3, 0xa3, 0xb6, 0x1e, 0x42, 0x3a, 0x6b, 0x28, 0x54, 0xfa, 0x85, 0x3d, 0xba, 0x2b,
	0x79, 0x0a, 0x15, 0x9b, 0x9f, 0x5e, 0xca, 0x4e, 0xd4, 0xac, 0xe5, 0xf3, 0x73, 0xa7, 0x57, 0xaf,
	0x58, 0xa8, 0x50, 0xf4, 0xea, 0xd6, 0x74, 0x4f, 0xae, 0xe9, 0xd5, 0xe7, 0xe6, 0xad, 0xe8, 0x2c,
	0xd7, 0x75, 0x7a, 0xeb, 0x16, 0x0b, 0xf5, 0x59, 0xcb, 0x5f, 0xb0, 0x9c, 0xa9, 0x51, 0xa0, 0x7f,
	0x0c, 0xf6, 0x6f, 0x17, 0xc4, 0x49, 0xec, 0xd8, 0x43, 0x1f, 0x2d, 0xa4, 0x76, 0x7b, 0xb7, 0xcc,
	0xbb, 0x3e, 0x5a, 0xfb, 0x60, 0xb1, 0x86, 0x3b, 0x52, 0xa1, 0x6c, 0xaa, 0x55, 0x29, 0x9d, 0x97,
	0xb2, 0x87, 0x90, 0x61, 0xbe, 0xdc, 0xfc, 0xbc, 0x95, 0xcf, 0xcd, 0x37, 0x3f, 0x5b, 0xd1, 0x53,
	0x39, 0x84, 0x3c, 0x41, 0xa2, 0x6d, 0x47, 0x14, 0x2a, 0x9e, 0x5d, 0x56, 0xf2, 0xd3, 0xab, 0x44,
	0x11, 0x92, 0xd9, 0x23, 0x20, 0x2e, 0x89, 0xb4, 0x7c, 0xb8, 0x26, 0x77, 0x99, 0xe3, 0xa5, 0x67,
	0x4a, 0xed, 0xde, 0xc5, 0x31, 0xfe, 0x18, 0x0d, 0x63, 0x8c, 0x80, 0xc0, 0xf7, 0x70, 0x07,
];

export class Polynomial {
	coefficients: GF256[];

	/**
	 * Construct a new Polynomial over [GF256] from the given coefficients.
	 * The first coefficient is the constant term.
	 */
	constructor(coefficients: GF256[]) {
		this.coefficients = coefficients.slice();

		// The highest degree coefficient is always non-zero.
		while (
			this.coefficients.length > 0 &&
			this.coefficients[this.coefficients.length - 1].value === 0
		) {
			this.coefficients.pop();
		}
	}

	static fromBytes(bytes: Uint8Array): Polynomial {
		return new Polynomial(Array.from(bytes, (b) => new GF256(b)));
	}

	degree(): number {
		if (this.coefficients.length === 0) {
			return 0;
		}
		return this.coefficients.length - 1;
	}

	getCoefficient(index: number): GF256 {
		if (index >= this.coefficients.length) {
			return GF256.zero();
		}
		return this.coefficients[index];
	}

	add(other: Polynomial): Polynomial {
		const degree = Math.max(this.degree(), other.degree());
		return new Polynomial(
			Array.from({ length: degree + 1 }, (_, i) =>
				this.getCoefficient(i).add(other.getCoefficient(i)),
			),
		);
	}

	mul(other: Polynomial): Polynomial {
		const degree = this.degree() + other.degree();
		return new Polynomial(
			Array.from({ length: degree + 1 }, (_, i) => {
				let sum = GF256.zero();
				for (let j = 0; j <= i; j++) {
					if (j <= this.degree() && i - j <= other.degree()) {
						sum = sum.add(this.getCoefficient(j).mul(other.getCoefficient(i - j)));
					}
				}
				return sum;
			}),
		);
	}

	/** The polynomial s * this. */
	scale(s: GF256): Polynomial {
		return new Polynomial(this.coefficients.map((c) => c.mul(s)));
	}

	div(s: GF256): Polynomial {
		return this.scale(new GF256(1).div(s));
	}

	/** The polynomial x + c. */
	static monic_linear(c: GF256): Polynomial {
		return new Polynomial([c, GF256.one()]);
	}

	static zero(): Polynomial {
		return new Polynomial([]);
	}

	static one(): Polynomial {
		return new Polynomial([GF256.one()]);
	}

	/** Given a set of coordinates, interpolate a polynomial. */
	static interpolate(coordinates: { x: GF256; y: GF256 }[]): Polynomial {
		if (coordinates.length < 1) {
			throw new Error('At least one coefficient is required');
		}

		if (hasDuplicates(coordinates.map(({ x }) => x.value))) {
			throw new Error('Coefficients must have unique x values');
		}

		return coordinates.reduce(
			(sum, { x: x_j, y: y_j }, j) =>
				sum.add(
					coordinates
						.filter((_, i) => i !== j)
						.reduce(
							(product, { x: x_i }) =>
								product.mul(Polynomial.monic_linear(x_i.neg()).div(x_j.sub(x_i))),
							Polynomial.one(),
						)
						.scale(y_j),
				),
			Polynomial.zero(),
		);
	}

	/** Given a set of coordinates, interpolate a polynomial and evaluate it at x = 0. */
	static combine(coordinates: { x: GF256; y: GF256 }[]): GF256 {
		if (coordinates.length < 1) {
			throw new Error('At least one coefficient is required');
		}

		if (hasDuplicates(coordinates.map(({ x }) => x.value))) {
			throw new Error('Coefficients must have unique x values');
		}

		const quotient: GF256 = coordinates.reduce((sum, { x: x_j, y: y_j }, j) => {
			const denominator = x_j.mul(
				coordinates
					.filter((_, i) => i !== j)
					.reduce((product, { x: x_i }) => product.mul(x_i.sub(x_j)), GF256.one()),
			);
			return sum.add(y_j.div(denominator));
		}, GF256.zero());

		const xProduct = coordinates.reduce((product, { x }) => product.mul(x), GF256.one());
		return xProduct.mul(quotient);
	}

	/** Evaluate the polynomial at x. */
	evaluate(x: GF256): GF256 {
		let result = GF256.zero();
		for (let i = this.coefficients.length - 1; i >= 0; i--) {
			result = result.mul(x).add(this.coefficients[i]);
		}
		return result;
	}

	equals(other: Polynomial): boolean {
		if (this.coefficients.length !== other.coefficients.length) {
			return false;
		}
		return this.coefficients.every((c, i) => c.equals(other.getCoefficient(i)));
	}
}

/** Representation of a share of a secret. The index is a number between 1 and 255. */
export type Share = {
	index: number;
	share: Uint8Array;
};

function toInternalShare(share: Share): InternalShare {
	return {
		index: new GF256(share.index),
		share: Array.from(share.share, (byte) => new GF256(byte)),
	};
}

/** Internal representation of a share of a secret. The index is a non-zero GF256. */
type InternalShare = {
	index: GF256;
	share: GF256[];
};

function toShare(internalShare: InternalShare): Share {
	return {
		index: internalShare.index.value,
		share: new Uint8Array(internalShare.share.map((byte) => byte.value)),
	};
}

/**
 * Sample a random polynomial with the given constant and degree.
 *
 * @param constant The constant term of the polynomial.
 * @param degree The degree of the polynomial.
 * @returns A random polynomial with the given constant and degree.
 */
function samplePolynomial(constant: GF256, degree: number): Polynomial {
	const randomCoefficients = new Uint8Array(degree);
	crypto.getRandomValues(randomCoefficients);

	// The resulting polynomial has degree + 1 coefficients.
	return Polynomial.fromBytes(new Uint8Array([constant.value, ...randomCoefficients]));
}

/**
 * Split a secret into shares.
 *
 * @param secret The secret to split.
 * @param threshold The minimum number of shares required to reconstruct the secret.
 * @param total The total number of shares to generate.
 * @returns The shares.
 */
export function split(secret: Uint8Array, threshold: number, total: number): Share[] {
	if (threshold > total || threshold < 1 || total > GF256_SIZE) {
		throw new Error(`Invalid threshold ${threshold} or total ${total}`);
	}

	const polynomials = Array.from(secret, (s) => samplePolynomial(new GF256(s), threshold - 1));
	return Array.from({ length: total }, (_, i) => {
		// Indexes start at 1 because 0 is reserved for the constant term (which is also the secret).
		const index = new GF256(i + 1);
		const share = polynomials.map((p) => p.evaluate(index));
		return toShare({ index, share });
	});
}

/** Validate a set of shares and return them in internal shares representation along with the length of the shares. */
function validateShares(shares: Share[]): { internalShares: InternalShare[]; length: number } {
	if (shares.length < 1) {
		throw new Error('At least one share is required');
	}

	if (!allEqual(shares.map(({ share }) => share.length))) {
		throw new Error('All shares must have the same length');
	}

	if (hasDuplicates(shares.map(({ index }) => index))) {
		throw new Error('Shares must have unique indices');
	}

	const internalShares = shares.map(toInternalShare);
	const length = internalShares[0].share.length;

	return { internalShares, length };
}

/**
 * Combine shares into a secret. If fewer than the threshold number of shares are provided,
 * the result will be indistinguishable from random.
 *
 * @param shares The shares to combine.
 * @returns The secret.
 */
export function combine(shares: Share[]): Uint8Array {
	const { internalShares, length } = validateShares(shares);

	return new Uint8Array(
		Array.from(
			{ length },
			(_, i) =>
				Polynomial.combine(
					internalShares.map(({ index, share }) => ({
						x: index,
						y: share[i],
					})),
				).value,
		),
	);
}

/**
 * Interpolate a polynomial from the given shares.
 *
 * @param shares The shares to interpolate from.
 * @returns A function that evaluates the polynomial at a given x.
 */
export function interpolate(shares: Share[]): (x: number) => Uint8Array {
	const { internalShares, length } = validateShares(shares);

	const polynomials = Array.from({ length }, (_, i) =>
		Polynomial.interpolate(internalShares.map(({ index, share }) => ({ x: index, y: share[i] }))),
	);

	return (x: number) => {
		return new Uint8Array(polynomials.map((p) => p.evaluate(new GF256(x)).value));
	};
}
