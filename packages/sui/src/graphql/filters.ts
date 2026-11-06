// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	ResolvedCheckpointRange,
	ResolvedEventFilter,
	ResolvedTransactionFilter,
} from '../client/query-filters.js';
import type { EventFilter, TransactionFilter } from './generated/queries.js';

/**
 * Converts an inclusive-start, exclusive-end checkpoint range into GraphQL's exclusive
 * `afterCheckpoint`/`beforeCheckpoint` bounds.
 */
export function toGraphQLCheckpointBounds(range: ResolvedCheckpointRange): {
	afterCheckpoint?: number;
	beforeCheckpoint?: number;
} {
	return {
		afterCheckpoint: range.start != null && range.start > 0n ? Number(range.start - 1n) : undefined,
		beforeCheckpoint: range.end != null ? Number(range.end) : undefined,
	};
}

export function toGraphQLTransactionFilter(
	filter: ResolvedTransactionFilter | undefined,
	range: ResolvedCheckpointRange,
): TransactionFilter {
	return {
		sentAddress: filter?.sender,
		affectedAddress: filter?.affectedAddress,
		affectedObject: filter?.affectedObject,
		function: filter?.function,
		...toGraphQLCheckpointBounds(range),
	};
}

export function toGraphQLEventFilter(
	filter: ResolvedEventFilter | undefined,
	range: ResolvedCheckpointRange,
): EventFilter {
	return {
		sender: filter?.sender,
		module: filter?.emitModule,
		type: filter?.eventType,
		...toGraphQLCheckpointBounds(range),
	};
}
