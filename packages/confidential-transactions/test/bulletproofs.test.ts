// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { prove, commit, verify } from '../index.mjs';

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
		expect(proof).toBeInstanceOf(Uint8Array);

		const c = commit(BigInt(1000), blinding);
		expect(verify(proof, c, range)).toBe(true);
	});
});
