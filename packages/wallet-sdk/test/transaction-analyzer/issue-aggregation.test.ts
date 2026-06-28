// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';

import type { Analyzer, AnalyzerResult } from '../../src/transaction-analyzer/analyzer.js';
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

// A required dependency edge with a custom `transform` that maps the dependency's
// full result to a derived value (here: its status). Required edges still
// short-circuit the parent when the dependency produces no result.
const transformedRequiredDep = createAnalyzer({
	cacheKey: 'test-transformed-required',
	dependencies: { leaf: { analyzer: leafOk, transform: (r: AnalyzerResult<number>) => r.status } },
	analyze:
		() =>
		({ leaf }) => ({ result: `leaf-was-${leaf}` }),
});

// An optional dependency edge with a custom `transform` that falls back to a
// default when the dependency could not run, instead of receiving the full result.
const transformedOptionalDep = createAnalyzer({
	cacheKey: 'test-transformed-optional',
	dependencies: {
		failingDep: {
			analyzer: failingDep,
			required: false,
			transform: (r: AnalyzerResult<string>) => r.result ?? 'fallback',
		},
	},
	analyze:
		() =>
		({ failingDep }) => ({ result: failingDep }),
});

const optionalObjectDep = createAnalyzer({
	cacheKey: 'test-optional-object-dep',
	dependencies: {
		failingDep: {
			analyzer: failingDep,
			required: false,
		},
	},
	analyze:
		() =>
		({ failingDep }) => ({ result: failingDep.status }),
});

const parentOfPartialDep = createAnalyzer({
	cacheKey: 'test-parent-of-partial-dep',
	dependencies: { partialAnalyzer },
	analyze:
		() =>
		({ partialAnalyzer }) => ({ result: `parent saw ${partialAnalyzer}` }),
});

const throwingTransformDep = createAnalyzer({
	cacheKey: 'test-throwing-transform',
	dependencies: {
		leaf: {
			analyzer: leafOk,
			transform: (_result: AnalyzerResult<number>): string => {
				throw new Error('transform boom');
			},
		},
	},
	analyze:
		() =>
		({ leaf }) => ({ result: leaf }),
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

	it('a required dependency can transform the dependency result into a derived value', async () => {
		const r = await analyze({ transformedRequiredDep }, { transaction: await txJson() });
		expect(r.status).toBe('complete');
		expect(r.transformedRequiredDep.status).toBe('success');
		expect(r.transformedRequiredDep.result).toBe('leaf-was-success');
	});

	it('an optional dependency transform can supply a fallback when the dependency fails', async () => {
		const r = await analyze({ transformedOptionalDep }, { transaction: await txJson() });
		expect(r.status).toBe('complete');
		expect(r.transformedOptionalDep.status).toBe('success');
		// Optional edges never inherit issues into the parent, so the parent stays `success`
		// and reports no issues of its own (the dep's own-issue still surfaces at top level,
		// since top-level `issues` collects every analyzer's own-issues).
		expect(r.transformedOptionalDep.result).toBe('fallback');
		expect(r.transformedOptionalDep.issues).toBeUndefined();
	});

	it('an optional dependency object without a transform receives the full dependency result', async () => {
		const r = await analyze({ optionalObjectDep }, { transaction: await txJson() });
		expect(r.status).toBe('complete');
		expect(r.optionalObjectDep.status).toBe('success');
		expect(r.optionalObjectDep.result).toBe('failed');
	});

	it('transform errors are reported as analyzer failures', async () => {
		const r = await analyze({ throwingTransformDep }, { transaction: await txJson() });
		expect(r.status).toBe('failed');
		expect(r.throwingTransformDep.status).toBe('failed');
		if (r.throwingTransformDep.status !== 'failed') {
			throw new Error(`Expected failed status, got ${r.throwingTransformDep.status}`);
		}
		expect(r.throwingTransformDep.issues.map((issue) => issue.message)).toEqual([
			'Unexpected error while analyzing transaction: transform boom',
		]);
		expect(r.issues.map((issue) => issue.message)).toEqual([
			'Unexpected error while analyzing transaction: transform boom',
		]);
	});

	it('a required partial dependency still feeds the parent and inherits issues', async () => {
		const r = await analyze({ parentOfPartialDep }, { transaction: await txJson() });
		expect(r.status).toBe('partial');
		expect(r.parentOfPartialDep.status).toBe('partial');
		expect(r.parentOfPartialDep.result).toBe('parent saw partial-result');
		expect(r.parentOfPartialDep.issues).toEqual([{ message: 'partial analyzer warning' }]);
		expect(r.parentOfPartialDep.ownIssues).toEqual([]);
	});

	it.each([
		['zero', 0],
		['empty string', ''],
		['false', false],
		['null', null],
	] as const)('keeps %s analyzer results as success', async (_name, value) => {
		const falsyAnalyzer = createAnalyzer({
			analyze: () => () => ({ result: value }),
		});
		const r = await analyze({ falsyAnalyzer }, { transaction: await txJson() });
		expect(r.status).toBe('complete');
		expect(r.falsyAnalyzer.status).toBe('success');
		expect(r.falsyAnalyzer.result).toBe(value);
	});

	it('rejects analyzer key `status` because it is reserved for top-level status', async () => {
		await expect(analyze({ status: leafOk }, { transaction: await txJson() })).rejects.toThrow(
			'Analyzer key "status" is reserved for the top-level analysis status',
		);
	});

	it('requires annotated Analyzer dependencies to include analysis keys', () => {
		const invalidAnalyzer: Analyzer<string, object, { foo: number }> = {
			// @ts-expect-error The `foo` analysis key must have a corresponding dependency.
			dependencies: {},
			analyze:
				() =>
				({ foo }) => ({ result: foo.toFixed() }),
		};

		expect(invalidAnalyzer.dependencies).toEqual({});
	});
});
