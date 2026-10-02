// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toHex } from '@mysten/bcs';
import { argon2dAsync } from '@noble/hashes/argon2.js';
import type { InferOutput } from 'valibot';
import {
	check,
	integer,
	literal,
	maxLength,
	minValue,
	number,
	object,
	pipe,
	regex,
	string,
} from 'valibot';

import { isValidTransactionDigest } from '../utils/sui-types.js';

const U64 = 1n << 64n;

export const FaucetU64 = pipe(
	string(),
	regex(/^(0|[1-9][0-9]{0,19})$/),
	check((value) => BigInt(value) < U64),
);
export const FaucetAmount = pipe(
	FaucetU64,
	check((value) => BigInt(value) > 0n),
);
export const FaucetAddress = pipe(string(), regex(/^0x[0-9a-f]{64}$/));
export const FaucetDigest = pipe(string(), maxLength(44), check(isValidTransactionDigest));
export const FaucetDifficulty = pipe(
	FaucetU64,
	check((value) => BigInt(value) >= 2n && BigInt(value) <= 1n << 48n),
);

// PoW version 1 fixes these costs; never let a server choose the client's memory allocation.
export const FaucetChallenge = pipe(
	object({
		version: literal(1),
		domain: literal('sui-faucet-pow/1'),
		algorithm: literal('argon2d'),
		argon2Version: literal(19),
		salt: literal('sui-faucet-pow-1'),
		memorySize: literal(8192),
		iterations: literal(1),
		parallelism: literal(1),
		hashLength: literal(32),
		chainId: FaucetDigest,
		checkpointSeq: FaucetU64,
		checkpointDigest: FaucetDigest,
		randomBytes: pipe(
			string(),
			maxLength(1024),
			regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
		),
		faucetAddress: FaucetAddress,
		recipient: FaucetAddress,
		difficulty: FaucetDifficulty,
		threshold: FaucetU64,
		windowSeconds: pipe(number(), integer(), minValue(1)),
		amountMist: FaucetAmount,
	}),
	check((value) => BigInt(value.threshold) === U64 / BigInt(value.difficulty)),
);

type Challenge = InferOutput<typeof FaucetChallenge>;

export function hashFaucetProof(challenge: Challenge, nonce: bigint): Promise<Uint8Array> {
	const preimage = [
		challenge.domain,
		challenge.chainId,
		challenge.checkpointSeq,
		challenge.checkpointDigest,
		challenge.randomBytes,
		challenge.faucetAddress,
		challenge.recipient,
		nonce.toString(),
	].join('\n');

	// Avoid Node imports so browser bundles can use the Noble fallback without polyfills.
	const nativeArgon2 = globalThis.process?.getBuiltinModule?.('node:crypto')?.argon2;
	if (nativeArgon2) {
		return new Promise((resolve, reject) => {
			nativeArgon2(
				'argon2d',
				{
					message: preimage,
					nonce: challenge.salt,
					parallelism: 1,
					tagLength: 32,
					memory: 8192,
					passes: 1,
				},
				(error, hash) => {
					if (error) reject(error);
					else resolve(hash);
				},
			);
		});
	}

	return argon2dAsync(preimage, challenge.salt, {
		version: 19,
		m: 8192,
		t: 1,
		p: 1,
		dkLen: 32,
	});
}

export async function solveFaucetChallenge(
	challenge: Challenge,
	deadline: number,
	signal: AbortSignal,
) {
	let nonce = globalThis.crypto.getRandomValues(new BigUint64Array(1))[0];
	const threshold = BigInt(challenge.threshold);
	while (Date.now() < deadline) {
		signal.throwIfAborted();
		const hash = await hashFaucetProof(challenge, nonce);
		// Yield to timers and cancellation, even when the hash implementation only yields microtasks.
		await new Promise((resolve) => setTimeout(resolve, 0));
		signal.throwIfAborted();
		if (Date.now() >= deadline) break;
		if (new DataView(hash.buffer, hash.byteOffset, hash.byteLength).getBigUint64(0) < threshold) {
			return { nonce: nonce.toString(), hashHex: toHex(hash) };
		}
		nonce = (nonce + 1n) % U64;
	}
	return null;
}
