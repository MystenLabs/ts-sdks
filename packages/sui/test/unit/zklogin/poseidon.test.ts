// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from 'vitest';

import { poseidonHash } from '../../../src/zklogin/index.js';
import { BN254_FIELD_SIZE } from '../../../src/zklogin/poseidon.js';

test('can hash single input', () => {
	const result = poseidonHash([123]);
	expect(result).toBeTypeOf('bigint');
});

test('can hash multiple inputs', () => {
	const result = poseidonHash([1, 2, 3, 4, 5]);
	expect(result).toBeTypeOf('bigint');
});

test.each([17, 32, 33, 48, 49, 64])('can hash %i inputs using 16-element chunks', (inputLength) => {
	const inputs = Array.from({ length: inputLength }, (_, i) => BigInt(i));
	const chunkHashes = [];
	for (let i = 0; i < inputs.length; i += 16) {
		chunkHashes.push(poseidonHash(inputs.slice(i, i + 16)));
	}

	expect(poseidonHash(inputs)).toBe(poseidonHash(chunkHashes));
});

test.each([0, 65])('throws error for unsupported input length %i', (inputLength) => {
	expect(() => poseidonHash(Array(inputLength).fill(0))).toThrowError(
		`Yet to implement: Unable to hash a vector of length ${inputLength}`,
	);
});

test('throws error for invalid input', () => {
	expect(() => poseidonHash([-1])).toThrowError('Element -1 not in the BN254 field');
});

test('throws error for invalid input greater than BN254_FIELD_SIZE', () => {
	expect(() => poseidonHash([BN254_FIELD_SIZE])).toThrowError(
		'Element 21888242871839275222246405745257275088548364400416034343698204186575808495617 not in the BN254 field',
	);
});
