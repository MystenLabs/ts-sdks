// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { bcs, TypeTagSerializer } from '../../../src/bcs/index.js';
import { deriveObjectID } from '../../../src/utils/derived-objects.js';

// Snapshots are recreated from `derived_object_tests.move` file,
// as well as `sui-types/derived-object.rs` file.
describe('derived object test utils', () => {
	test('deriveObjectID with primitive type', () => {
		const key = bcs.byteVector().serialize(new TextEncoder().encode('foo')).toBytes();

		expect(deriveObjectID('0x2', 'vector<u8>', key)).toBe(
			'0xa2b411aa9588c398d8e3bc97dddbdd430b5ded7f81545d05e33916c3ca0f30c3',
		);
		expect(deriveObjectID('0x2', TypeTagSerializer.parseFromStr('vector<u8>'), key)).toBe(
			'0xa2b411aa9588c398d8e3bc97dddbdd430b5ded7f81545d05e33916c3ca0f30c3',
		);
	});

	test('deriveObjectID with struct type', () => {
		const structType = bcs.struct('DemoStruct', {
			value: bcs.u64(),
		});
		const key = structType.serialize({ value: 1 }).toBytes();

		expect(deriveObjectID('0x2', `0x2::derived_object_tests::DemoStruct`, key)).toBe(
			'0x20c58d8790a5d2214c159c23f18a5fdc347211e511186353e785ad543abcea6b',
		);
		expect(
			deriveObjectID(
				'0x2',
				TypeTagSerializer.parseFromStr('0x2::derived_object_tests::DemoStruct'),
				key,
			),
		).toBe('0x20c58d8790a5d2214c159c23f18a5fdc347211e511186353e785ad543abcea6b');
	});

	test('deriveObjectID with nested struct type', () => {
		const structType = bcs.struct('GenericStruct<T>', {
			value: bcs.u64(),
		});
		const key = structType.serialize({ value: 1 }).toBytes();

		expect(deriveObjectID('0x2', `0x2::derived_object_tests::GenericStruct<u64>`, key)).toBe(
			'0xb497b8dcf1e297ae5fa69c040e4a08ef8240d5373bbc9d6b686ffbd7dfe04cbe',
		);
		expect(
			deriveObjectID(
				'0x2',
				TypeTagSerializer.parseFromStr('0x2::derived_object_tests::GenericStruct<u64>'),
				key,
			),
		).toBe('0xb497b8dcf1e297ae5fa69c040e4a08ef8240d5373bbc9d6b686ffbd7dfe04cbe');
	});

	test('deriveObjectID with non-generic primitive type', () => {
		const key = bcs.U8.serialize(1).toBytes();

		expect(deriveObjectID('0x2', 'u8', key)).toBe(
			'0x4de7696edddfb592a8dc7c8b66053b1557eb4fa1a9194322562aabf3da9e9239',
		);
		expect(deriveObjectID('0x2', TypeTagSerializer.parseFromStr('u8'), key)).toBe(
			'0x4de7696edddfb592a8dc7c8b66053b1557eb4fa1a9194322562aabf3da9e9239',
		);
	});

	test('deriveObjectId from docs', () => {
		const parentAddress = '0xc0ffee';

		expect(deriveObjectID(parentAddress, 'address', bcs.Address.serialize('0x111').toBytes())).toBe(
			'0x190ed830d9b453c5c620dc0385ced49cc84804644f5dbe66aa08c0e21947d1d4',
		);
		expect(
			deriveObjectID(parentAddress, '0x1::string::String', bcs.String.serialize('foo').toBytes()),
		).toBe('0x699219f4a2b6cfb8640bb853fc4ab4f497da038ec0614bfa2835aa27993399db');

		expect(
			deriveObjectID(parentAddress, 'vector<u8>', bcs.byteVector().serialize([0, 1, 2]).toBytes()),
		).toBe('0x9067661aa45d09dac59d3eec926f8cfabb6e1ec57a9803ebc170723d3b19a9e2');
	});
});
