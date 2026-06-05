// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SponsorValidationError } from '../src/index.js';

describe('SponsorValidationError', () => {
	it('summarizes issues and defaults to POLICY_REJECTED', () => {
		const error = new SponsorValidationError([{ message: 'a' }, { code: 'X', message: 'b' }]);
		expect(error).toBeInstanceOf(Error);
		expect(error.kind).toBe('POLICY_REJECTED');
		expect(error.issues).toHaveLength(2);
		expect(error.message).toContain('a; b');
	});

	it('carries the given kind', () => {
		const error = new SponsorValidationError([{ message: 'x' }], 'ANALYSIS_FAILED');
		expect(error.kind).toBe('ANALYSIS_FAILED');
	});
});
