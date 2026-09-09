// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/utils';
import type { SuiClientTypes } from '../client/types.js';
import {
	createLedgerStream,
	type LedgerStreamAdapter,
	type StreamBound,
} from '../client/stream.js';
import { compareLedgerCursors, decodeLedgerCursor } from '../client/stream-cursor.js';
import { resolveEventFilter, resolveTransactionFilter } from '../client/query-filters.js';
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import type { GraphQLDocument, GraphQLQueryResult, SuiGraphQLClient } from './client.js';
import { SuiGraphQLSubscriptionError } from './subscribe.js';
import { SuiGraphQLRequestError } from './client.js';
import { parseTransaction } from './core.js';
import {
	LedgerStreamStateDocument,
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
		includeTransaction: include?.transaction ?? false,
		includeEffects: include?.effects ?? false,
		includeEvents: include?.events ?? false,
		includeBalanceChanges: include?.balanceChanges ?? false,
		includeObjectTypes: include?.objectTypes ?? false,
		includeBcs: include?.bcs ?? false,
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
	const adapter: LedgerStreamAdapter<Frame> = {
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
		comparePositions: (a, b) => compareLedgerCursors(a.cursor, b.cursor),
		validatePosition(position) {
			const native = decodeLedgerCursor(position.cursor, family);
			scalar(native.checkpoint);
			if (
				position.checkpointBoundary !== undefined &&
				(native.kind !== 'boundary' || position.checkpointBoundary !== native.checkpoint)
			)
				throw new Error('Stream checkpoint boundary does not match its GraphQL cursor');
			for (const key of [
				'checkpoint',
				'transactionIndex',
				'eventIndex',
				'coveredCheckpoint',
			] as const) {
				if (position[key] !== undefined && position[key] !== native[key])
					throw new Error('Stream position metadata does not match its GraphQL cursor');
			}
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
			if (request.order === 'descending' && request.start) {
				const required =
					'checkpoint' in request.start
						? BigInt(request.start.checkpoint)
						: BigInt(decodeLedgerCursor(request.start.position.cursor, family).checkpoint);
				if (required > tip) {
					yield { kind: 'end', complete: false };
					return;
				}
			}
			let lower = 0n;
			let upper = tip + 1n;
			let after: string | undefined;
			let before: string | undefined;
			let target: bigint | undefined;
			const descending = request.order === 'descending';
			const apply = (bound: StreamBound | undefined, start: boolean) => {
				if (!bound) return;
				if ('position' in bound) {
					const cursor = decodeLedgerCursor(bound.position.cursor, family);
					if (start !== descending) {
						after = cursor.cursor;
						// Cursor bounds can retain part of their checkpoint. Only checkpoint
						// item cursors exclude the entire checkpoint at the lower endpoint.
						lower =
							BigInt(cursor.checkpoint) +
							(family === 'checkpoints' && cursor.kind === 'item' ? 1n : 0n);
					} else before = cursor.cursor;
					if (!start && !descending) target = BigInt(cursor.checkpoint);
					if (start && !descending && indexed.first != null && lower < BigInt(indexed.first))
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
			if (descending && indexed.first != null && lower < BigInt(indexed.first))
				throw new Error('Ledger history required for the range has been pruned');
			if (lower >= upper) {
				yield { kind: 'end', complete: target == null || tip >= target };
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
				let previous = descending ? before : after;
				for (const edge of edges) {
					const position = decodeLedgerCursor(edge.cursor, family);
					if (position.kind !== 'item')
						throw new Error('GraphQL ledger edge must carry an item cursor');
					if (
						previous &&
						compareLedgerCursors(previous, edge.cursor) * (descending ? -1 : 1) >= 0
					) {
						// Boundary cursors are inclusive for ascending reads.
						if (!(
							compareLedgerCursors(previous, edge.cursor) === 0 &&
							!descending &&
							decodeLedgerCursor(previous).kind === 'boundary'
						))
							throw new Error('GraphQL ledger items are not ordered');
					}
					previous = edge.cursor;
					yield {
						kind: 'item',
						frame: await mapNode(edge.node, position.checkpoint, request.signal),
						position,
					};
				}
				const more = descending
					? connection.pageInfo.hasPreviousPage
					: connection.pageInfo.hasNextPage;
				const cursor = descending ? connection.pageInfo.startCursor : connection.pageInfo.endCursor;
				// GraphQL conservatively reports hasNextPage at a gRPC CursorBound when a
				// watermark exists. The frontier proves this exact interval is covered;
				// never resume after the excluded endpoint or publish it as progress.
				if (
					cursor &&
					request.end &&
					'position' in request.end &&
					compareLedgerCursors(cursor, request.end.position.cursor) * (descending ? -1 : 1) >= 0
				) {
					yield { kind: 'end', complete: true };
					return;
				}
				if (!more) {
					// Only unbounded polling can advance to a terminal scan boundary. A finite end
					// cursor is an excluded item, not a safe resume-after-that-item position.
					if (!request.end && cursor && !edges.length)
						yield { kind: 'progress', position: decodeLedgerCursor(cursor, family) };
					yield { kind: 'end', complete: target == null || tip >= target };
					return;
				}
				if (!cursor || cursor === (descending ? before : after))
					throw new Error('GraphQL ledger pagination did not advance');
				if (!edges.length) yield { kind: 'progress', position: decodeLedgerCursor(cursor, family) };
				if (descending) before = cursor;
				else after = cursor;
			}
		},
		async *live(request) {
			let after: string | undefined;
			let afterCheckpoint: number | undefined;
			if (request.start && 'position' in request.start) {
				after = decodeLedgerCursor(request.start.position.cursor, family).cursor;
			} else if (request.start) {
				const cp = BigInt(request.start.checkpoint);
				if (cp === 0n) {
					// GraphQL has no afterCheckpoint=-1. Read genesis explicitly, then let the
					// server backfill after checkpoint zero before joining its live stream.
					for await (const event of adapter.scan({ ...request, end: { checkpoint: '1' } })) {
						if (event.kind !== 'end') yield event;
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
			let previous = after;
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
				const position = decodeLedgerCursor(edge.cursor, family);
				if (position.kind !== 'item')
					throw new Error('GraphQL subscription edge must carry an item cursor');
				if (previous && compareLedgerCursors(previous, edge.cursor) >= 0) {
					if (!(
						compareLedgerCursors(previous, edge.cursor) === 0 &&
						decodeLedgerCursor(previous).kind === 'boundary'
					))
						throw new Error('GraphQL subscription items are not ordered');
				}
				previous = edge.cursor;
				yield {
					kind: 'item',
					frame: await mapNode(edge.node, position.checkpoint, request.signal),
					position,
				};
			}
			throw new SuiGraphQLSubscriptionError(
				'GraphQL ledger subscription completed; reconnecting from saved progress',
				{ retryable: true },
			);
		},
	};
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
		// Subscription backfill nodes can omit effects.checkpoint even though their native
		// edge cursor contains the authoritative checkpoint position.
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
