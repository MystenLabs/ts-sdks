// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';

export const IBEEncryptions = bcs.enum('IBEEncryptions', {
	BonehFranklinBLS12381: bcs.struct('BonehFranklinBLS12381', {
		nonce: bcs.bytes(96),
		encryptedShares: bcs.vector(bcs.bytes(32)),
		encryptedRandomness: bcs.bytes(32),
	}),
});

export const Ciphertext = bcs.enum('Ciphertext', {
	Aes256Gcm: bcs.struct('Aes256Gcm', {
		blob: bcs.byteVector(),
		aad: bcs.option(bcs.byteVector()),
	}),
	Hmac256Ctr: bcs.struct('Hmac256Ctr', {
		blob: bcs.byteVector(),
		aad: bcs.option(bcs.byteVector()),
		mac: bcs.bytes(32),
	}),
	Plain: bcs.struct('Plain', {}),
});

/**
 * The encrypted object format. Should be aligned with the Rust implementation.
 */
export const EncryptedObject = bcs.struct('EncryptedObject', {
	version: bcs.u8(),
	packageId: bcs.Address,
	id: bcs.byteVector().transform({
		output: (val) => toHex(val),
		input: (val: string) => fromHex(val),
	}),
	services: bcs.vector(bcs.tuple([bcs.Address, bcs.u8()])),
	threshold: bcs.u8(),
	encryptedShares: IBEEncryptions,
	ciphertext: Ciphertext,
});

/**
 * The Move struct for the KeyServerV1 object.
 */
export const KeyServerMoveV1 = bcs.struct('KeyServerV1', {
	name: bcs.string(),
	url: bcs.string(),
	keyType: bcs.u8(),
	pk: bcs.byteVector(),
});

/**
 * The Move struct for the parent object.
 */
export const KeyServerMove = bcs.struct('KeyServer', {
	id: bcs.Address,
	firstVersion: bcs.u64(), // latest version
	lastVersion: bcs.u64(), // oldest version
});
