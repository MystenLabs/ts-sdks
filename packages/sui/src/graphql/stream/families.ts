// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerStreamRequest } from '../../client/core.js';
import {
	resolveEventFilter,
	resolveTransactionFilter,
	type ResolvedCheckpointRange,
	type ResolvedEventFilter,
	type ResolvedTransactionFilter,
} from '../../client/query-filters.js';
import type { ItemFrame, PositionEvent, StreamFamily } from '../../client/stream/adapter.js';
import { SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { GraphQLQueryResult, SuiGraphQLClient } from '../client.js';
import {
	parseGraphQLCheckpoint,
	parseGraphQLEvent,
	parseTransaction,
	transactionIncludeVariables,
} from '../core.js';
import {
	toGraphQLCheckpointBounds,
	toGraphQLEventFilter,
	toGraphQLTransactionFilter,
} from '../filters.js';
import {
	ScanCheckpointsDocument,
	ScanEventsDocument,
	ScanTransactionsDocument,
	StreamTransactionCheckpointsDocument,
	SubscribeCheckpointsDocument,
	SubscribeEventsDocument,
	SubscribeTransactionsDocument,
	type Checkpoint_FieldsFragment,
	type Event_FieldsFragment,
	type Transaction_FieldsFragment,
} from '../generated/queries.js';
import { itemPosition, type GraphQLPosition } from './position.js';
import { notIndexedYet, queryData, unwrap } from './query.js';

export interface Edge<Node> {
	cursor: string;
	node: Node;
}

export interface Connection<Node> {
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		startCursor: string | null;
		endCursor: string | null;
	};
	edges: Edge<Node>[];
}

/** A history page and the checkpoint the server read it at, when it reports one. */
export interface Page<Node> extends Connection<Node> {
	viewedAt: bigint | null;
}

/** A delivered node and its checkpoint, which live nodes may need looked up. */
export interface LedgerItem<Node> {
	node: Node;
	checkpoint: bigint;
}

export interface PageRequest {
	/** Checkpoint bounds for the filter; cursors page within them. */
	range: ResolvedCheckpointRange;
	first?: number;
	last?: number;
	after?: string;
	before?: string;
	signal: AbortSignal;
}

/**
 * Everything that differs between checkpoint, transaction and event streams. Each family reads
 * with the same fragment and mapper as its list method, so streamed items match list results,
 * including the first-50 limit on a transaction's nested events and object changes.
 */
export interface LedgerFamily<Node> {
	readonly name: StreamFamily;
	/**
	 * One item per checkpoint (checkpoints): an item covers its own checkpoint, and the unfiltered
	 * live feed must not skip any.
	 */
	readonly onePerCheckpoint: boolean;
	/** Resolves names in the caller's filter, once, before any page or subscription. */
	resolveFilter(signal: AbortSignal): Promise<unknown>;
	/** The GraphQL filter fields page queries set, which choose the indexes (and retention). */
	filterFields(): string[];
	/** One page. A response without a well-formed connection throws `SuiStreamError('Protocol')`. */
	page(request: PageRequest): Promise<Page<Node>>;
	/** Live edges from now on; never resumed with `after`. `onOpen` runs once the server accepts. */
	subscribe(signal: AbortSignal, onOpen: () => void): AsyncIterable<Edge<Node>>;
	/** Public identity: compared with an excluded end item's `itemId`. */
	identity(node: Node): string;
	/** The node's checkpoint, or its transaction digest when the index has not assigned one yet. */
	checkpoint(node: Node): bigint | { digest: string };
	map(item: LedgerItem<Node>): Omit<ItemFrame, 'resumeToken'>;
}

type TransactionsRequest = Extract<LedgerStreamRequest, { family: 'transactions' }>;
type EventsRequest = Extract<LedgerStreamRequest, { family: 'events' }>;

export function ledgerFamily(
	client: SuiGraphQLClient,
	mvr: SuiClientTypes.MvrMethods,
	request: LedgerStreamRequest,
): LedgerFamily<any> {
	switch (request.family) {
		case 'checkpoints':
			return checkpointsFamily(client);
		case 'transactions':
			return transactionsFamily(client, mvr, request);
		case 'events':
			return eventsFamily(client, mvr, request);
	}
}

function checkpointsFamily(client: SuiGraphQLClient): LedgerFamily<Checkpoint_FieldsFragment> {
	return {
		name: 'checkpoints',
		onePerCheckpoint: true,
		resolveFilter: async () => undefined,
		filterFields: () => [],
		page: async ({ range, signal, ...cursors }) =>
			scanPage(
				'checkpoints',
				await queryData(client, {
					query: ScanCheckpointsDocument,
					variables: { filter: toGraphQLCheckpointBounds(range), ...cursors },
					signal,
				}),
				(data) => data.checkpoints,
			),
		subscribe: (signal, onOpen) =>
			edges(
				client.subscribe({ query: SubscribeCheckpointsDocument, signal, onOpen }),
				(data) => data.checkpoints,
			),
		identity: (node) => String(node.sequenceNumber),
		checkpoint: (node) => BigInt(node.sequenceNumber),
		map: ({ node }) => ({
			$kind: 'Checkpoint',
			checkpoint: parseGraphQLCheckpoint(node, 'Checkpoint stream'),
		}),
	};
}

function transactionsFamily(
	client: SuiGraphQLClient,
	mvr: SuiClientTypes.MvrMethods,
	{ options }: TransactionsRequest,
): LedgerFamily<Transaction_FieldsFragment> {
	const selection = transactionIncludeVariables(options.include);
	let filter: ResolvedTransactionFilter | undefined;
	return {
		name: 'transactions',
		onePerCheckpoint: false,
		async resolveFilter(signal) {
			filter = options.filter && (await resolveTransactionFilter(mvr, options.filter, signal));
			return filter;
		},
		filterFields: () => setFields(toGraphQLTransactionFilter(filter, {})),
		page: async ({ range, signal, ...cursors }) =>
			scanPage(
				'transactions',
				await queryData(client, {
					query: ScanTransactionsDocument,
					variables: {
						filter: toGraphQLTransactionFilter(filter, range),
						...cursors,
						...selection,
					},
					signal,
				}),
				(data) => data.transactions,
			),
		subscribe: (signal, onOpen) =>
			edges(
				client.subscribe({
					query: SubscribeTransactionsDocument,
					variables: { filter: toGraphQLTransactionFilter(filter, {}), ...selection },
					signal,
					onOpen,
				}),
				(data) => data.transactions,
			),
		identity: (node) => node.digest,
		checkpoint: (node) => checkpointOrDigest(node.effects?.checkpoint, node.digest),
		map: ({ node, checkpoint }) => {
			if (!node.effects?.status) {
				throw new SuiStreamError('Protocol', `Transaction ${node.digest} has no effects`);
			}
			// A live node may carry its checkpoint only through the lookup.
			const effects = { ...node.effects, checkpoint: { sequenceNumber: Number(checkpoint) } };
			return {
				$kind: 'Transaction',
				transaction: parseTransaction({ ...node, effects }, options.include),
			};
		},
	};
}

function eventsFamily(
	client: SuiGraphQLClient,
	mvr: SuiClientTypes.MvrMethods,
	{ options }: EventsRequest,
): LedgerFamily<Event_FieldsFragment> {
	let filter: ResolvedEventFilter | undefined;
	return {
		name: 'events',
		onePerCheckpoint: false,
		async resolveFilter(signal) {
			filter = options.filter && (await resolveEventFilter(mvr, options.filter, signal));
			return filter;
		},
		filterFields: () => setFields(toGraphQLEventFilter(filter, {})),
		page: async ({ range, signal, ...cursors }) =>
			scanPage(
				'events',
				await queryData(client, {
					query: ScanEventsDocument,
					variables: { filter: toGraphQLEventFilter(filter, range), ...cursors },
					signal,
				}),
				(data) => data.events,
			),
		subscribe: (signal, onOpen) =>
			edges(
				client.subscribe({
					query: SubscribeEventsDocument,
					variables: { filter: toGraphQLEventFilter(filter, {}) },
					signal,
					onOpen,
				}),
				(data) => data.events,
			),
		identity: (node) => `${eventDigest(node)}:${node.sequenceNumber}`,
		checkpoint: (node) =>
			checkpointOrDigest(node.transaction?.effects?.checkpoint, eventDigest(node)),
		map: ({ node, checkpoint }) => ({
			$kind: 'Event',
			event: parseGraphQLEvent(node, checkpoint.toString(), 'Event stream'),
		}),
	};
}

function setFields(filter: object): string[] {
	return Object.entries(filter)
		.filter(([, value]) => value != null)
		.map(([key]) => key);
}

/**
 * Item events for `edges`, in order. Checkpoints the index has not assigned yet are looked up in
 * one request; a node still without one is retried later rather than delivered without it.
 */
export async function itemEvents<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	edges: Edge<Node>[],
	signal: AbortSignal,
): Promise<Extract<PositionEvent<GraphQLPosition, LedgerItem<Node>>, { $kind: 'Item' }>[]> {
	const known = edges.map((edge) => family.checkpoint(edge.node));
	const digests = [
		...new Set(
			known.flatMap((checkpoint) => (typeof checkpoint === 'bigint' ? [] : [checkpoint.digest])),
		),
	];
	const looked = digests.length > 0 ? await lookupCheckpoints(client, digests, signal) : new Map();
	return edges.map((edge, i) => {
		const reported = known[i];
		const checkpoint =
			typeof reported === 'bigint'
				? reported
				: (looked.get(reported.digest) ?? notIndexed(reported));
		return {
			$kind: 'Item',
			position: itemPosition(edge.cursor, checkpoint, family.identity(edge.node)),
			item: { node: edge.node, checkpoint },
		};
	});
}

export async function lookupCheckpoints(
	client: SuiGraphQLClient,
	digests: string[],
	signal: AbortSignal,
): Promise<Map<string, bigint>> {
	const data = await queryData(client, {
		query: StreamTransactionCheckpointsDocument,
		variables: { digests },
		signal,
	});
	const found = new Map<string, bigint>();
	digests.forEach((digest, i) => {
		const checkpoint = data.multiGetTransactionEffects[i]?.checkpoint;
		if (checkpoint) found.set(digest, BigInt(checkpoint.sequenceNumber));
	});
	return found;
}

function notIndexed({ digest }: { digest: string }): never {
	throw notIndexedYet(`Transaction ${digest} has no indexed checkpoint yet`);
}

function checkpointOrDigest(
	checkpoint: { sequenceNumber: number } | null | undefined,
	digest: string,
): bigint | { digest: string } {
	return checkpoint ? BigInt(checkpoint.sequenceNumber) : { digest };
}

function eventDigest(node: Event_FieldsFragment): string {
	const digest = node.transaction?.digest;
	if (!digest) throw new SuiStreamError('Protocol', 'Event has no transaction digest');
	return digest;
}

/** One history page, its connection checked before anything reads it. */
function scanPage<Result extends { viewedAt?: { sequenceNumber: number } | null }, Node>(
	name: string,
	data: Result,
	select: (data: Result) => unknown,
): Page<Node> {
	const viewedAt = data.viewedAt?.sequenceNumber;
	return {
		...connection<Node>(name, select(data)),
		viewedAt: viewedAt == null ? null : BigInt(viewedAt),
	};
}

/** `value` as a connection, checked before anything reads it. */
function connection<Node>(name: string, value: unknown): Connection<Node> {
	const page = value as Partial<Connection<Node>> | null | undefined;
	const info = page?.pageInfo;
	const cursorOrNull = (cursor: unknown) => cursor === null || typeof cursor === 'string';
	if (
		!page ||
		!Array.isArray(page.edges) ||
		!page.edges.every(isEdge) ||
		!info ||
		typeof info.hasNextPage !== 'boolean' ||
		typeof info.hasPreviousPage !== 'boolean' ||
		!cursorOrNull(info.startCursor) ||
		!cursorOrNull(info.endCursor)
	) {
		throw new SuiStreamError('Protocol', `GraphQL ${name} connection is missing or malformed`);
	}
	return page as Connection<Node>;
}

function isEdge(edge: unknown): edge is Edge<unknown> {
	const value = edge as Partial<Edge<unknown>> | null;
	return !!value && typeof value.cursor === 'string' && value.cursor !== '' && !!value.node;
}

/**
 * Subscription results as edges.
 * @yields Each result's edge; a result without one breaks the API's shape.
 */
async function* edges<Result, Node>(
	results: AsyncIterable<GraphQLQueryResult<Result>>,
	edge: (data: Result) => Edge<Node> | null | undefined,
): AsyncGenerator<Edge<Node>> {
	for await (const result of results) {
		const value = edge(unwrap(result));
		if (!isEdge(value)) {
			throw new SuiStreamError('Protocol', 'GraphQL subscription response has no edge');
		}
		yield value;
	}
}
