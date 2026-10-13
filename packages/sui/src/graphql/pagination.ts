// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedPagination } from '../client/query-filters.js';

export interface GraphQLPageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor?: string | null;
	endCursor?: string | null;
}

const MAX_EMPTY_PROBES = 3;

/**
 * Resolves whether a page has a next page in its traversal direction.
 *
 * GraphQL treats cursors as inclusive bounds and reports another page whenever a page ends
 * next to the bound it travels toward (`before` when ascending, `after` when descending),
 * even if nothing lies between them. When the server reports more items in that situation,
 * fetch one item between the end of the page and the bound to find out, so that windowed
 * reads end exactly when gRPC's do. An empty probe that still reports more items (stream-backed
 * deployments emit watermark cursors at the bound) is re-probed from its own cursor a bounded
 * number of times rather than trusted. A page without a cursor to continue from (such as an
 * empty window whose bounds are equal) has no next page.
 */
export async function hasNextPageWithinBounds(
	pageInfo: GraphQLPageInfo,
	pagination: ResolvedPagination,
	fetchOne: (page: {
		first?: number;
		last?: number;
		after?: string;
		before?: string;
	}) => Promise<{ nodes: unknown[]; pageInfo: GraphQLPageInfo }>,
): Promise<boolean> {
	const { descending, after, before } = pagination;
	const hasNextPage = descending ? pageInfo.hasPreviousPage : pageInfo.hasNextPage;
	const continuation = descending ? pageInfo.startCursor : pageInfo.endCursor;
	const bound = descending ? after : before;

	if (!hasNextPage || continuation == null) {
		return false;
	}

	if (bound == null) {
		return true;
	}

	let cursor = continuation;
	for (let round = 0; round < MAX_EMPTY_PROBES; round++) {
		const probe = await fetchOne(
			descending ? { last: 1, after, before: cursor } : { first: 1, after: cursor, before },
		);

		if (probe.nodes.length > 0) {
			return true;
		}

		// An empty probe can still be flagged as having more items: stream-backed deployments emit
		// watermark cursors at the bound, so the flag alone does not mean an item exists. Keep
		// probing from the probe's own continuation cursor until an item turns up, the server stops
		// returning a cursor, the cursor stops advancing, or the rounds run out.
		const probeHasMore = descending ? probe.pageInfo.hasPreviousPage : probe.pageInfo.hasNextPage;
		const next = descending ? probe.pageInfo.startCursor : probe.pageInfo.endCursor;

		if (!probeHasMore || next == null || next === cursor) {
			return false;
		}

		cursor = next;
	}

	return false;
}
