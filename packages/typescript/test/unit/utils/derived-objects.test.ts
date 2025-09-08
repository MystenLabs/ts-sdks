// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { bcs } from '../../../src/bcs';
import { deriveObjectID } from '../../../src/utils/derived-objects';
import { normalizeSuiAddress } from '../../../src/utils';

// Snapshots are recreated from `derived_object_tests.move` file,
// as well as `sui-types/derived-object.rs` file.
describe('derived object test utils', () => {
	test('deriveObjectID with primitive type', () => {
		const key = bcs.vector(bcs.u8()).serialize(new TextEncoder().encode('foo')).toBytes();

		const result = deriveObjectID(normalizeSuiAddress('0x2'), 'vector<u8>', key);

		expect(result).toBe('0xa2b411aa9588c398d8e3bc97dddbdd430b5ded7f81545d05e33916c3ca0f30c3');
	});

	test('deriveObjectID with struct type', () => {
		const structType = bcs.struct('DemoStruct', {
			value: bcs.u64(),
		});
		const key = structType.serialize({ value: 1 }).toBytes();

		const result = deriveObjectID('0x2', `0x2::derived_object_tests::DemoStruct`, key);

		expect(result).toBe('0x20c58d8790a5d2214c159c23f18a5fdc347211e511186353e785ad543abcea6b');
	});

	test('deriveObjectID with nested struct type', () => {
		const structType = bcs.struct('GenericStruct<T>', {
			value: bcs.u64(),
		});
		const key = structType.serialize({ value: 1 }).toBytes();

		const result = deriveObjectID('0x2', `0x2::derived_object_tests::GenericStruct<u64>`, key);

		expect(result).toBe('0xb497b8dcf1e297ae5fa69c040e4a08ef8240d5373bbc9d6b686ffbd7dfe04cbe');
	});
});
