// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { readMoveModuleName } from '../../src/json-rpc-compat/index.js';

/**
 * Minimal Move `CompiledModule` bytes naming one module: the header, a module-handle table and an
 * identifier table, which is all `readMoveModuleName` reads.
 */
function compiledModule(name: string): Uint8Array {
	const identifier = [name.length, ...new TextEncoder().encode(name)];

	return Uint8Array.from([
		// magic, version
		0xa1,
		0x1c,
		0xeb,
		0x0b,
		6,
		0,
		0,
		0,
		// module-handle and identifier tables
		2,
		0x1,
		0,
		2,
		0x7,
		2,
		identifier.length,
		// one module handle, naming identifier 0
		0,
		0,
		...identifier,
		0, // self module handle index
	]);
}

describe('readMoveModuleName', () => {
	test('reads the self module name', () => {
		expect(readMoveModuleName(compiledModule('demo'))).toBe('demo');
	});

	test('rejects bytes without the Move magic', () => {
		const bytes = compiledModule('demo');
		bytes[0] = 0;

		expect(() => readMoveModuleName(bytes)).toThrow('Invalid Move module bytecode');
	});

	test('rejects truncated bytecode', () => {
		const bytes = compiledModule('demo');

		expect(() => readMoveModuleName(bytes.subarray(0, bytes.length - 3))).toThrow(
			'Unexpected end of Move module bytecode',
		);
	});
});
