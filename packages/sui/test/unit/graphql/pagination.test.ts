// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { resolvePagination } from '../../../src/client/query-filters.js';
import type { GraphQLPageInfo } from '../../../src/graphql/pagination.js';
import { hasNextPageWithinBounds } from '../../../src/graphql/pagination.js';

function pageInfo(overrides: Partial<GraphQLPageInfo>): GraphQLPageInfo {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		startCursor: 'start',
		endCursor: 'end',
		...overrides,
	};
}

function probeReturning(nodes: unknown[], info: Partial<GraphQLPageInfo> = {}) {
	return vi.fn(async () => ({ nodes, pageInfo: pageInfo(info) }));
}

describe('hasNextPageWithinBounds', () => {
	it('uses the server flag directly when not traveling toward a bound', async () => {
		const fetchOne = probeReturning([]);

		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A' }),
				fetchOne,
			),
		).toBe(true);
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasPreviousPage: true }),
				resolvePagination({ before: 'B' }),
				fetchOne,
			),
		).toBe(true);
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: false }),
				resolvePagination({ after: 'A', before: 'B' }),
				fetchOne,
			),
		).toBe(false);
		expect(fetchOne).not.toHaveBeenCalled();
	});

	it('reports no next page for pages without a continuation cursor', async () => {
		const fetchOne = probeReturning([1]);

		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true, startCursor: null, endCursor: null }),
				resolvePagination({ after: 'A', before: 'A' }),
				fetchOne,
			),
		).toBe(false);
		expect(fetchOne).not.toHaveBeenCalled();
	});

	it('probes between the end of an ascending page and `before`', async () => {
		const empty = probeReturning([]);
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A', before: 'B' }),
				empty,
			),
		).toBe(false);
		expect(empty).toHaveBeenCalledWith({ first: 1, after: 'end', before: 'B' });

		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A', before: 'B' }),
				probeReturning([1]),
			),
		).toBe(true);
	});

	it('probes between the end of a descending page and `after`', async () => {
		const empty = probeReturning([]);
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasPreviousPage: true }),
				resolvePagination({ after: 'A', order: 'descending' }),
				empty,
			),
		).toBe(false);
		expect(empty).toHaveBeenCalledWith({ last: 1, after: 'A', before: 'start' });
	});

	it('does not trust the flag on an empty probe page that never yields an item', async () => {
		const fetchOne = vi.fn(async (page: { after?: string }) => ({
			nodes: [],
			pageInfo: pageInfo({ hasNextPage: true, endCursor: `${page.after}+` }),
		}));
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A', before: 'B' }),
				fetchOne,
			),
		).toBe(false);
		expect(fetchOne).toHaveBeenCalledTimes(3);
		expect(fetchOne).toHaveBeenNthCalledWith(2, { first: 1, after: 'end+', before: 'B' });
		expect(fetchOne).toHaveBeenNthCalledWith(3, { first: 1, after: 'end++', before: 'B' });
	});

	it('reports a next page when a re-probe after an empty flagged probe finds an item', async () => {
		const fetchOne = vi
			.fn()
			.mockResolvedValueOnce({
				nodes: [],
				pageInfo: pageInfo({ hasNextPage: true, endCursor: 'watermark' }),
			})
			.mockResolvedValueOnce({ nodes: [1], pageInfo: pageInfo({}) });
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A', before: 'B' }),
				fetchOne,
			),
		).toBe(true);
		expect(fetchOne).toHaveBeenCalledTimes(2);
		expect(fetchOne).toHaveBeenLastCalledWith({ first: 1, after: 'watermark', before: 'B' });
	});

	it('reports no next page when empty flagged probes stop advancing the cursor', async () => {
		const fetchOne = probeReturning([], { hasNextPage: true, endCursor: 'end' });
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A', before: 'B' }),
				fetchOne,
			),
		).toBe(false);
		expect(fetchOne).toHaveBeenCalledTimes(1);

		const descending = probeReturning([], { hasPreviousPage: true, startCursor: 'start' });
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasPreviousPage: true }),
				resolvePagination({ after: 'A', order: 'descending' }),
				descending,
			),
		).toBe(false);
		expect(descending).toHaveBeenCalledTimes(1);
	});

	it('reports no next page when an empty flagged probe returns no cursor', async () => {
		const fetchOne = probeReturning([], { hasNextPage: true, endCursor: null });
		expect(
			await hasNextPageWithinBounds(
				pageInfo({ hasNextPage: true }),
				resolvePagination({ after: 'A', before: 'B' }),
				fetchOne,
			),
		).toBe(false);
		expect(fetchOne).toHaveBeenCalledTimes(1);
	});
});
