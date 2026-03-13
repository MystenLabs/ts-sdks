// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { analyzeTransaction } from '../src/ui/transaction-analyzer.js';

describe('analyzeTransaction', () => {
	it('returns error when no client is provided', async () => {
		for (const client of [null, undefined]) {
			const result = await analyzeTransaction('{}', client);
			expect(result.kind).toBe('error');
			if (result.kind === 'error') {
				expect(result.message).toContain('No client');
			}
		}
	});

	it('returns error when the dry-run call throws', async () => {
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
