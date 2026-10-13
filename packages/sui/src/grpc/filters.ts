// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedEventFilter, ResolvedTransactionFilter } from '../client/query-filters.js';
import type {
	EventFilter,
	EventLiteral,
	TransactionFilter,
	TransactionLiteral,
} from './proto/sui/rpc/v2/filter.js';

/**
 * Converts a resolved transaction filter into a gRPC DNF filter, or `undefined` when the filter
 * matches everything. Predicates are ANDed into one term, except that `affectedAddress` expands
 * into two terms (the address's state changed, or the address sent the transaction), each ANDed
 * with the remaining predicates.
 */
export function toGrpcTransactionFilter(
	filter: ResolvedTransactionFilter | undefined,
): TransactionFilter | undefined {
	const predicates: TransactionLiteral['predicate'][] = [];

	if (filter?.sender != null) {
		predicates.push({ oneofKind: 'sender', sender: { address: filter.sender } });
	}
	if (filter?.affectedObject != null) {
		predicates.push({
			oneofKind: 'affectedObject',
			affectedObject: { objectId: filter.affectedObject },
		});
	}
	if (filter?.function != null) {
		predicates.push({ oneofKind: 'moveCall', moveCall: { function: filter.function } });
	}

	const alternatives: TransactionLiteral['predicate'][][] =
		filter?.affectedAddress != null
			? [
					[
						{
							oneofKind: 'affectedAddress',
							affectedAddress: { address: filter.affectedAddress },
						},
					],
					[{ oneofKind: 'sender', sender: { address: filter.affectedAddress } }],
				]
			: [[]];

	const terms = alternatives
		.map((alternative) => [...predicates, ...alternative])
		.filter((term) => term.length > 0)
		.map((term) => ({ literals: term.map((predicate) => ({ negated: false, predicate })) }));

	return terms.length ? { terms } : undefined;
}

/**
 * Converts a resolved event filter into a single-term gRPC DNF filter (every predicate
 * ANDed), or `undefined` when the filter matches everything.
 */
export function toGrpcEventFilter(
	filter: ResolvedEventFilter | undefined,
): EventFilter | undefined {
	const predicates: EventLiteral['predicate'][] = [];

	if (filter?.sender != null) {
		predicates.push({ oneofKind: 'sender', sender: { address: filter.sender } });
	}
	if (filter?.emitModule != null) {
		predicates.push({ oneofKind: 'emitModule', emitModule: { module: filter.emitModule } });
	}
	if (filter?.eventType != null) {
		predicates.push({ oneofKind: 'eventType', eventType: { eventType: filter.eventType } });
	}

	return predicates.length
		? { terms: [{ literals: predicates.map((predicate) => ({ negated: false, predicate })) }] }
		: undefined;
}
