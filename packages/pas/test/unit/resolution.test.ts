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

		it('should correctly rebase across multiple template commands in the same transaction', () => {
			// Simulates a 2-command template inserted at offset 5:
			//   template cmd[0]: a MoveCall that produces a result (no Result args)
			//   template cmd[1]: a MoveCall that uses Result(0) to reference cmd[0]
			//
			// Both share the same commandOffset (5) because Result indices in the
			// template are relative to the first template command, not each individual one.
			const templateCmd0 = makeParsedMoveCall([
				{ Input: { Ext: ['pas', 'request'] } },
			]);
			const templateCmd1 = makeParsedMoveCall([
				{ Result: 0 },
				{ Input: { Ext: ['pas', 'policy'] } },
			]);

			const requestArg = { $kind: 'Result' as const, Result: 4 };
			const policyArg = { $kind: 'Input' as const, Input: 0, type: 'object' as const };
			const commonArgs = {
				...dummyBuildArgs,
				request: requestArg,
				policy: policyArg,
			};

			const templateStartIdx = 5;
			const built0 = buildMoveCallCommandFromTemplate(templateCmd0, commonArgs, templateStartIdx);
			const built1 = buildMoveCallCommandFromTemplate(templateCmd1, commonArgs, templateStartIdx);

			// cmd[0] should have the request arg passed through (no rebasing needed)
			expect(built0.MoveCall?.arguments[0]).toEqual(requestArg);

			// cmd[1]'s Result(0) should become Result(5), pointing at template cmd[0]
			expect(built1.MoveCall?.arguments[0]).toEqual({
				$kind: 'Result',
				Result: 5,
			});
			// cmd[1]'s policy arg should be passed through unchanged
			expect(built1.MoveCall?.arguments[1]).toEqual(policyArg);
		});

		it('should correctly rebase a 3-command template with chained results', () => {
			// 3-command template at offset 10:
			//   cmd[0]: produces result (no Result args)
			//   cmd[1]: uses Result(0) — references cmd[0]
			//   cmd[2]: uses Result(0) and Result(1) — references cmd[0] and cmd[1]
			const templateCmd0 = makeParsedMoveCall([]);
			const templateCmd1 = makeParsedMoveCall([{ Result: 0 }]);
			const templateCmd2 = makeParsedMoveCall([{ Result: 0 }, { Result: 1 }]);

			const templateStartIdx = 10;
			const built0 = buildMoveCallCommandFromTemplate(templateCmd0, dummyBuildArgs, templateStartIdx);
			const built1 = buildMoveCallCommandFromTemplate(templateCmd1, dummyBuildArgs, templateStartIdx);
			const built2 = buildMoveCallCommandFromTemplate(templateCmd2, dummyBuildArgs, templateStartIdx);

			// cmd[0] has no Result args
			expect(built0.MoveCall?.arguments).toEqual([]);

			// cmd[1]'s Result(0) -> Result(10)
			expect(built1.MoveCall?.arguments[0]).toEqual({
				$kind: 'Result',
				Result: 10,
			});

			// cmd[2]'s Result(0) -> Result(10), Result(1) -> Result(11)
			expect(built2.MoveCall?.arguments[0]).toEqual({
				$kind: 'Result',
				Result: 10,
			});
			expect(built2.MoveCall?.arguments[1]).toEqual({
				$kind: 'Result',
				Result: 11,
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
