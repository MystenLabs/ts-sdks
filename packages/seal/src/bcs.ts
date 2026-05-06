// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsEnum, BcsStruct, BcsType } from '@mysten/bcs';
import { fromHex, toHex } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';

export const IBEEncryptions: BcsEnum<{
	BonehFranklinBLS12381: BcsStruct<{
		nonce: ReturnType<typeof bcs.bytes<96>>;
		encryptedShares: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.bytes<32>>>>;
		encryptedRandomness: ReturnType<typeof bcs.bytes<32>>;
	}>;
}> = bcs.enum('IBEEncryptions', {
	BonehFranklinBLS12381: bcs.struct('BonehFranklinBLS12381', {
		nonce: bcs.bytes(96),
		encryptedShares: bcs.vector(bcs.bytes(32)),
		encryptedRandomness: bcs.bytes(32),
	}),
});

export const Ciphertext: BcsEnum<{
	Aes256Gcm: BcsStruct<{
		blob: ReturnType<typeof bcs.byteVector>;
		aad: ReturnType<typeof bcs.option<ReturnType<typeof bcs.byteVector>>>;
	}>;
	Hmac256Ctr: BcsStruct<{
		blob: ReturnType<typeof bcs.byteVector>;
		aad: ReturnType<typeof bcs.option<ReturnType<typeof bcs.byteVector>>>;
		mac: ReturnType<typeof bcs.bytes<32>>;
	}>;
	Plain: BcsStruct<{}>;
}> = bcs.enum('Ciphertext', {
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
export const EncryptedObject: BcsStruct<{
	version: ReturnType<typeof bcs.u8>;
	packageId: typeof bcs.Address;
	id: BcsType<string, string>;
	services: ReturnType<
		typeof bcs.vector<
			ReturnType<typeof bcs.tuple<readonly [typeof bcs.Address, ReturnType<typeof bcs.u8>]>>
		>
	>;
	threshold: ReturnType<typeof bcs.u8>;
	encryptedShares: typeof IBEEncryptions;
	ciphertext: typeof Ciphertext;
}> = bcs.struct('EncryptedObject', {
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
export const KeyServerMoveV1: BcsStruct<{
	name: ReturnType<typeof bcs.string>;
	url: ReturnType<typeof bcs.string>;
	keyType: ReturnType<typeof bcs.u8>;
	pk: ReturnType<typeof bcs.byteVector>;
}> = bcs.struct('KeyServerV1', {
	name: bcs.string(),
	url: bcs.string(),
	keyType: bcs.u8(),
	pk: bcs.byteVector(),
});

/**
 * The Move struct for PartialKeyServer.
 */
export const PartialKeyServer: BcsStruct<{
	name: ReturnType<typeof bcs.string>;
	url: ReturnType<typeof bcs.string>;
	partialPk: ReturnType<typeof bcs.byteVector>;
	partyId: ReturnType<typeof bcs.u16>;
}> = bcs.struct('PartialKeyServer', {
	name: bcs.string(),
	url: bcs.string(),
	partialPk: bcs.byteVector(),
	partyId: bcs.u16(),
});

/**
 * The Move enum for ServerType (V2).
 */
export const ServerType: BcsEnum<{
	Independent: BcsStruct<{
		url: ReturnType<typeof bcs.string>;
	}>;
	Committee: BcsStruct<{
		version: ReturnType<typeof bcs.u32>;
		threshold: ReturnType<typeof bcs.u16>;
		partialKeyServers: ReturnType<typeof bcs.vector<typeof PartialKeyServer>>;
	}>;
}> = bcs.enum('ServerType', {
	Independent: bcs.struct('Independent', {
		url: bcs.string(),
	}),
	Committee: bcs.struct('Committee', {
		version: bcs.u32(),
		threshold: bcs.u16(),
		partialKeyServers: bcs.vector(PartialKeyServer),
	}),
});

/**
 * The Move struct for the KeyServerV2 object.
 */
export const KeyServerMoveV2: BcsStruct<{
	name: ReturnType<typeof bcs.string>;
	keyType: ReturnType<typeof bcs.u8>;
	pk: ReturnType<typeof bcs.byteVector>;
	serverType: typeof ServerType;
}> = bcs.struct('KeyServerV2', {
	name: bcs.string(),
	keyType: bcs.u8(),
	pk: bcs.byteVector(),
	serverType: ServerType,
});

/**
 * The Move struct for the parent object.
 */
export const KeyServerMove: BcsStruct<{
	id: typeof bcs.Address;
	firstVersion: ReturnType<typeof bcs.u64>;
	lastVersion: ReturnType<typeof bcs.u64>;
}> = bcs.struct('KeyServer', {
	id: bcs.Address,
	firstVersion: bcs.u64(), // latest version
	lastVersion: bcs.u64(), // oldest version
});
