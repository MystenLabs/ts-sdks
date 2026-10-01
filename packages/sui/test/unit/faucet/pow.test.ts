// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import * as argon2 from '@noble/hashes/argon2.js';
import { parse } from 'valibot';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FaucetChallenge, hashFaucetProof, solveFaucetChallenge } from '../../../src/faucet/pow.js';
import vectors from './pow-vectors.json' with { type: 'json' };

vi.mock('@noble/hashes/argon2.js', { spy: true });

const challenge = parse(FaucetChallenge, {
	version: 1,
	domain: vectors.domain,
	salt: vectors.salt,
	algorithm: 'argon2d',
	argon2Version: 19,
	memorySize: 8192,
	iterations: 1,
	parallelism: 1,
	hashLength: 32,
	...vectors.inputs,
	difficulty: '2',
	threshold: '9223372036854775808',
	windowSeconds: 60,
	amountMist: '1000000000',
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetAllMocks();
});

describe('faucet PoW version 1', () => {
	it.each(vectors.cases)(
		'matches the faucet-station vector: $note (nonce $nonce)',
		async (vector) => {
			const hash = await hashFaucetProof(
				{ ...challenge, randomBytes: vector.randomBytes },
				BigInt(vector.nonce),
			);
			expect(toHex(hash)).toBe(vector.hash);
			expect(new DataView(hash.buffer).getBigUint64(0).toString()).toBe(vector.v);
		},
	);

	it.each(Object.entries(vectors.thresholds).filter(([difficulty]) => difficulty !== '$comment'))(
		'validates integer threshold division for difficulty %s',
		(difficulty, threshold) => {
			expect(() => parse(FaucetChallenge, { ...challenge, difficulty, threshold })).not.toThrow();
			expect(() =>
				parse(FaucetChallenge, {
					...challenge,
					difficulty,
					threshold: (BigInt(threshold) + 1n).toString(),
				}),
			).toThrow();
		},
	);

	it('requires a strictly smaller big-endian value and wraps the u64 nonce', async () => {
		vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
			(array as BigUint64Array)[0] = (1n << 64n) - 1n;
			return array;
		});
		const hash = vi
			.mocked(argon2.argon2dAsync)
			.mockResolvedValueOnce(fromHex(`8000000000000000${'00'.repeat(24)}`))
			.mockResolvedValueOnce(fromHex(vectors.cases[0].hash));
		const proof = await solveFaucetChallenge(
			challenge,
			Date.now() + 1000,
			new AbortController().signal,
		);
		expect(proof).toEqual({ nonce: '0', hashHex: vectors.cases[0].hash });
		expect(hash.mock.calls[0][0]).toBe(vectors.cases[3].preimage);
		expect(hash.mock.calls[1][0]).toBe(vectors.cases[0].preimage);
	});

	it('stops an expired challenge without hashing', async () => {
		const hash = vi.mocked(argon2.argon2dAsync);
		await expect(
			solveFaucetChallenge(challenge, Date.now() - 1, new AbortController().signal),
		).resolves.toBeNull();
		expect(hash).not.toHaveBeenCalled();
	});

	it('yields to cancellation timers during grinding', async () => {
		const controller = new AbortController();
		vi.mocked(argon2.argon2dAsync).mockImplementation(async () => {
			setTimeout(() => controller.abort(), 0);
			return new Uint8Array(32);
		});
		await expect(
			solveFaucetChallenge(challenge, Date.now() + 1000, controller.signal),
		).rejects.toMatchObject({ name: 'AbortError' });
	});
});
