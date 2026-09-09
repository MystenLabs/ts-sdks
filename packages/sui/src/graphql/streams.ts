// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/utils';
import type { SuiClientTypes } from '../client/types.js';
import {
	createLedgerStream,
	type LedgerStreamAdapter,
	type StreamBound,
} from '../client/stream.js';
import type { GraphQLStreamPosition as StreamPosition } from '../client/stream-token.js';
import { resolveEventFilter, resolveTransactionFilter } from '../client/query-filters.js';
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import type { GraphQLDocument, GraphQLQueryResult, SuiGraphQLClient } from './client.js';
import { SuiGraphQLSubscriptionError } from './subscribe.js';
import { SuiGraphQLRequestError } from './client.js';
import { parseTransaction } from './core.js';
import {
	LedgerStreamStateDocument,
	StreamTransactionCheckpointDocument,
	ScanCheckpointsDocument,
	ScanEventsDocument,
	ScanTransactionsDocument,
	SubscribeCheckpointsDocument,
	SubscribeEventsDocument,
	SubscribeTransactionsDocument,
	StreamTransactionDetailsDocument,
	type Stream_CheckpointFragment,
	type Stream_EventFragment,
	type Stream_TransactionFragment,
	type EventFilter,
	type TransactionFilter,
	type CheckpointFilter,
} from './generated/queries.js';

const MAX_CHECKPOINT = BigInt(Number.MAX_SAFE_INTEGER);
type Family = 'checkpoints' | 'transactions' | 'events';
type Frame =
	| SuiClientTypes.StreamCheckpointFrame
	| SuiClientTypes.StreamEventFrame
	| SuiClientTypes.StreamTransactionFrame<SuiClientTypes.StreamTransactionInclude>;
type Node = Stream_CheckpointFragment | Stream_EventFragment | Stream_TransactionFragment;
interface Edge {
	cursor: string;
	node: Node;
}
interface Connection {
	edges: Edge[];
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		startCursor?: string | null;
		endCursor?: string | null;
	};
}
type Options =
	| SuiClientTypes.StreamCheckpointsOptions<SuiClientTypes.StreamInclude>
	| SuiClientTypes.StreamEventsOptions<SuiClientTypes.StreamInclude>
	| SuiClientTypes.StreamTransactionsOptions<SuiClientTypes.StreamTransactionInclude>;

function scalar(value: string): number {
	const number = BigInt(value);
	if (number < 0n || number > MAX_CHECKPOINT)
		throw new Error('GraphQL stream checkpoints must be within the UInt53 range');
	return Number(number);
}

function unwrap<Result>(result: GraphQLQueryResult<Result>): Result {
	if (result.errors?.length) {
		const retryable = result.errors.every((error) =>
			[
				'INTERNAL_SERVER_ERROR',
				'REQUEST_TIMEOUT',
				'RESOURCE_EXHAUSTED',
				'SERVICE_UNAVAILABLE',
			].includes(String(error.extensions?.code)),
		);
		throw new SuiGraphQLSubscriptionError(result.errors.map((error) => error.message).join('\n'), {
			cause: result.errors,
			retryable,
		});
	}
	if (!result.data)
		throw new SuiGraphQLSubscriptionError('GraphQL ledger response is missing data');
	return result.data;
}

export function graphQLLedgerStream(client: SuiGraphQLClient, family: Family, options: Options) {
	let filter: TransactionFilter | EventFilter | CheckpointFilter = {};
	const include = options.include as SuiClientTypes.StreamTransactionInclude | undefined;
	const selections = {
		includeEffects: include?.effects ?? false,
		includeEvents: include?.events ?? false,
		includeBalanceChanges: include?.balanceChanges ?? false,
		includeObjectTypes: include?.objectTypes ?? false,
		includeBcs: !!(include?.transaction || include?.bcs),
	};
	const state = async (signal: AbortSignal) => {
		const data = unwrap(
			await client.query({
				query: LedgerStreamStateDocument,
				variables: { field: family },
				signal,
			}),
		);
		const range = data.serviceConfig.availableRange;
		if (!range.last)
			throw new SuiGraphQLSubscriptionError('GraphQL ledger is not indexed yet', {
				retryable: true,
			});
		return {
			chain: data.chainIdentifier,
			first: range.first?.sequenceNumber,
			tip: range.last.sequenceNumber.toString(),
		};
	};
	const adapter: LedgerStreamAdapter<Frame, StreamPosition> = {
		transport: 'graphql',
		family,
		async initialize(signal) {
			for (const bound of [options.start, options.end])
				if (bound?.checkpoint !== undefined) scalar(bound.checkpoint);
			const input = 'filter' in options ? options.filter : undefined;
			let resolved: unknown;
			if (family === 'transactions' && input) {
				const value = await resolveTransactionFilter(
					client.core.mvr,
					input as SuiClientTypes.TransactionFilter,
					signal,
				);
				resolved = value;
				filter =
					value.$kind === 'sender'
						? { sentAddress: value.sender }
						: {
								function: [value.package, value.module, value.function].filter(Boolean).join('::'),
							};
			} else if (family === 'events' && input) {
				const value = await resolveEventFilter(
					client.core.mvr,
					input as SuiClientTypes.EventFilter,
					signal,
				);
				resolved = value;
				filter =
					value.$kind === 'sender'
						? { sender: value.sender }
						: value.$kind === 'emitModule'
							? { module: `${value.package}::${value.module}` }
							: {
									type:
										value.$kind === 'eventTypeModule'
											? `${value.package}::${value.module}`
											: value.eventType,
								};
			}
			return { chain: (await state(signal)).chain, filter: resolved };
		},
		async getIndexedTip(signal) {
			return (await state(signal)).tip;
		},
		comparePositions(a, b) {
			if (a.cursor === b.cursor) return 0;
			if (a.checkpoint != null && b.checkpoint != null && a.checkpoint !== b.checkpoint)
				return BigInt(a.checkpoint) < BigInt(b.checkpoint) ? -1 : 1;
			return undefined;
		},
		isRetryable: (error) =>
			error instanceof SuiGraphQLSubscriptionError
				? error.retryable
				: error instanceof SuiGraphQLRequestError
					? error.retryable ||
						error.status === 408 ||
						error.status === 429 ||
						(error.status ?? 0) >= 500
					: false,
		async *scan(request) {
			const indexed = await state(request.signal);
			const tip = BigInt(indexed.tip);
			if (request.start && (request.order === 'descending' || 'position' in request.start)) {
				const required =
					'checkpoint' in request.start
						? request.start.checkpoint
						: (request.start.position.checkpoint ?? request.start.position.indexedCheckpoint);
				if (required != null && BigInt(required) > tip) {
					yield { $kind: 'end', complete: false };
					return;
				}
			}
			let lower = 0n;
			let upper = tip + 1n;
			let after: string | undefined;
			let before: string | undefined;
			let target: bigint | undefined;
			const descending = request.order === 'descending';
			const apply = (bound: StreamBound<StreamPosition> | undefined, start: boolean) => {
				if (!bound) return;
				if ('position' in bound) {
					const position = bound.position;
					if (start !== descending) {
						after = position.cursor;
						if (position.checkpoint != null)
							lower = BigInt(position.checkpoint) + (family === 'checkpoints' ? 1n : 0n);
					} else before = position.cursor;
					if (!start && !descending) {
						const horizon = position.checkpoint ?? position.indexedCheckpoint;
						if (horizon != null) target = BigInt(horizon);
					}
					if (
						start &&
						!descending &&
						position.checkpoint != null &&
						indexed.first != null &&
						lower < BigInt(indexed.first)
					)
						throw new Error('Ledger history required for resumption has been pruned');
				} else {
					const cp = BigInt(bound.checkpoint);
					// Captured tip + 1 is an internal exclusive sentinel, never a wire UInt53.
					if (cp > MAX_CHECKPOINT + 1n) throw new Error('GraphQL checkpoint bound exceeds UInt53');
					if (start !== descending) lower = cp + (descending ? 1n : 0n);
					else upper = upper < cp + (descending ? 1n : 0n) ? upper : cp + (descending ? 1n : 0n);
					if (!start && !descending) target = cp - 1n;
					if (start && !descending && indexed.first != null && cp < BigInt(indexed.first))
						throw new Error('Ledger history required for resumption has been pruned');
				}
			};
			apply(request.start, true);
			apply(request.end, false);
			if (
				descending &&
				!(request.end && 'position' in request.end && request.end.position.checkpoint == null) &&
				indexed.first != null &&
				lower < BigInt(indexed.first)
			)
				throw new Error('Ledger history required for the range has been pruned');
			if (lower >= upper) {
				yield { $kind: 'end', complete: target == null || tip >= target };
				return;
			}
			const boundedFilter = {
				...filter,
				afterCheckpoint: lower > 0n ? scalar((lower - 1n).toString()) : undefined,
				beforeCheckpoint: upper <= MAX_CHECKPOINT ? scalar(upper.toString()) : undefined,
			};
			const document =
				family === 'checkpoints'
					? ScanCheckpointsDocument
					: family === 'events'
						? ScanEventsDocument
						: ScanTransactionsDocument;
			let lastItemCursor =
				request.start && 'position' in request.start ? request.start.position.cursor : undefined;
			for (;;) {
				const data = unwrap(
					await client.query({
						query: document as GraphQLDocument<Record<Family, Connection>>,
						variables: {
							filter: boundedFilter,
							first: descending ? undefined : 50,
							last: descending ? 50 : undefined,
							after,
							before,
							...selections,
						},
						signal: request.signal,
					}),
				);
				request.onStatus({ $kind: 'Connected' });
				const connection = data[family];
				if (!connection)
					throw new SuiGraphQLSubscriptionError('GraphQL ledger connection is missing');
				const edges = descending ? [...connection.edges].reverse() : connection.edges;
				for (const edge of edges) {
					lastItemCursor = edge.cursor;
					const checkpoint = await nodeCheckpoint(edge.node, request.signal);
					const position: StreamPosition = {
						cursor: edge.cursor,
						checkpoint,
						itemId: nodeIdentity(edge.node),
						indexedCheckpoint: null,
					};
					yield {
						$kind: 'item',
						frame: await mapNode(edge.node, checkpoint, request.signal),
						position,
					};
				}
				const more = descending
					? connection.pageInfo.hasPreviousPage
					: connection.pageInfo.hasNextPage;
				const cursor = descending ? connection.pageInfo.startCursor : connection.pageInfo.endCursor;
				// A returned endpoint cursor completes the exclusive interval. Keep the
				// last delivered position so resuming does not skip the excluded item.
				if (
					cursor &&
					request.end &&
					'position' in request.end &&
					cursor === request.end.position.cursor
				) {
					yield { $kind: 'end', complete: true };
					return;
				}
				if (!more) {
					// Only unbounded polling can advance to a terminal scan boundary. A finite end
					// cursor is an excluded item, not a safe resume-after-that-item position.
					if (!request.end && cursor && !edges.length)
						yield {
							$kind: 'progress',
							position: {
								cursor,
								checkpoint: null,
								itemId: null,
								indexedCheckpoint: (upper - 1n).toString(),
							},
						};
					yield { $kind: 'end', complete: target == null || tip >= target };
					return;
				}
				if (!cursor || cursor === (descending ? before : after)) {
					// Some servers return a different opaque cursor for the excluded endpoint
					// and keep hasNextPage/hasPreviousPage set. Read from the last item without
					// the endpoint bound; the next item's public identity can establish completion.
					const endpoint =
						request.end && 'position' in request.end ? request.end.position : undefined;
					if (cursor && !edges.length && endpoint?.itemId) {
						let probeCursor = lastItemCursor;
						for (;;) {
							const probe = unwrap(
								await client.query({
									query: document as GraphQLDocument<Record<Family, Connection>>,
									variables: {
										filter: {
											...boundedFilter,
											...(descending ? { afterCheckpoint: undefined } : {}),
										},
										first: descending ? undefined : 1,
										last: descending ? 1 : undefined,
										after: descending ? undefined : probeCursor,
										before: descending ? probeCursor : undefined,
										...selections,
									},
									signal: request.signal,
								}),
							)[family];
							const next = descending ? probe?.edges.at(-1) : probe?.edges[0];
							if (next) {
								if (nodeIdentity(next.node) === endpoint.itemId) {
									yield { $kind: 'end', complete: true };
									return;
								}
								break;
							}
							const more = descending
								? probe?.pageInfo.hasPreviousPage
								: probe?.pageInfo.hasNextPage;
							const nextCursor = descending
								? probe?.pageInfo.startCursor
								: probe?.pageInfo.endCursor;
							if (!more || !nextCursor || nextCursor === probeCursor) break;
							probeCursor = nextCursor;
						}
					}
					throw new Error('GraphQL ledger pagination did not advance');
				}
				if (!edges.length && !request.end)
					yield {
						$kind: 'progress',
						position: {
							cursor,
							checkpoint: null,
							itemId: null,
							indexedCheckpoint: (upper - 1n).toString(),
						},
					};
				if (descending) before = cursor;
				else after = cursor;
			}
		},
		async *live(request) {
			let after: string | undefined;
			let afterCheckpoint: number | undefined;
			if (request.start && 'position' in request.start) {
				after = request.start.position.cursor;
			} else if (request.start) {
				const cp = BigInt(request.start.checkpoint);
				if (cp === 0n) {
					// GraphQL has no afterCheckpoint=-1. Read genesis explicitly, then let the
					// server backfill after checkpoint zero before joining its live stream.
					for await (const event of adapter.scan({ ...request, end: { checkpoint: '1' } })) {
						if (event.$kind !== 'end') yield event;
					}
					afterCheckpoint = 0;
				} else afterCheckpoint = scalar((cp - 1n).toString());
			}
			const document =
				family === 'checkpoints'
					? SubscribeCheckpointsDocument
					: family === 'events'
						? SubscribeEventsDocument
						: SubscribeTransactionsDocument;
			let connected = false;
			for await (const result of client.subscribe({
				query: document as GraphQLDocument<Record<Family, Edge>>,
				variables: {
					after,
					afterCheckpoint,
					filter: { ...filter, afterCheckpoint },
					...selections,
				},
				signal: request.signal,
			})) {
				if (!connected) {
					request.onStatus({ $kind: 'Connected' });
					connected = true;
				}
				const edge = unwrap(result)[family];
				if (!edge)
					throw new SuiGraphQLSubscriptionError('GraphQL ledger subscription edge is missing');
				const checkpoint = await nodeCheckpoint(edge.node, request.signal);
				const position: StreamPosition = {
					cursor: edge.cursor,
					checkpoint,
					itemId: nodeIdentity(edge.node),
					indexedCheckpoint: null,
				};
				yield {
					$kind: 'item',
					frame: await mapNode(edge.node, checkpoint, request.signal),
					position,
				};
			}
			throw new SuiGraphQLSubscriptionError(
				'GraphQL ledger subscription completed; reconnecting from saved progress',
				{ retryable: true },
			);
		},
	};
	function nodeIdentity(node: Node): string {
		if (family === 'checkpoints')
			return (node as Stream_CheckpointFragment).sequenceNumber.toString();
		if (family === 'events') {
			const event = node as Stream_EventFragment;
			if (!event.transaction?.digest)
				throw new Error('GraphQL event is missing its transaction digest');
			return `${event.transaction.digest}:${event.sequenceNumber}`;
		}
		const digest = (node as Stream_TransactionFragment).digest;
		if (!digest) throw new Error('GraphQL transaction is missing its digest');
		return digest;
	}
	async function nodeCheckpoint(node: Node, signal: AbortSignal): Promise<string> {
		if (family === 'checkpoints')
			return (node as Stream_CheckpointFragment).sequenceNumber.toString();
		const transaction =
			family === 'events'
				? (node as Stream_EventFragment).transaction
				: (node as Stream_TransactionFragment);
		const checkpoint = transaction?.effects?.checkpoint?.sequenceNumber;
		if (checkpoint != null) return checkpoint.toString();
		if (!transaction?.digest) throw new Error('GraphQL transaction is missing its digest');
		const indexed = unwrap(
			await client.query({
				query: StreamTransactionCheckpointDocument,
				variables: { digest: transaction.digest },
				signal,
			}),
		).transaction?.effects?.checkpoint?.sequenceNumber;
		if (indexed == null)
			throw new SuiGraphQLSubscriptionError(
				'Transaction checkpoint has not reached the GraphQL index',
				{ retryable: true },
			);
		return indexed.toString();
	}
	async function mapNode(node: Node, checkpoint: string, signal: AbortSignal): Promise<Frame> {
		if (family === 'checkpoints') {
			const value = node as Stream_CheckpointFragment;
			const timestampMs = value.timestamp == null ? NaN : Date.parse(value.timestamp);
			if (!value.digest || value.epoch?.epochId == null || !Number.isFinite(timestampMs))
				throw new Error('GraphQL checkpoint is missing required header fields');
			return {
				$kind: 'Checkpoint',
				checkpoint: {
					sequenceNumber: value.sequenceNumber.toString(),
					digest: value.digest,
					epoch: value.epoch.epochId.toString(),
					timestamp: timestampMs.toString(),
				},
				resumeToken: '',
			};
		}
		if (family === 'events') {
			const value = node as Stream_EventFragment;
			if (
				!value.transactionModule?.package?.address ||
				!value.transactionModule.name ||
				!value.sender?.address ||
				!value.contents?.type?.repr ||
				!value.transaction?.digest
			)
				throw new Error('GraphQL event is missing required fields');
			return {
				$kind: 'Event',
				event: {
					packageId: normalizeSuiAddress(value.transactionModule.package.address),
					module: value.transactionModule.name,
					sender: normalizeSuiAddress(value.sender.address),
					eventType: normalizeStructTag(value.contents.type.repr),
					bcs: value.contents.bcs ? fromBase64(value.contents.bcs) : new Uint8Array(),
					json: (value.contents.json as Record<string, unknown>) ?? null,
					checkpoint:
						value.transaction.effects?.checkpoint?.sequenceNumber?.toString() ?? checkpoint,
					transactionDigest: value.transaction.digest,
					eventIndex: value.sequenceNumber,
				},
				resumeToken: '',
			};
		}
		const source = node as Stream_TransactionFragment;
		// Subscription nodes may need a separate indexed lookup for their checkpoint.
		const value = {
			...source,
			effects: source.effects && {
				...source.effects,
				checkpoint: source.effects.checkpoint ?? { sequenceNumber: scalar(checkpoint) },
			},
		};
		if (!value.digest || !value.effects?.status || value.effects.checkpoint?.sequenceNumber == null)
			throw new Error('GraphQL transaction is missing required fields');
		let events = value.effects.events;
		let objects = value.effects.objectChanges;
		while (events?.pageInfo.hasNextPage || objects?.pageInfo.hasNextPage) {
			const wantEvents = events?.pageInfo.hasNextPage ?? false;
			const wantObjects = objects?.pageInfo.hasNextPage ?? false;
			if (
				(wantEvents && !events?.pageInfo.endCursor) ||
				(wantObjects && !objects?.pageInfo.endCursor)
			)
				throw new Error('GraphQL transaction details have no continuation cursor');
			const next = unwrap(
				await client.query({
					query: StreamTransactionDetailsDocument,
					variables: {
						digest: value.digest,
						eventsAfter: events?.pageInfo.endCursor,
						objectsAfter: objects?.pageInfo.endCursor,
						events: wantEvents,
						objects: wantObjects,
					},
					signal,
				}),
			).transaction?.effects;
			if (!next)
				throw new SuiGraphQLSubscriptionError(
					'Transaction details have not reached the GraphQL index',
					{ retryable: true },
				);
			if (wantEvents) {
				if (
					!next.events ||
					(next.events.pageInfo.hasNextPage &&
						next.events.pageInfo.endCursor === events!.pageInfo.endCursor)
				)
					throw new Error('GraphQL event pagination did not advance');
				events = { ...next.events, nodes: [...events!.nodes, ...next.events.nodes] };
			}
			if (wantObjects) {
				if (
					!next.objectChanges ||
					(next.objectChanges.pageInfo.hasNextPage &&
						next.objectChanges.pageInfo.endCursor === objects!.pageInfo.endCursor)
				)
					throw new Error('GraphQL object-change pagination did not advance');
				objects = {
					...next.objectChanges,
					nodes: [...objects!.nodes, ...next.objectChanges.nodes],
				};
			}
		}
		return {
			$kind: 'Transaction',
			transaction: parseTransaction(
				{ ...value, effects: { ...value.effects, events, objectChanges: objects } },
				include,
			),
			resumeToken: '',
		};
	}
	return createLedgerStream(options, adapter);
}
