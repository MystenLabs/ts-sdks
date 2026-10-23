// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// SLIP-0010 for ML-DSA-65: the same HMAC-SHA512 walk as `ed25519-hd-key.ts`, keyed
// with the master key proposed in https://github.com/satoshilabs/slips/pull/1968.
// The node secret at the end of the path is the FIPS 204 keygen seed.

import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';

type Keys = {
	key: Uint8Array;
	chainCode: Uint8Array;
};

export const MLDSA65_SLIP10_MASTER_KEY = 'ML-DSA-65 seed';
const HARDENED_OFFSET = 0x80000000;

// Canonical decimal indices only; the range is checked in `derivePath`.
const pathRegex = new RegExp("^m(\\/(0|[1-9][0-9]*)')+$");

const getMasterKeyFromSeed = (seed: Uint8Array): Keys => {
	const I = hmac(sha512, new TextEncoder().encode(MLDSA65_SLIP10_MASTER_KEY), seed);
	return split(I);
};

const CKDPriv = ({ key, chainCode }: Keys, index: number): Keys => {
	const data = new Uint8Array(1 + key.length + 4);
	data.set(key, 1);
	new DataView(data.buffer).setUint32(1 + key.length, index);

	const I = hmac(sha512, chainCode, data);
	data.fill(0);
	return split(I);
};

// Copies the halves out and wipes the HMAC output, so no node secret outlives its use.
const split = (I: Uint8Array): Keys => {
	const keys = { key: I.slice(0, 32), chainCode: I.slice(32) };
	I.fill(0);
	return keys;
};

const wipe = ({ key, chainCode }: Keys) => {
	key.fill(0);
	chainCode.fill(0);
};

/**
 * Derive the SLIP-0010 node at `path` from a BIP-39 seed. Every level must be
 * hardened; there is no public derivation for ML-DSA keys.
 */
export const derivePath = (path: string, seed: Uint8Array): Keys => {
	if (!pathRegex.test(path)) {
		throw new Error('Invalid derivation path');
	}

	const segments = path
		.split('/')
		.slice(1)
		.map((el) => parseInt(el.slice(0, -1), 10));
	// An index of 2^31 or more would collide with a hardened index after the OR below.
	if (segments.some((segment) => segment >= HARDENED_OFFSET)) {
		throw new Error('Invalid derivation path');
	}

	let node = getMasterKeyFromSeed(seed);
	for (const segment of segments) {
		const child = CKDPriv(node, (segment | HARDENED_OFFSET) >>> 0);
		wipe(node);
		node = child;
	}
	return node;
};
