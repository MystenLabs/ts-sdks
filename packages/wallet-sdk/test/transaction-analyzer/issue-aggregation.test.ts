// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';

import { analyze, createAnalyzer, optional } from '../../src/transaction-analyzer/analyzer.js';
import { DEFAULT_SENDER } from '../mocks/mockData.js';

const failingDep = createAnalyzer({
	cacheKey: 'test-failing-dep',
	analyze: () => () => ({ issues: [{ message: 'shared-dep failed' }] }),
});

const analyzerA = createAnalyzer({
	cacheKey: 'test-analyzer-a',
	dependencies: { failingDep },
	analyze: () => () => ({ result: 'a' }),
});

const analyzerB = createAnalyzer({
	cacheKey: 'test-analyzer-b',
	dependencies: { failingDep },
	analyze: () => () => ({ result: 'b' }),
});

const leafOk = createAnalyzer({
	cacheKey: 'test-leaf-ok',
	analyze: () => () => ({ result: 42 }),
});

const ownIssuesAnalyzer = createAnalyzer({
	cacheKey: 'test-own-issues',
	dependencies: { leafOk },
	analyze: () => () => ({ issues: [{ message: 'own-issue emitted by this analyzer' }] }),
});

const partialAnalyzer = createAnalyzer({
	cacheKey: 'test-partial',
	analyze: () => () => ({
		result: 'partial-result',
		issues: [{ message: 'partial analyzer warning' }],
	}),
});

const optionalDepAnalyzer = createAnalyzer({
	cacheKey: 'test-optional-dep',
	dependencies: { failingDep: optional(failingDep), leafOk },
	analyze:
		() =>
		({ failingDep, leafOk }) => ({
			result: {
				depStatus: failingDep.status,
				value: leafOk,
			},
			issues:
				failingDep.status === 'success'
					? undefined
					: [{ message: `optional dependency was ${failingDep.status}` }],
		}),
});

async function txJson() {
	const tx = new Transaction();
	tx.setSender(DEFAULT_SENDER);
	return tx.toJSON();
}

describe('analyze — issue handling', () => {
	it('failed dep issues skip required dependents and leave `ownIssues` empty', async () => {
		const r = await analyze({ analyzerA }, { transaction: await txJson() });
		expect(r.status).toBe('failed');
		expect(r.analyzerA.status).toBe('skipped');
		expect(r.analyzerA.result).toBeUndefined();
		expect(r.analyzerA.issues).toEqual([{ message: 'shared-dep failed' }]);
		expect(r.analyzerA.ownIssues).toEqual([]);
	});

	it('own issues appear in both `issues` and `ownIssues`', async () => {
		const r = await analyze({ ownIssuesAnalyzer }, { transaction: await txJson() });
		expect(r.status).toBe('failed');
		expect(r.ownIssuesAnalyzer.status).toBe('failed');
		expect(r.ownIssuesAnalyzer.result).toBeUndefined();
		expect(r.ownIssuesAnalyzer.issues).toEqual([{ message: 'own-issue emitted by this analyzer' }]);
		expect(r.ownIssuesAnalyzer.ownIssues).toEqual([
			{ message: 'own-issue emitted by this analyzer' },
		]);
	});

	it('successful analyzers have no issues or ownIssues', async () => {
		const r = await analyze({ leafOk }, { transaction: await txJson() });
		expect(r.status).toBe('complete');
		expect(r.leafOk.status).toBe('success');
		expect(r.leafOk.result).toBe(42);
		expect(r.leafOk.issues).toBeUndefined();
		expect(r.leafOk.ownIssues).toBeUndefined();
	});

	it('top-level `issues` reports each failing analyzer exactly once', async () => {
		const r = await analyze({ analyzerA, analyzerB }, { transaction: await txJson() });
		expect(r.status).toBe('failed');
		expect(r.analyzerA.issues).toEqual([{ message: 'shared-dep failed' }]);
		expect(r.analyzerB.issues).toEqual([{ message: 'shared-dep failed' }]);
		expect(r.issues).toEqual([{ message: 'shared-dep failed' }]);
	});

	it('top-level `issues` includes own-issues from every analyzer, not just top-level ones', async () => {
		const r = await analyze({ analyzerA, ownIssuesAnalyzer }, { transaction: await txJson() });
		expect(r.status).toBe('failed');
		const messages = r.issues.map((i) => i.message).sort();
		expect(messages).toEqual(['own-issue emitted by this analyzer', 'shared-dep failed']);
	});

	it('top-level `issues` is empty when nothing fails', async () => {
		const r = await analyze({ leafOk }, { transaction: await txJson() });
		expect(r.status).toBe('complete');
		expect(r.issues).toEqual([]);
	});

	it('top-level status is partial when independent analyzers have mixed outcomes', async () => {
		const r = await analyze({ analyzerA, leafOk }, { transaction: await txJson() });
		expect(r.status).toBe('partial');
		expect(r.analyzerA.status).toBe('skipped');
		expect(r.leafOk.status).toBe('success');
		expect(r.leafOk.result).toBe(42);
	});

	it('an analyzer can return a partial result with issues', async () => {
		const r = await analyze({ partialAnalyzer }, { transaction: await txJson() });
		expect(r.status).toBe('partial');
		expect(r.partialAnalyzer.status).toBe('partial');
		expect(r.partialAnalyzer.result).toBe('partial-result');
		expect(r.partialAnalyzer.issues).toEqual([{ message: 'partial analyzer warning' }]);
		expect(r.partialAnalyzer.ownIssues).toEqual([{ message: 'partial analyzer warning' }]);
		expect(r.issues).toEqual([{ message: 'partial analyzer warning' }]);
	});

	it('optional dependency failures do not skip the parent analyzer', async () => {
		const r = await analyze({ optionalDepAnalyzer }, { transaction: await txJson() });
		expect(r.status).toBe('partial');
		expect(r.optionalDepAnalyzer.status).toBe('partial');
		expect(r.optionalDepAnalyzer.result).toEqual({
			depStatus: 'failed',
			value: 42,
		});
		expect(r.optionalDepAnalyzer.issues).toEqual([{ message: 'optional dependency was failed' }]);
		expect(r.issues.map((issue) => issue.message).sort()).toEqual([
			'optional dependency was failed',
			'shared-dep failed',
		]);
	});
});
