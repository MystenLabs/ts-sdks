// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { buildMoveCallCommandFromTemplate } from '../../src/resolution.js';

/**
 * Constructs a fake parsed template command (the shape returned by MoveCall.parse()).
 * This lets us test buildMoveCallCommandFromTemplate without needing real BCS data.
 */
function makeParsedMoveCall(args: Record<string, unknown>[]) {
	return {
		package_id: '0x1',
		module_name: 'test',
		function: 'func',
		arguments: args,
		type_arguments: [] as string[],
	};
}

describe('buildMoveCallCommandFromTemplate', () => {
	const dummyBuildArgs = {
		addInput: () => ({ $kind: 'Input' as const, Input: 0, type: 'object' as const }),
	};

	describe('Result/NestedResult rebasing', () => {
		it('should rebase Result indices by commandOffset', () => {
			// Template has 2 commands: cmd[0] produces a value, cmd[1] uses Result(0).
			// When inserted at offset 5, Result(0) should become Result(5).
			const templateCmd = makeParsedMoveCall([{ Result: 0 }]);

			const result = buildMoveCallCommandFromTemplate(templateCmd, dummyBuildArgs, 5);

			expect(result.MoveCall?.arguments[0]).toEqual({
				$kind: 'Result',
				Result: 5,
			});
		});

		it('should rebase NestedResult command index by commandOffset', () => {
			// NestedResult(0, 1) at offset 3 should become NestedResult(3, 1)
			const templateCmd = makeParsedMoveCall([{ NestedResult: [0, 1] }]);

			const result = buildMoveCallCommandFromTemplate(templateCmd, dummyBuildArgs, 3);

			expect(result.MoveCall?.arguments[0]).toEqual({
				$kind: 'NestedResult',
				NestedResult: [3, 1],
			});
		});

		it('should preserve sub-index in NestedResult', () => {
			// NestedResult(1, 2) at offset 10 should become NestedResult(11, 2)
			const templateCmd = makeParsedMoveCall([{ NestedResult: [1, 2] }]);

			const result = buildMoveCallCommandFromTemplate(templateCmd, dummyBuildArgs, 10);

			expect(result.MoveCall?.arguments[0]).toEqual({
				$kind: 'NestedResult',
				NestedResult: [11, 2],
			});
		});

		it('should handle offset of 0 (no change needed)', () => {
			const templateCmd = makeParsedMoveCall([{ Result: 0 }]);

			const result = buildMoveCallCommandFromTemplate(templateCmd, dummyBuildArgs, 0);

			expect(result.MoveCall?.arguments[0]).toEqual({
				$kind: 'Result',
				Result: 0,
			});
		});

		it('should rebase multiple Result args in the same command', () => {
			// A command that references two earlier template results
			const templateCmd = makeParsedMoveCall([{ Result: 0 }, { Result: 1 }]);

			const result = buildMoveCallCommandFromTemplate(templateCmd, dummyBuildArgs, 7);

			expect(result.MoveCall?.arguments[0]).toEqual({
				$kind: 'Result',
				Result: 7,
			});
			expect(result.MoveCall?.arguments[1]).toEqual({
				$kind: 'Result',
				Result: 8,
			});
		});

		it('should not affect non-Result arguments when rebasing', () => {
			// Mix of Ext-resolved input and a Result
			const templateCmd = makeParsedMoveCall([
				{ Input: { Ext: ['pas', 'request'] } },
				{ Result: 0 },
			]);

			const requestArg = { $kind: 'Result' as const, Result: 99 };
			const result = buildMoveCallCommandFromTemplate(
				templateCmd,
				{ ...dummyBuildArgs, request: requestArg },
				5,
			);

			// The Ext input should resolve to the request arg (unchanged)
			expect(result.MoveCall?.arguments[0]).toEqual(requestArg);
			// The Result should be rebased
			expect(result.MoveCall?.arguments[1]).toEqual({
				$kind: 'Result',
				Result: 5,
			});
		});
	});
});
