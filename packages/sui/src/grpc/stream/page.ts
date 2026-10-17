// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { Page, PageEnd, PageItem, PageRequest } from '../../client/stream/index.js';
import { SuiStreamError } from '../../client/stream/index.js';
import { Ordering, QueryEndReason } from '../proto/sui/rpc/v2/query_options.js';
import type { Watermark } from '../proto/sui/rpc/v2/query_options.js';
import { openLedgerCall, type LedgerCall } from './call.js';
import {
	GRPC_FAMILIES,
	type GrpcFamily,
	type GrpcItem,
	type ListFrame,
	type ListRequest,
} from './families.js';

const U64_MAX = (1n << 64n) - 1n;

/** Servers clamp larger limits to their own maximum for each method. */
const PAGE_LIMIT = 1000;

/** A List request without the stream's filter and read mask. */
export type ListQuery = Omit<ListRequest, 'readMask' | 'filter'>;

/**
 * One List call as a page. The call streams its items and ends with a QueryEnd frame, whose
 * watermark says where the scan stopped. The call opens on the first read.
 */
export async function fetchListPage(
	family: GrpcFamily,
	list: (query: ListQuery, signal: AbortSignal) => LedgerCall<ListFrame>,
	retainedFrom: (signal: AbortSignal) => Promise<bigint>,
	request: PageRequest,
): Promise<Page<GrpcItem>> {
	return { items: listItems(family, list, retainedFrom, request) };
}

async function* listItems(
	family: GrpcFamily,
	list: (query: ListQuery, signal: AbortSignal) => LedgerCall<ListFrame>,
	retainedFrom: (signal: AbortSignal) => Promise<bigint>,
	request: PageRequest,
): AsyncGenerator<PageItem<GrpcItem>, PageEnd, undefined> {
	const { order, range } = request;
	const call = list(listQuery(request), request.signal);
	let end: { reason: QueryEndReason; watermark?: Watermark } | undefined;
	try {
		for await (const frame of call) {
			if (end) throw protocol('Received a frame after QueryEnd');
			const item = family.item(frame);
			if (frame.end) end = { reason: queryEnd(frame.end.reason, item), watermark: frame.watermark };
			if (item) yield { position: family.position(frame, item), item };
		}
	} catch (error) {
		if (!isOutOfRange(error)) throw error;
		if (await startsPastIndex(request, retainedFrom)) {
			return { next: { more: false }, notIndexed: true };
		}
		throw new SuiStreamError('HistoryUnavailable', error.message, { cause: error });
	} finally {
		await call.return();
	}
	if (!end) throw protocol('List RPC completed without QueryEnd');

	const { reason, watermark } = end;
	const more = reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT;
	// The scan stopped at a cursor bound's own item, which is not a place to resume.
	if (reason === QueryEndReason.CURSOR_BOUND) return { next: { more } };
	return {
		next: { more, cursor: watermark?.cursor },
		covered: order === 'ascending' ? watermark?.checkpoint : undefined,
		// Without a lower bound, a descending read stops at the oldest checkpoint the server keeps.
		retainedFrom:
			order === 'descending' && !more && range.start === undefined
				? watermark?.checkpoint
				: undefined,
	};
}

/** The indexed tip: the newest checkpoint a List call can read. */
export function readIndexedTip(transport: RpcTransport, signal: AbortSignal) {
	return readEdge(transport, Ordering.DESCENDING, signal);
}

/** The oldest checkpoint a List call can read: an unbounded ascending read starts there. */
export function readRetainedFrom(transport: RpcTransport, signal: AbortSignal) {
	return readEdge(transport, Ordering.ASCENDING, signal);
}

async function readEdge(transport: RpcTransport, ordering: Ordering, signal: AbortSignal) {
	const call = openLedgerCall(
		transport,
		GRPC_FAMILIES.checkpoints.list,
		{ readMask: { paths: ['sequence_number'] }, options: { limit: 1, ordering } },
		{ signal, isItem: (frame) => frame.checkpoint !== undefined },
	);
	try {
		for await (const frame of call) {
			const checkpoint = frame.checkpoint?.sequenceNumber;
			if (checkpoint !== undefined) return checkpoint;
		}
	} finally {
		await call.return();
	}
	// A new network has nothing indexed for a moment; retry.
	throw new RpcError('No checkpoint is indexed yet', 'UNAVAILABLE');
}

function listQuery({ range, after, before, order }: PageRequest): ListQuery {
	if (range.start !== undefined && range.start > U64_MAX) {
		throw new SuiStreamError('InvalidOptions', 'Checkpoint bound overflows u64');
	}
	return {
		startCheckpoint: range.start,
		// The exclusive end after the last checkpoint is unbounded.
		endCheckpoint: range.end !== undefined && range.end <= U64_MAX ? range.end : undefined,
		options: {
			limit: PAGE_LIMIT,
			ordering: order === 'ascending' ? Ordering.ASCENDING : Ordering.DESCENDING,
			after,
			before,
		},
	};
}

/** QueryEnd is set once, on the last frame; only an item-limit end carries an item. */
function queryEnd(reason: QueryEndReason | undefined, item: GrpcItem | undefined) {
	if (reason === undefined || reason === QueryEndReason.UNKNOWN || !(reason in QueryEndReason)) {
		throw protocol('Unknown QueryEnd reason');
	}
	if (reason === QueryEndReason.ITEM_LIMIT && !item) {
		throw protocol('Item-limit terminal frame is missing its item');
	}
	if (reason !== QueryEndReason.ITEM_LIMIT && item) {
		throw protocol('Unexpected item on terminal query frame');
	}
	return reason;
}

/**
 * A server reports OUT_OF_RANGE both for pruned history and for a starting cursor past its index,
 * such as one from a server further ahead. A read that needs nothing below the retention floor was
 * not pruned. The floor is checked instead of the tip, which can pass the cursor before it is read.
 */
async function startsPastIndex(
	{ order, range, unread, after, before, signal }: PageRequest,
	retainedFrom: (signal: AbortSignal) => Promise<bigint>,
): Promise<boolean> {
	if (!(order === 'ascending' ? after : before)) return false;
	// The oldest checkpoint the read still needs: ascending, the oldest unread one; descending, its
	// low end, or the top of its range when the low end is open. A cursor low end cannot be told.
	let needed: bigint | undefined;
	if (order === 'ascending') needed = unread ?? range.start;
	else if (!after) needed = range.start ?? (range.end === undefined ? undefined : range.end - 1n);
	return needed !== undefined && needed >= (await retainedFrom(signal));
}

function isOutOfRange(error: unknown): error is RpcError {
	return error instanceof RpcError && error.code === 'OUT_OF_RANGE';
}

function protocol(message: string) {
	return new SuiStreamError('Protocol', message);
}
