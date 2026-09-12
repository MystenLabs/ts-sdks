// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { Transaction } from '@mysten/sui/transactions';

import { analyze, createAnalyzer, validationPolicy, SponsorValidationError } from '../src/index.js';

describe('SponsorValidationError', () => {
	it('summarizes issues and defaults to POLICY_REJECTED', () => {
		const error = new SponsorValidationError([{ message: 'a' }, { code: 'X', message: 'b' }]);
		expect(error).toBeInstanceOf(Error);
		expect(error.reason).toBe('POLICY_REJECTED');
		expect(error.issues).toHaveLength(2);
		expect(error.message).toContain('a; b');
	});

	it('carries the given kind', () => {
		const error = new SponsorValidationError([{ message: 'x' }], 'ANALYSIS_FAILED');
		expect(error.reason).toBe('ANALYSIS_FAILED');
	});
});

describe('validationPolicy', () => {
	it('preserves policy rejections alongside failed analysis without a signer', async () => {
		const policy = validationPolicy([
			createAnalyzer({
				analyze: () => () => ({ result: [{ code: 'DENIED', message: 'Denied' }] }),
			}),
			createAnalyzer({ analyze: () => () => ({ issues: [] }) }),
		]);
		const { check } = await analyze(
			{ check: policy },
			{ transaction: JSON.stringify(new Transaction().getData()) },
		);
		expect(check.result).toMatchObject({
			$kind: 'Rejected',
			reason: 'ANALYSIS_FAILED',
			policyIssues: [{ code: 'DENIED', message: 'Denied' }],
			analysisIssues: [{ code: 'ANALYSIS_FAILED', message: 'Validator could not run' }],
		});
	});

	it('accepts a passing policy without a signer', async () => {
		const policy = validationPolicy([createAnalyzer({ analyze: () => () => ({ result: null }) })]);
		const { check } = await analyze(
			{ check: policy },
			{ transaction: JSON.stringify(new Transaction().getData()) },
		);
		expect(check.status).toBe('success');
		expect(check.result).toBeNull();
	});
});
