// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedEventFilter, ResolvedTransactionFilter } from '../client/query-filters.js';
import type { EventFilter, TransactionFilter } from './proto/sui/rpc/v2/filter.js';

export function toGrpcTransactionFilter(filter: ResolvedTransactionFilter): TransactionFilter {
	return {
		terms: [
			{
				literals: [
					filter.$kind === 'sender'
						? {
								negated: false,
								predicate: { oneofKind: 'sender', sender: { address: filter.sender } },
							}
						: {
								negated: false,
								predicate: {
									oneofKind: 'moveCall',
									moveCall: {
										function: [filter.package, filter.module, filter.function]
											.filter(Boolean)
											.join('::'),
									},
								},
							},
				],
			},
		],
	};
}

export function toGrpcEventFilter(filter: ResolvedEventFilter): EventFilter {
	return {
		terms: [
			{
				literals: [
					filter.$kind === 'sender'
						? {
								negated: false,
								predicate: { oneofKind: 'sender', sender: { address: filter.sender } },
							}
						: filter.$kind === 'emitModule'
							? {
									negated: false,
									predicate: {
										oneofKind: 'emitModule',
										emitModule: { module: `${filter.package}::${filter.module}` },
									},
								}
							: {
									negated: false,
									predicate: {
										oneofKind: 'eventType',
										eventType: {
											eventType:
												filter.$kind === 'eventTypeModule'
													? `${filter.package}::${filter.module}`
													: filter.eventType,
										},
									},
								},
				],
			},
		],
	};
}
