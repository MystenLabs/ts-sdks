// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { fromBase64, fromHex } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { publicKeyFromEd25519DER } from '../src/utils.js';

// A real Ed25519 SPKI public key as returned by AWS KMS `GetPublicKey` for an
// `ECC_NIST_EDWARDS25519` key, alongside its raw 32-byte form.
const ED25519_SPKI_BASE64 = 'MCowBQYDK2VwAyEAGtrlMq+wg/Im5WXF88lJcXT31S0gHy85XhUKpTXuW3c=';
const ED25519_RAW_HEX = '1adae532afb083f226e565c5f3c9497174f7d52d201f2f395e150aa535ee5b77';

describe('publicKeyFromEd25519DER', () => {
	it('extracts the raw 32-byte key from a valid SPKI structure', () => {
		const raw = publicKeyFromEd25519DER(fromBase64(ED25519_SPKI_BASE64));
		expect(raw).toEqual(fromHex(ED25519_RAW_HEX));
	});

	it('produces a public key that round-trips through Ed25519PublicKey', () => {
		const raw = publicKeyFromEd25519DER(fromBase64(ED25519_SPKI_BASE64));
		const publicKey = new Ed25519PublicKey(raw);
		expect(publicKey.toRawBytes()).toEqual(fromHex(ED25519_RAW_HEX));
	});

	it('rejects a key with an unexpected length', () => {
		const tooShort = fromBase64(ED25519_SPKI_BASE64).slice(0, 40);
		expect(() => publicKeyFromEd25519DER(tooShort)).toThrow(/length/);
	});

	it('rejects a key with an unexpected ASN.1 prefix', () => {
		const der = fromBase64(ED25519_SPKI_BASE64);
		der[1] = 0x2b; // corrupt a prefix byte
		expect(() => publicKeyFromEd25519DER(der)).toThrow(/ASN\.1/);
	});
});
