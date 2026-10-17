// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedCheckpointRange } from '../../client/query-filters.js';
import type { Page, PageRequest } from '../../client/stream/adapter.js';
import { pageItems, SuiStreamError } from '../../client/stream/index.js';
import {
	cursorBytes,
	cursorString,
	pageItem,
	type LedgerFamily,
	type LedgerItem,
} from './families.js';

/** The largest page the service returns. */
export const PAGE_SIZE = 50;
/** GraphQL checkpoint arguments are UInt53. */
const MAX_CHECKPOINT = BigInt(Number.MAX_SAFE_INTEGER);

/** One query as a page, continued through Relay `pageInfo`. */
export async function fetchGraphQLPage<Node>(
	family: LedgerFamily<Node>,
	request: PageRequest,
): Promise<Page<LedgerItem<Node>>> {
	const { order, signal } = request;
	const pageSize = family.pageSize ?? PAGE_SIZE;
	const descending = order === 'descending';
	const after = request.after && cursorString(request.after);
	const before = request.before && cursorString(request.before);
	const page = await family.page({
		range: checkpointRange(request.range),
		...(descending ? { last: pageSize } : { first: pageSize }),
		after,
		before,
		signal,
	});
	const edges = descending ? [...page.edges].reverse() : page.edges;
	const { pageInfo } = page;
	const more = descending ? pageInfo.hasPreviousPage : pageInfo.hasNextPage;
	const cursor = descending ? pageInfo.startCursor : pageInfo.endCursor;
	// Server quirk: an empty window can report more pages while returning the cursor it was sent.
	const stalled = edges.length === 0 && cursor !== null && cursor === (descending ? before : after);
	const next = {
		more: more && !stalled,
		cursor: cursor === null ? undefined : cursorBytes(cursor),
	};
	return {
		items: pageItems(
			edges.map((edge) => pageItem(family, edge)),
			{ next },
		),
		viewedAt: page.viewedAt,
		retainedFrom: page.retainedFrom ?? undefined,
	};
}

function checkpointRange({ start, end }: PageRequest['range']): ResolvedCheckpointRange {
	if (start !== undefined && start > MAX_CHECKPOINT) {
		throw new SuiStreamError('InvalidOptions', `Checkpoint ${start} exceeds UInt53`);
	}
	// An end past UInt53 is past every checkpoint.
	return { start, end: end !== undefined && end <= MAX_CHECKPOINT ? end : undefined };
}
