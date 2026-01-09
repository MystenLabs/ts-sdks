// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { formatMoveAbortMessage, formatOrdinal } from '../../../src/client/utils.js';

describe('formatOrdinal', () => {
	it('should format 1st, 2nd, 3rd correctly', () => {
		expect(formatOrdinal(1)).toBe('1st');
		expect(formatOrdinal(2)).toBe('2nd');
		expect(formatOrdinal(3)).toBe('3rd');
	});

	it('should format 4th-20th with "th" suffix', () => {
		expect(formatOrdinal(4)).toBe('4th');
		expect(formatOrdinal(10)).toBe('10th');
		expect(formatOrdinal(11)).toBe('11th');
		expect(formatOrdinal(12)).toBe('12th');
		expect(formatOrdinal(13)).toBe('13th');
		expect(formatOrdinal(20)).toBe('20th');
	});

	it('should format 21st, 22nd, 23rd correctly', () => {
		expect(formatOrdinal(21)).toBe('21st');
		expect(formatOrdinal(22)).toBe('22nd');
		expect(formatOrdinal(23)).toBe('23rd');
	});
});

describe('formatMoveAbortMessage', () => {
	it('should format basic abort with location', () => {
		const message = formatMoveAbortMessage({
			abortCode: '42',
			location: {
				package: '0x1234',
				module: 'test_module',
				functionName: 'test_function',
			},
		});
		expect(message).toBe("from '0x1234::test_module::test_function', abort code: 42");
	});

	it('should include command number', () => {
		const message = formatMoveAbortMessage({
			command: 0,
			abortCode: '42',
			location: {
				package: '0x1234',
				module: 'test_module',
				functionName: 'test_function',
			},
		});
		expect(message).toBe(
			"Error in 1st command, from '0x1234::test_module::test_function', abort code: 42",
		);
	});

	it('should include instruction number', () => {
		const message = formatMoveAbortMessage({
			command: 0,
			abortCode: '42',
			location: {
				package: '0x1234',
				module: 'test_module',
				functionName: 'test_function',
				instruction: 5,
			},
		});
		expect(message).toBe(
			"Error in 1st command, from '0x1234::test_module::test_function' (instruction 5), abort code: 42",
		);
	});

	it('should prefer line number over instruction when clever error present', () => {
		const message = formatMoveAbortMessage({
			command: 0,
			abortCode: '42',
			location: {
				package: '0x1234',
				module: 'test_module',
				functionName: 'test_function',
				instruction: 5,
			},
			cleverError: {
				lineNumber: 135,
				constantName: 'ETestError',
			},
		});
		expect(message).toBe(
			"Error in 1st command, from '0x1234::test_module::test_function' (line 135), abort 'ETestError'",
		);
	});

	it('should format clever error with value', () => {
		const message = formatMoveAbortMessage({
			command: 0,
			abortCode: '42',
			location: {
				package: '0x1234',
				module: 'test_module',
				functionName: 'test_function',
			},
			cleverError: {
				lineNumber: 135,
				constantName: 'ETestError',
				value: 'Test error message',
			},
		});
		expect(message).toBe(
			"Error in 1st command, from '0x1234::test_module::test_function' (line 135), abort 'ETestError': Test error message",
		);
	});

	it('should normalize package address without 0x prefix', () => {
		const message = formatMoveAbortMessage({
			abortCode: '42',
			location: {
				package: '1234abcd',
				module: 'test_module',
				functionName: 'test_function',
			},
		});
		expect(message).toBe("from '0x1234abcd::test_module::test_function', abort code: 42");
	});

	it('should handle missing location', () => {
		const message = formatMoveAbortMessage({
			command: 0,
			abortCode: '42',
		});
		expect(message).toBe('Error in 1st command, abort code: 42');
	});

	it('should handle location without function name', () => {
		const message = formatMoveAbortMessage({
			abortCode: '42',
			location: {
				package: '0x1234',
				module: 'test_module',
			},
		});
		expect(message).toBe("from '0x1234::test_module', abort code: 42");
	});

	it('should format 2nd command correctly', () => {
		const message = formatMoveAbortMessage({
			command: 1,
			abortCode: '100',
			location: {
				package: '0xabc',
				module: 'module',
				functionName: 'func',
			},
		});
		expect(message).toBe("Error in 2nd command, from '0xabc::module::func', abort code: 100");
	});
});
