// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { readMoveModuleName } from '../../src/json-rpc-compat/move-bytecode.js';
import { compiledModule } from './compiled-module.js';

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
