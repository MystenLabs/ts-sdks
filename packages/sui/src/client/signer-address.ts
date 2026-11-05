// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/utils';
import { blake2b } from '@noble/hashes/blake2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { MultiSig, PasskeyAuthenticator } from '../bcs/bcs.js';
import type { SignatureFlag } from '../cryptography/signature-scheme.js';
import {
	SIGNATURE_FLAG_TO_SCHEME,
	SIGNATURE_SCHEME_TO_FLAG,
	SIGNATURE_SCHEME_TO_SIZE,
} from '../cryptography/signature-scheme.js';
import { normalizeSuiAddress } from '../utils/sui-types.js';
import { zkLoginSignature } from '../zklogin/bcs.js';
import { extractClaimValue } from '../zklogin/jwt-utils.js';
import { normalizeZkLoginIssuer, toPaddedBigEndianBytes } from '../zklogin/utils.js';

/**
 * The address of a serialized signature's signer. It reads the public key out of the signature
 * bytes so transports can derive it without loading the keypair and public key classes.
 */
export function signerAddressFromSignature(signature: string): string {
	const bytes = fromBase64(signature);
	const scheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0] as SignatureFlag];

	switch (scheme) {
		case 'ED25519':
		case 'Secp256k1':
		case 'Secp256r1':
		case 'MLDSA65':
			return hashAddress(bytes[0], bytes.slice(bytes.length - SIGNATURE_SCHEME_TO_SIZE[scheme]));
		case 'Passkey': {
			// `userSignature` is flag || signature || compressed public key.
			const { userSignature } = PasskeyAuthenticator.parse(bytes.slice(1));
			return hashAddress(
				bytes[0],
				new Uint8Array(userSignature.slice(-SIGNATURE_SCHEME_TO_SIZE.Passkey)),
			);
		}
		case 'ZkLogin': {
			const { issBase64Details, addressSeed } = zkLoginSignature.parse(bytes.slice(1)).inputs;
			const iss = new TextEncoder().encode(
				normalizeZkLoginIssuer(extractClaimValue<string>(issBase64Details, 'iss')),
			);
			// The node accepts either zkLogin address derivation; this is the current (padded) one.
			return hashAddress(
				bytes[0],
				new Uint8Array([iss.length, ...iss, ...toPaddedBigEndianBytes(BigInt(addressSeed), 32)]),
			);
		}
		case 'MultiSig': {
			const { pk_map, threshold } = MultiSig.parse(bytes.slice(1)).multisig_pk;
			const data: number[] = [threshold & 0xff, threshold >> 8];
			for (const { pubKey, weight } of pk_map) {
				const key = (pubKey as unknown as Record<string, Uint8Array>)[pubKey.$kind];
				data.push(SIGNATURE_SCHEME_TO_FLAG[pubKey.$kind], ...key, weight);
			}
			return hashAddress(bytes[0], new Uint8Array(data));
		}
		default:
			throw new Error('Unsupported signature scheme');
	}
}

function hashAddress(flag: number, publicKey: Uint8Array) {
	const data = new Uint8Array(publicKey.length + 1);
	data[0] = flag;
	data.set(publicKey, 1);
	return normalizeSuiAddress(bytesToHex(blake2b(data, { dkLen: 32 })));
}
