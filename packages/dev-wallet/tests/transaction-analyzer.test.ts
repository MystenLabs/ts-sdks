// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { analyzeTransaction } from '../src/ui/transaction-analyzer.js';

describe('analyzeTransaction', () => {
	it('returns error when no client is provided', async () => {
		const result = await analyzeTransaction('{}', null);
		expect(result.kind).toBe('error');
		if (result.kind === 'error') {
			expect(result.message).toContain('No client');
		}
	});

	it('returns error when no client is undefined', async () => {
		const result = await analyzeTransaction('{}', undefined);
		expect(result.kind).toBe('error');
		if (result.kind === 'error') {
			expect(result.message).toContain('No client');
		}
	});

	it('returns error with context for network failures', async () => {
		// Provide a mock client that throws a network error
		const client = {
			core: {
				dryRunTransaction: () => {
					throw new Error('fetch failed: ECONNREFUSED');
				},
			},
		} as any;

		const result = await analyzeTransaction('{}', client);
		expect(result.kind).toBe('error');
	});

	it('returns error with context for deserialization failures', async () => {
		const client = {
			core: {
				dryRunTransaction: () => {
					throw new Error('Failed to deserialize BCS data');
				},
			},
		} as any;

		const result = await analyzeTransaction('{}', client);
		expect(result.kind).toBe('error');
	});

	it('returns error for generic exceptions from the analyzer', async () => {
		// The analyze function from wallet-sdk may throw for various reasons.
		// Verify analyzeTransaction catches and wraps these errors.
		const client = {
			core: {
				dryRunTransaction: () => {
					throw new Error('Something unexpected happened');
				},
			},
		} as any;

		const result = await analyzeTransaction('{}', client);
		expect(result.kind).toBe('error');
		if (result.kind === 'error') {
			expect(result.message.length).toBeGreaterThan(0);
		}
	});
});
