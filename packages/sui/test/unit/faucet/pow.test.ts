// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import * as argon2 from '@noble/hashes/argon2.js';
import { parse } from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	FaucetChallenge,
	FaucetDigest,
	hashFaucetProof,
	solveFaucetChallenge,
} from '../../../src/faucet/pow.js';
import { isValidTransactionDigest } from '../../../src/utils/sui-types.js';
import vectors from './pow-vectors.json' with { type: 'json' };

vi.mock('@noble/hashes/argon2.js', { spy: true });
vi.mock('../../../src/utils/sui-types.js', { spy: true });

const nativeArgon2 = process.getBuiltinModule?.('node:crypto')?.argon2;
const getBuiltinModule = vi.fn<typeof process.getBuiltinModule>();

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

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('process', { ...process, getBuiltinModule });
	getBuiltinModule.mockReturnValue(undefined);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.resetAllMocks();
});

describe('faucet digest validation', () => {
	it.each([45, 65535])('rejects a %i-character digest before Base58 validation', (length) => {
		expect(() => parse(FaucetDigest, 'z'.repeat(length))).toThrow();
		expect(vi.mocked(isValidTransactionDigest).mock.calls.length).toBe(0);
	});

	it.each(['chainId', 'checkpointDigest'])(
		'rejects an oversized %s without decoding it',
		(field) => {
			expect(() => parse(FaucetChallenge, { ...challenge, [field]: 'z'.repeat(65535) })).toThrow();
			expect(
				vi.mocked(isValidTransactionDigest).mock.calls.map(([value]) => value.length),
			).not.toContain(65535);
		},
	);

	it('still validates the decoded digest length', () => {
		expect(parse(FaucetDigest, vectors.inputs.checkpointDigest)).toBe(
			vectors.inputs.checkpointDigest,
		);
		expect(() => parse(FaucetDigest, 'z')).toThrow();
	});
});

describe('faucet PoW version 1', () => {
	it.each(vectors.cases)(
		'matches the faucet-station vector using Noble: $note (nonce $nonce)',
		async (vector) => {
			const hash = await hashFaucetProof(
				{ ...challenge, randomBytes: vector.randomBytes },
				BigInt(vector.nonce),
			);
			expect(toHex(hash)).toBe(vector.hash);
			expect(new DataView(hash.buffer).getBigUint64(0).toString()).toBe(vector.v);
		},
	);

	it.skipIf(!nativeArgon2).each(vectors.cases)(
		'matches the faucet-station vector using native Argon2d: $note (nonce $nonce)',
		async (vector) => {
			const native = vi.fn(nativeArgon2);
			getBuiltinModule.mockReturnValue({ argon2: native });
			const hash = await hashFaucetProof(
				{ ...challenge, randomBytes: vector.randomBytes },
				BigInt(vector.nonce),
			);
			expect(toHex(hash)).toBe(vector.hash);
			expect(
				new DataView(hash.buffer, hash.byteOffset, hash.byteLength).getBigUint64(0).toString(),
			).toBe(vector.v);
			expect(native).toHaveBeenCalledOnce();
			expect(argon2.argon2dAsync).not.toHaveBeenCalled();
		},
	);

	it.each(['missing process', 'missing getBuiltinModule', 'missing argon2'])(
		'falls back to Noble with %s',
		async (runtime) => {
			if (runtime === 'missing process') vi.stubGlobal('process', undefined);
			if (runtime === 'missing getBuiltinModule') vi.stubGlobal('process', {});
			if (runtime === 'missing argon2') getBuiltinModule.mockReturnValue({});
			const hash = await hashFaucetProof(challenge, 0n);
			expect(toHex(hash)).toBe(vectors.cases[0].hash);
			expect(argon2.argon2dAsync).toHaveBeenCalledOnce();
		},
	);

	it('propagates native hashing errors without falling back to Noble', async () => {
		const error = new Error('Native hashing failed');
		const native = vi.fn<typeof nativeArgon2>((_algorithm, _parameters, callback) => {
			callback(error, Buffer.alloc(0));
		});
		getBuiltinModule.mockReturnValue({ argon2: native });
		await expect(hashFaucetProof(challenge, 0n)).rejects.toBe(error);
		expect(argon2.argon2dAsync).not.toHaveBeenCalled();
	});

	it.each([null, new Error('Late native failure')])(
		'rejects cancellation before the native callback settles with %j',
		async (lateError) => {
			vi.useFakeTimers();
			const controller = new AbortController();
			const reason = new Error('Cancelled while hashing');
			const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
			let complete!: Parameters<typeof nativeArgon2>[2];
			const native = vi.fn<typeof nativeArgon2>((_algorithm, _parameters, callback) => {
				complete = callback;
			});
			getBuiltinModule.mockReturnValue({ argon2: native });
			const rejected = vi.fn();
			const proof = solveFaucetChallenge(challenge, Date.now() + 1000, controller.signal).catch(
				rejected,
			);

			controller.abort(reason);
			await vi.advanceTimersByTimeAsync(0);
			try {
				expect(rejected).toHaveBeenCalledExactlyOnceWith(reason);
				expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
				expect(native).toHaveBeenCalledOnce();
				expect(argon2.argon2dAsync).not.toHaveBeenCalled();
			} finally {
				complete(lateError, Buffer.alloc(32));
				await vi.runAllTimersAsync();
				await proof;
			}
			expect(rejected).toHaveBeenCalledOnce();
		},
	);

	it.each([null, new Error('Native failure')])(
		'removes the abort listener when native hashing settles with %j',
		async (error) => {
			const controller = new AbortController();
			const addListener = vi.spyOn(controller.signal, 'addEventListener');
			const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
			getBuiltinModule.mockReturnValue({
				argon2: vi.fn<typeof nativeArgon2>((_algorithm, _parameters, callback) => {
					callback(error, Buffer.from(vectors.cases[0].hash, 'hex'));
				}),
			});
			const proof = solveFaucetChallenge(challenge, Date.now() + 1000, controller.signal);
			if (error) await expect(proof).rejects.toBe(error);
			else await expect(proof).resolves.toMatchObject({ hashHex: vectors.cases[0].hash });
			expect(addListener).toHaveBeenCalledOnce();
			expect(removeListener).toHaveBeenCalledExactlyOnceWith('abort', addListener.mock.calls[0][1]);
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
