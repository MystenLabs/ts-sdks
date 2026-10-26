// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// SLIP-0010 hardened derivation for Ed25519 and ML-DSA-65. The master key string picks
// the tree; the HMAC-SHA512 walk below it is the same. Mirrors `fastcrypto::slip10`.

import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';

export type Slip10Node = {
	key: Uint8Array;
	chainCode: Uint8Array;
};

export const ED25519_SLIP10_MASTER_KEY = 'ed25519 seed';
// Proposed in https://github.com/satoshilabs/slips/pull/1968.
export const MLDSA65_SLIP10_MASTER_KEY = 'ML-DSA-65 seed';

const HARDENED_OFFSET = 0x80000000;

// SLIP-0010 seeds are 128 to 512 bits.
const MIN_SEED_LENGTH = 16;
const MAX_SEED_LENGTH = 64;

// Canonical decimal indices only; the range is checked in `derivePath`.
const pathRegex = /^m(\/(0|[1-9][0-9]*)')+$/;

const getMasterKeyFromSeed = (masterKey: string, seed: Uint8Array): Slip10Node => {
	const I = hmac(sha512, new TextEncoder().encode(masterKey), seed);
	return split(I);
};

const CKDPriv = ({ key, chainCode }: Slip10Node, index: number): Slip10Node => {
	const data = new Uint8Array(1 + key.length + 4);
	data.set(key, 1);
	new DataView(data.buffer).setUint32(1 + key.length, index);

	const I = hmac(sha512, chainCode, data);
	data.fill(0);
	return split(I);
};

// Copies the halves out and wipes the HMAC output, so no node secret outlives its use.
const split = (I: Uint8Array): Slip10Node => {
	const node = { key: I.slice(0, 32), chainCode: I.slice(32) };
	I.fill(0);
	return node;
};

const wipe = ({ key, chainCode }: Slip10Node) => {
	key.fill(0);
	chainCode.fill(0);
};

/**
 * Derive the SLIP-0010 node at `path` from `seed` under `masterKey`. Every level must be
 * hardened; neither scheme has public derivation. The node secret at the end of the path
 * is the Ed25519 private key or the FIPS 204 keygen seed.
 */
export const derivePath = (masterKey: string, path: string, seed: Uint8Array): Slip10Node => {
	if (!pathRegex.test(path)) {
		throw new Error('Invalid derivation path');
	}
	if (seed.length < MIN_SEED_LENGTH || seed.length > MAX_SEED_LENGTH) {
		throw new Error(`Invalid seed length: expected ${MIN_SEED_LENGTH} to ${MAX_SEED_LENGTH} bytes`);
	}

	const segments = path
		.split('/')
		.slice(1)
		.map((el) => parseInt(el.slice(0, -1), 10));
	// An index of 2^31 or more would collide with a hardened index after the OR below.
	if (segments.some((segment) => segment >= HARDENED_OFFSET)) {
		throw new Error('Invalid derivation path');
	}

	let node = getMasterKeyFromSeed(masterKey, seed);
	for (const segment of segments) {
		const child = CKDPriv(node, (segment | HARDENED_OFFSET) >>> 0);
		wipe(node);
		node = child;
	}
	return node;
};
