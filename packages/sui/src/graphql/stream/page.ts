// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Page, PageRequest } from '../../client/stream/adapter.js';
import {
	cursorBytes,
	cursorString,
	pageItem,
	type LedgerFamily,
	type LedgerItem,
} from './families.js';

/** The largest page the service returns. */
const PAGE_SIZE = 50;

/** One query as a page, continued through Relay `pageInfo`. */
export async function* fetchGraphQLPage<Node>(
	family: LedgerFamily<Node>,
	request: PageRequest,
): Page<LedgerItem<Node>> {
	const { order, range, signal } = request;
	const pageSize = family.pageSize ?? PAGE_SIZE;
	const descending = order === 'descending';
	const page = await family.page({
		range,
		...(descending ? { last: pageSize } : { first: pageSize }),
		after: request.after && cursorString(request.after),
		before: request.before && cursorString(request.before),
		signal,
	});
	// A replica behind the high end of a descending read would skip what it has not indexed yet.
	if (descending && range.end !== undefined && page.viewedAt < range.end - 1n) {
		return { next: { more: false }, notIndexed: true };
	}

	const edges = descending ? [...page.edges].reverse() : page.edges;
	for (const edge of edges) yield pageItem(family, edge);

	const { pageInfo } = page;
	const more = descending ? pageInfo.hasPreviousPage : pageInfo.hasNextPage;
	const cursor = descending ? pageInfo.startCursor : pageInfo.endCursor;
	return {
		next: { more, cursor: cursor === null ? undefined : cursorBytes(cursor) },
		// The replica that answered has indexed through `viewedAt`.
		covered: descending ? undefined : page.viewedAt,
	};
}
