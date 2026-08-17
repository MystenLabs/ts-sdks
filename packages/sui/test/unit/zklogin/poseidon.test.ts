// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from 'vitest';

import { poseidonHash } from '../../../src/zklogin/index.js';
import { BN254_FIELD_SIZE } from '../../../src/zklogin/poseidon.js';

const SUI_FRAMEWORK_TEST_VECTORS = [
	{
		inputs: [1n],
		expected: 18586133768512220936620570745912940619677854269274689475585506675881198879027n,
	},
	{
		inputs: [1n, 2n],
		expected: 7853200120776062878684798364095072458815029376092732009249414926327459813530n,
	},
	{
		inputs: [0n],
		expected: 19014214495641488759237505126948346942972912379615652741039992445865937985820n,
	},
	{
		inputs: Array.from({ length: 15 }, (_, index) => BigInt(index + 1)),
		expected: 4203130618016961831408770638653325366880478848856764494148034853759773445968n,
	},
	{
		inputs: [BN254_FIELD_SIZE - 1n],
		expected: 3366645945435192953002076803303112651887535928162668198103357554665518664470n,
	},
];

test.each(SUI_FRAMEWORK_TEST_VECTORS)(
	'matches the Sui framework vector for $inputs',
	({ inputs, expected }) => {
		expect(poseidonHash(inputs)).toBe(expected);
	},
);

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
