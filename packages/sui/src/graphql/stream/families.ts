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
import type { ItemFrame, PageItem, StreamFamily } from '../../client/stream/adapter.js';
import { sleep } from '../../utils/abort.js';
import { itemPosition, SuiStreamError, type StreamPosition } from '../../client/stream/index.js';
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
	CheckpointTransactionsDocument,
	ScanCheckpointsDocument,
	ScanCheckpointsWithTransactionsDocument,
	type ScanCheckpointsWithTransactionsQuery,
	SubscribeCheckpointsWithTransactionsDocument,
	ScanEventsDocument,
	ScanTransactionsDocument,
	SubscribeCheckpointsDocument,
	SubscribeEventsDocument,
	SubscribeTransactionsDocument,
	type Checkpoint_FieldsFragment,
	type Checkpoint_Transactions_PageFragment,
	type Event_FieldsFragment,
	type Transaction_FieldsFragment,
} from '../generated/queries.js';
import { notIndexedYet, queryData, unwrap } from './query.js';

export interface Edge<Node> {
	cursor: string;
	node: Node;
}

/** A subscription edge. A filtered subscription also sends progress: an edge without a node. */
export interface LiveEdge<Node> {
	cursor: string;
	node: Node | null;
}

/** GraphQL cursors are strings. Positions hold them as bytes, never read. */
export const cursorBytes = (cursor: string) => new TextEncoder().encode(cursor);
export const cursorString = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** A transaction or event at `checkpoint`. Its place in the checkpoint is not reported. */
function itemAt(edge: Edge<unknown>, checkpoint: bigint, itemId: string): StreamPosition {
	return itemPosition(checkpoint, { cursor: cursorBytes(edge.cursor), itemId });
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

export interface Page<Node> extends Connection<Node> {
	/** The checkpoint this page was read at: the indexed tip of the replica that answered. */
	viewedAt: bigint;
	/** The oldest checkpoint the filter's indexes retain. */
	retainedFrom: bigint | null;
}

export interface LedgerItem<Node> {
	node: Node;
	checkpoint: bigint;
}

/** Where a subscription resumes: after a cursor, or from a checkpoint. */
export interface ResumePoint {
	after?: string;
	start?: bigint;
}

export interface PageRequest {
	range: ResolvedCheckpointRange;
	first?: number;
	last?: number;
	after?: string;
	before?: string;
	signal: AbortSignal;
}

/** Each family reads with its list method's fragment and mapper, so streamed items match list results. */
export interface LedgerFamily<Node> {
	readonly name: StreamFamily;
	/** Items per page; defaults to the largest page the service returns. */
	readonly pageSize?: number;
	resolveFilter(signal: AbortSignal): Promise<unknown>;
	page(request: PageRequest): Promise<Page<Node>>;
	/** Backfills from the resume point, then continues live. */
	subscribe(
		signal: AbortSignal,
		resume: ResumePoint,
		onOpen: () => void,
	): AsyncIterable<LiveEdge<Node>>;
	position(edge: Edge<Node>, checkpoint: bigint): StreamPosition;
	/** The node's checkpoint; null where the server left it out. */
	checkpoint(node: Node): bigint | null;
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
			return request.options.include?.transactions
				? checkpointsWithTransactionsFamily(client, request.options.include.transactions)
				: checkpointsFamily(client);
		case 'transactions':
			return transactionsFamily(client, mvr, request);
		case 'events':
			return eventsFamily(client, mvr, request);
	}
}

function checkpointsFamily(client: SuiGraphQLClient): LedgerFamily<Checkpoint_FieldsFragment> {
	return {
		name: 'checkpoints',
		resolveFilter: async () => undefined,
		page: async ({ range, signal, ...cursors }) =>
			scanPage(
				'checkpoints',
				await queryData(client, {
					query: ScanCheckpointsDocument,
					variables: { filter: toGraphQLCheckpointBounds(range), filters: [], ...cursors },
					signal,
				}),
				(data) => data.checkpoints,
			),
		subscribe: (signal, { after, start }, onOpen) =>
			edges(
				client.subscribe({
					query: SubscribeCheckpointsDocument,
					variables: { after, ...toGraphQLCheckpointBounds({ start }) },
					signal,
					onOpen,
				}),
				(data) => data.checkpoints,
			),
		// A checkpoint is positioned by its sequence number alone.
		position: (_, checkpoint) => itemPosition(checkpoint),
		checkpoint: (node) => BigInt(node.sequenceNumber),
		map: ({ node }) => ({
			$kind: 'Checkpoint',
			checkpoint: parseGraphQLCheckpoint(node, 'Checkpoint stream'),
		}),
	};
}

/** A checkpoint with every one of its transactions, read before the checkpoint is delivered. */
type CheckpointWithTransactions = Checkpoint_FieldsFragment & {
	transactions: Checkpoint_Transactions_PageFragment | null;
};

/**
 * Checkpoints per scan page when their transactions are nested: more exceeds the service's limit
 * on output nodes for a full transaction selection.
 */
const CHECKPOINT_TRANSACTIONS_PAGE_SIZE = 20;
/** How often to check whether a replica has indexed a checkpoint's transactions. */
const INDEX_POLL_INTERVAL = 250;

/**
 * Checkpoints with their transactions. Each checkpoint carries its first 50 transactions; the rest
 * are read with `atCheckpoint` pages before it is delivered.
 */
function checkpointsWithTransactionsFamily(
	client: SuiGraphQLClient,
	include: SuiClientTypes.TransactionInclude,
): LedgerFamily<CheckpointWithTransactions> {
	const selection = transactionIncludeVariables(include);

	async function complete(node: CheckpointWithTransactions, signal: AbortSignal) {
		const first = node.transactions;
		if (!first)
			throw new SuiStreamError('Protocol', `Checkpoint ${node.sequenceNumber} has no transactions`);
		const nodes = [...first.nodes];
		let { hasNextPage, endCursor } = first.pageInfo;
		while (hasNextPage) {
			const data = await queryData(client, {
				query: CheckpointTransactionsDocument,
				variables: { atCheckpoint: node.sequenceNumber, after: endCursor, ...selection },
				signal,
			});
			// A live checkpoint can arrive before this replica indexed its transactions, which would
			// read as an empty last page. Wait for the index instead of truncating.
			const indexed = data.serviceConfig.availableRange;
			if ((indexed.last?.sequenceNumber ?? -1) < node.sequenceNumber) {
				await sleep(INDEX_POLL_INTERVAL, signal);
				continue;
			}
			if ((indexed.first?.sequenceNumber ?? 0) > node.sequenceNumber) {
				throw new SuiStreamError(
					'HistoryUnavailable',
					`Transactions of checkpoint ${node.sequenceNumber} have been pruned`,
				);
			}
			const page = data.transactions;
			if (!page) throw new SuiStreamError('Protocol', 'GraphQL transactions page is missing');
			nodes.push(...page.nodes);
			// A checkpoint of exactly 50 transactions reports one more, empty, page.
			hasNextPage = page.pageInfo.hasNextPage && page.nodes.length > 0;
			endCursor = page.pageInfo.endCursor;
		}
		return { ...node, transactions: { ...first, nodes } };
	}

	return {
		name: 'checkpoints',
		pageSize: CHECKPOINT_TRANSACTIONS_PAGE_SIZE,
		resolveFilter: async () => undefined,
		page: async ({ range, signal, ...cursors }) => {
			const page = scanPage<ScanCheckpointsWithTransactionsQuery, CheckpointWithTransactions>(
				'checkpoints',
				await queryData(client, {
					query: ScanCheckpointsWithTransactionsDocument,
					variables: {
						filter: toGraphQLCheckpointBounds(range),
						filters: [],
						...cursors,
						...selection,
					},
					signal,
				}),
				(data) => data.checkpoints,
			);
			const edges = [];
			for (const edge of page.edges)
				edges.push({ ...edge, node: await complete(edge.node, signal) });
			return { ...page, edges };
		},
		subscribe: (signal, { after, start }, onOpen) =>
			completeEdges(
				edges(
					client.subscribe({
						query: SubscribeCheckpointsWithTransactionsDocument,
						variables: { after, ...toGraphQLCheckpointBounds({ start }), ...selection },
						signal,
						onOpen,
					}),
					(data) => data.checkpoints,
				),
				(node) => complete(node, signal),
			),
		position: (_, checkpoint) => itemPosition(checkpoint),
		checkpoint: (node) => BigInt(node.sequenceNumber),
		map: ({ node }) => ({
			$kind: 'Checkpoint',
			checkpoint: {
				...parseGraphQLCheckpoint(node, 'Checkpoint stream'),
				transactions: node.transactions!.nodes.map((transaction) => {
					const result = parseStreamTransaction(transaction, include);
					return result.Transaction ?? result.FailedTransaction;
				}),
			},
		}),
	};
}

/** @yields each edge, with its node completed first. */
async function* completeEdges<Node>(
	live: AsyncIterable<LiveEdge<Node>>,
	complete: (node: Node) => Promise<Node>,
): AsyncGenerator<LiveEdge<Node>> {
	for await (const edge of live) {
		yield edge.node ? { ...edge, node: await complete(edge.node) } : edge;
	}
}

function parseStreamTransaction(
	node: Transaction_FieldsFragment,
	include: SuiClientTypes.TransactionInclude | undefined,
) {
	if (!node.effects?.status) {
		throw new SuiStreamError('Protocol', `Transaction ${node.digest} has no effects`);
	}
	return parseTransaction(node, include);
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
		async resolveFilter(signal) {
			filter = options.filter && (await resolveTransactionFilter(mvr, options.filter, signal));
			return filter;
		},
		page: async ({ range, signal, ...cursors }) =>
			scanPage(
				'transactions',
				await queryData(client, {
					query: ScanTransactionsDocument,
					variables: {
						filter: toGraphQLTransactionFilter(filter, range),
						filters: setFields(toGraphQLTransactionFilter(filter, {})),
						...cursors,
						...selection,
					},
					signal,
				}),
				(data) => data.transactions,
			),
		subscribe: (signal, { after, start }, onOpen) =>
			edges(
				client.subscribe({
					query: SubscribeTransactionsDocument,
					variables: {
						filter: toGraphQLTransactionFilter(filter, { start }),
						after,
						...selection,
					},
					signal,
					onOpen,
				}),
				(data) => data.transactions,
			),
		position: (edge, checkpoint) => itemAt(edge, checkpoint, edge.node.digest),
		checkpoint: (node) => optionalCheckpoint(node.effects?.checkpoint),
		map: ({ node }) => ({
			$kind: 'Transaction',
			transaction: parseStreamTransaction(node, options.include),
		}),
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
		async resolveFilter(signal) {
			filter = options.filter && (await resolveEventFilter(mvr, options.filter, signal));
			return filter;
		},
		page: async ({ range, signal, ...cursors }) =>
			scanPage(
				'events',
				await queryData(client, {
					query: ScanEventsDocument,
					variables: {
						filter: toGraphQLEventFilter(filter, range),
						filters: setFields(toGraphQLEventFilter(filter, {})),
						...cursors,
					},
					signal,
				}),
				(data) => data.events,
			),
		subscribe: (signal, { after, start }, onOpen) =>
			edges(
				client.subscribe({
					query: SubscribeEventsDocument,
					variables: {
						filter: toGraphQLEventFilter(filter, { start }),
						after,
					},
					signal,
					onOpen,
				}),
				(data) => data.events,
			),
		position: (edge, checkpoint) =>
			itemAt(edge, checkpoint, `${eventDigest(edge.node)}:${edge.node.sequenceNumber}`),
		checkpoint: (node) => optionalCheckpoint(node.transaction?.effects?.checkpoint),
		map: ({ node, checkpoint }) => ({
			$kind: 'Event',
			event: parseGraphQLEvent(node, checkpoint.toString(), 'Event stream'),
		}),
	};
}

/** The filter fields set, which pick the indexes and so the retention range. */
function setFields(filter: object): string[] {
	return Object.entries(filter)
		.filter(([, value]) => value != null)
		.map(([key]) => key);
}

/** Index-backed pages always carry each node's checkpoint. */
export function pageItem<Node>(
	family: LedgerFamily<Node>,
	edge: Edge<Node>,
): PageItem<LedgerItem<Node>> {
	const checkpoint = family.checkpoint(edge.node);
	if (checkpoint === null) {
		throw new SuiStreamError('Protocol', `${family.name} page item has no checkpoint`);
	}
	return { position: family.position(edge, checkpoint), item: { node: edge.node, checkpoint } };
}

function optionalCheckpoint(checkpoint: { sequenceNumber: number } | null | undefined) {
	return checkpoint ? BigInt(checkpoint.sequenceNumber) : null;
}

function eventDigest(node: Event_FieldsFragment): string {
	const digest = node.transaction?.digest;
	if (!digest) throw new SuiStreamError('Protocol', 'Event has no transaction digest');
	return digest;
}

interface AvailableRange {
	first: { sequenceNumber: number } | null;
	last: { sequenceNumber: number } | null;
}

function scanPage<Result extends { serviceConfig?: { availableRange?: AvailableRange } }, Node>(
	name: string,
	data: Result,
	select: (data: Result) => unknown,
): Page<Node> {
	const page = connection<Node>(name, select(data));
	const range = data.serviceConfig?.availableRange;
	if (!range) throw new SuiStreamError('Protocol', `GraphQL ${name} page has no availableRange`);
	if (!range.last) throw notIndexedYet('No checkpoint has been indexed yet');
	return {
		...page,
		viewedAt: BigInt(range.last.sequenceNumber),
		retainedFrom: range.first ? BigInt(range.first.sequenceNumber) : null,
	};
}

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
 * @yields each result's edge.
 */
async function* edges<Result, Node>(
	results: AsyncIterable<GraphQLQueryResult<Result>>,
	edge: (data: Result) => LiveEdge<Node> | null | undefined,
): AsyncGenerator<LiveEdge<Node>> {
	for await (const result of results) {
		const value = edge(unwrap(result));
		if (!value || typeof value.cursor !== 'string' || value.cursor === '') {
			throw new SuiStreamError('Protocol', 'GraphQL subscription response has no edge');
		}
		// A null node is a progress edge; the bundled schema still declares `node` non-null.
		yield { cursor: value.cursor, node: value.node ?? null };
	}
}
