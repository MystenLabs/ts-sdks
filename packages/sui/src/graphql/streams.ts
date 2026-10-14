// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../client/types.js';
import {
	createLedgerStream,
	type LedgerStreamAdapter,
	type StreamBound,
} from '../client/stream.js';
import type { GraphQLStreamPosition as StreamPosition } from '../client/stream-token.js';
import {
	resolveEventFilter,
	resolveTransactionFilter,
	type ResolvedCheckpointRange,
	type ResolvedEventFilter,
	type ResolvedTransactionFilter,
} from '../client/query-filters.js';
import type { GraphQLDocument, GraphQLQueryResult, SuiGraphQLClient } from './client.js';
import { SuiGraphQLSubscriptionError } from './subscribe.js';
import { SuiGraphQLRequestError } from './client.js';
import { parseGraphQLCheckpoint, parseGraphQLEvent, parseTransaction } from './core.js';
import {
	toGraphQLCheckpointBounds,
	toGraphQLEventFilter,
	toGraphQLTransactionFilter,
} from './filters.js';
import {
	LedgerStreamStateDocument,
	ScanCheckpointsDocument,
	ScanEventsDocument,
	ScanTransactionsDocument,
	SubscribeCheckpointsDocument,
	SubscribeEventsDocument,
	SubscribeTransactionsDocument,
	StreamTransactionCheckpointsDocument,
	StreamTransactionDetailsDocument,
	type Checkpoint_FieldsFragment,
	type Event_FieldsFragment,
	type Transaction_FieldsFragment,
} from './generated/queries.js';

const MAX_CHECKPOINT = BigInt(Number.MAX_SAFE_INTEGER);
type Family = 'checkpoints' | 'transactions' | 'events';
type Frame =
	| SuiClientTypes.StreamCheckpointFrame
	| SuiClientTypes.StreamEventFrame
	| SuiClientTypes.StreamTransactionFrame<SuiClientTypes.StreamTransactionInclude>;
type Node = Checkpoint_FieldsFragment | Event_FieldsFragment | Transaction_FieldsFragment;
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

export class SuiGraphQLStreamError extends Error {
	readonly retryable: boolean;

	constructor(message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
		super(message, { cause: options.cause });
		this.name = 'SuiGraphQLStreamError';
		this.retryable = options.retryable ?? false;
	}
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
		throw new SuiGraphQLStreamError(result.errors.map((error) => error.message).join('\n'), {
			cause: result.errors,
			retryable,
		});
	}
	if (!result.data) throw new SuiGraphQLStreamError('GraphQL ledger response is missing data');
	return result.data;
}

export function graphQLLedgerStream(client: SuiGraphQLClient, family: Family, options: Options) {
	let resolvedFilter: ResolvedTransactionFilter | ResolvedEventFilter | undefined;
	const graphQLFilter = (range: ResolvedCheckpointRange) =>
		family === 'transactions'
			? toGraphQLTransactionFilter(resolvedFilter as ResolvedTransactionFilter | undefined, range)
			: family === 'events'
				? toGraphQLEventFilter(resolvedFilter as ResolvedEventFilter | undefined, range)
				: toGraphQLCheckpointBounds(range);
	const include = options.include as SuiClientTypes.StreamTransactionInclude | undefined;
	const selections = {
		includeEffects: include?.effects ?? false,
		includeEvents: include?.events ?? false,
		includeBalanceChanges: include?.balanceChanges ?? false,
		includeObjectTypes: include?.objectTypes ?? false,
		includeEffectsJson: !!(include?.effects || include?.objectTypes),
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
			throw new SuiGraphQLStreamError(
				'No indexed checkpoint is available for this GraphQL ledger stream',
				{
					retryable: true,
				},
			);
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
			const input = 'filter' in options ? options.filter : undefined;
			if (family === 'transactions' && input) {
				resolvedFilter = await resolveTransactionFilter(
					client.core.mvr,
					input as SuiClientTypes.TransactionFilter,
					signal,
				);
			} else if (family === 'events' && input) {
				resolvedFilter = await resolveEventFilter(
					client.core.mvr,
					input as SuiClientTypes.EventFilter,
					signal,
				);
			}
			return { chain: (await state(signal)).chain, filter: resolvedFilter };
		},
		async getIndexedTip(signal) {
			return (await state(signal)).tip;
		},
		samePosition: (a, b) =>
			a === b ||
			(a.cursor === b.cursor &&
				a.checkpoint === b.checkpoint &&
				a.itemId === b.itemId &&
				a.indexedCheckpoint === b.indexedCheckpoint),
		getPositionCheckpoint: (position) => ({
			checkpoint: position.checkpoint,
			boundary: false,
		}),
		comparePositions(a, b) {
			if (a.cursor === b.cursor) return 0;
			if (a.checkpoint != null && b.checkpoint != null && a.checkpoint !== b.checkpoint)
				return BigInt(a.checkpoint) < BigInt(b.checkpoint) ? -1 : 1;
			return undefined;
		},
		isRetryable: (error) =>
			error instanceof SuiGraphQLStreamError || error instanceof SuiGraphQLSubscriptionError
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
			// The server returns an empty page when a checkpoint cursor is combined with an
			// afterCheckpoint bound naming the same checkpoint, so the bound stays one behind.
			const boundedFilter = graphQLFilter({
				start: family === 'checkpoints' && after ? lower - 1n : lower,
				end: upper <= MAX_CHECKPOINT ? upper : undefined,
			});
			const document =
				family === 'checkpoints'
					? ScanCheckpointsDocument
					: family === 'events'
						? ScanEventsDocument
						: ScanTransactionsDocument;
			let lastItemCursor =
				request.start && 'position' in request.start ? request.start.position.cursor : undefined;
			let connected = false;
			while (true) {
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
				if (!connected) {
					request.onStatus({ $kind: 'Connected' });
					connected = true;
				}
				const connection = data[family];
				if (!connection) throw new SuiGraphQLStreamError('GraphQL ledger connection is missing');
				const edges = descending ? [...connection.edges].reverse() : connection.edges;
				const checkpoints = await nodeCheckpoints(
					edges.map((edge) => edge.node),
					request.signal,
				);
				for (const [i, edge] of edges.entries()) {
					lastItemCursor = edge.cursor;
					const checkpoint = checkpoints[i];
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
						while (true) {
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
			let start: bigint | undefined;
			let last: string | null | undefined;
			let lastPosition: StreamPosition | undefined;
			if (request.start && 'position' in request.start) {
				after = request.start.position.cursor;
				lastPosition = request.start.position;
				last = request.start.position.checkpoint;
			} else if (request.start) {
				start = BigInt(request.start.checkpoint);
				if (start === 0n) {
					// GraphQL has no afterCheckpoint=-1. Read genesis explicitly, then let the
					// server backfill after checkpoint zero before joining its live stream.
					for await (const event of adapter.scan({ ...request, end: { checkpoint: '1' } })) {
						if (event.$kind !== 'end') yield event;
					}
					start = 1n;
				}
			}
			const document =
				family === 'checkpoints'
					? SubscribeCheckpointsDocument
					: family === 'events'
						? SubscribeEventsDocument
						: SubscribeTransactionsDocument;
			let connected = false;
			let live = !request.start;
			const indexedTip = live ? undefined : BigInt(await adapter.getIndexedTip(request.signal));
			for await (const result of client.subscribe({
				query: document as GraphQLDocument<Record<Family, Edge>>,
				variables: {
					after,
					afterCheckpoint: toGraphQLCheckpointBounds({ start }).afterCheckpoint,
					filter: graphQLFilter({ start }),
					...selections,
				},
				signal: request.signal,
			})) {
				if (!connected) {
					request.onStatus({ $kind: 'Connected' });
					if (live) request.onStatus({ $kind: 'Live' });
					connected = true;
				}
				const edge = unwrap(result)[family];
				if (!edge) throw new SuiGraphQLStreamError('GraphQL ledger subscription edge is missing');
				const [checkpoint] = await nodeCheckpoints([edge.node], request.signal);
				if (!live && checkpoint != null && BigInt(checkpoint) >= indexedTip!) {
					live = true;
					request.onStatus({ $kind: 'Live' });
				}
				if (family === 'checkpoints' && checkpoint != null) {
					// The subscription can skip checkpoints at its backfill-to-live handoff; read them.
					const expected = last != null ? BigInt(last) + 1n : start;
					if (expected != null && BigInt(checkpoint) > expected) {
						for await (const event of adapter.scan({
							...request,
							start:
								last != null && lastPosition
									? { position: lastPosition }
									: { checkpoint: expected.toString() },
							end: { checkpoint },
						})) {
							if (event.$kind === 'item' || event.$kind === 'progress') {
								if (event.$kind === 'item') lastPosition = event.position;
								yield event;
							}
						}
					}
					last = checkpoint;
				}
				const position: StreamPosition = {
					cursor: edge.cursor,
					checkpoint,
					itemId: nodeIdentity(edge.node),
					indexedCheckpoint: null,
				};
				lastPosition = position;
				yield {
					$kind: 'item',
					frame: await mapNode(edge.node, checkpoint, request.signal),
					position,
				};
			}
			throw new SuiGraphQLStreamError(
				'GraphQL ledger subscription completed; reconnecting from saved progress',
				{ retryable: true },
			);
		},
	};
	function nodeIdentity(node: Node): string {
		if (family === 'checkpoints')
			return (node as Checkpoint_FieldsFragment).sequenceNumber.toString();
		if (family === 'events') {
			const event = node as Event_FieldsFragment;
			if (!event.transaction?.digest)
				throw new Error('GraphQL event is missing its transaction digest');
			return `${event.transaction.digest}:${event.sequenceNumber}`;
		}
		const digest = (node as Transaction_FieldsFragment).digest;
		if (!digest) throw new Error('GraphQL transaction is missing its digest');
		return digest;
	}
	async function nodeCheckpoints(nodes: Node[], signal: AbortSignal): Promise<string[]> {
		if (family === 'checkpoints')
			return nodes.map((node) => (node as Checkpoint_FieldsFragment).sequenceNumber.toString());
		const entries = nodes.map((node): { checkpoint: string } | { digest: string } => {
			const transaction =
				family === 'events'
					? (node as Event_FieldsFragment).transaction
					: (node as Transaction_FieldsFragment);
			const checkpoint = transaction?.effects?.checkpoint?.sequenceNumber;
			if (checkpoint != null) return { checkpoint: String(checkpoint) };
			if (!transaction?.digest) throw new Error('GraphQL transaction is missing its digest');
			return { digest: transaction.digest };
		});
		// Live subscription nodes can arrive before the index assigns their checkpoint, so only
		// those are looked up by digest, in one request per batch.
		const missing = [
			...new Set(entries.flatMap((entry) => ('digest' in entry ? [entry.digest] : []))),
		];
		const resolved = new Map<string, string>();
		if (missing.length > 0) {
			const { multiGetTransactionEffects: effects } = unwrap(
				await client.query({
					query: StreamTransactionCheckpointsDocument,
					variables: { digests: missing },
					signal,
				}),
			);
			missing.forEach((digest, i) => {
				const checkpoint = effects[i]?.checkpoint?.sequenceNumber;
				if (checkpoint != null) resolved.set(digest, String(checkpoint));
			});
		}
		return entries.map((entry) => {
			const checkpoint = 'digest' in entry ? resolved.get(entry.digest) : entry.checkpoint;
			if (checkpoint != null) return checkpoint;
			throw new SuiGraphQLStreamError('Transaction checkpoint has not reached the GraphQL index', {
				retryable: true,
			});
		});
	}
	async function mapNode(node: Node, checkpoint: string, signal: AbortSignal): Promise<Frame> {
		if (family === 'checkpoints') {
			return {
				$kind: 'Checkpoint',
				checkpoint: parseGraphQLCheckpoint(node as Checkpoint_FieldsFragment, 'Checkpoint stream'),
				resumeToken: '',
			};
		}
		if (family === 'events') {
			return {
				$kind: 'Event',
				event: parseGraphQLEvent(node as Event_FieldsFragment, checkpoint, 'Event stream'),
				resumeToken: '',
			};
		}
		const source = node as Transaction_FieldsFragment;
		// Subscription nodes may need a separate indexed lookup for their checkpoint.
		const value = {
			...source,
			effects: source.effects && {
				...source.effects,
				checkpoint: source.effects.checkpoint ?? { sequenceNumber: Number(checkpoint) },
			},
		};
		if (!value.digest || !value.effects?.status || value.effects.checkpoint?.sequenceNumber == null)
			throw new Error('GraphQL transaction is missing required fields');
		let events = value.effects.events && {
			...value.effects.events,
			nodes: [...value.effects.events.nodes],
		};
		let objects = value.effects.objectChanges && {
			...value.effects.objectChanges,
			nodes: [...value.effects.objectChanges.nodes],
		};
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
				throw new SuiGraphQLStreamError('Transaction details have not reached the GraphQL index', {
					retryable: true,
				});
			if (wantEvents) {
				if (
					!next.events ||
					(next.events.pageInfo.hasNextPage &&
						next.events.pageInfo.endCursor === events!.pageInfo.endCursor)
				)
					throw new Error('GraphQL event pagination did not advance');
				events!.nodes.push(...next.events.nodes);
				events!.pageInfo = next.events.pageInfo;
			}
			if (wantObjects) {
				if (
					!next.objectChanges ||
					(next.objectChanges.pageInfo.hasNextPage &&
						next.objectChanges.pageInfo.endCursor === objects!.pageInfo.endCursor)
				)
					throw new Error('GraphQL object-change pagination did not advance');
				objects!.nodes.push(...next.objectChanges.nodes);
				objects!.pageInfo = next.objectChanges.pageInfo;
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
