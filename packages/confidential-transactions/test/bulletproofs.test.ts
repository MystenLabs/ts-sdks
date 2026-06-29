// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { prove, commit, verify, encrypt, decrypt, precompute_dlog_table, generate_private_key, pk_from_sk } from '../index.mjs';

describe('Bulletproofs', () => {

	it('proving should work', async () => {
		const range = 32;
		const blinding = Uint8Array.from([
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		]);
		const proof = prove(BigInt(1000), blinding, range);
		const c = commit(BigInt(1000), blinding);
		expect(verify(proof, c, range)).toBe(true);
	});

		it('decryption should work', async () => {
			let value = 12345678;
			let sk = generate_private_key();
			let pk = pk_from_sk(sk);
			let [encryption, blinding] = encrypt(pk, value);
			let dlog_table = precompute_dlog_table();
			let decrypted_value = decrypt(sk, encryption, dlog_table);
			expect(decrypted_value).toBe(value);
		})
});
