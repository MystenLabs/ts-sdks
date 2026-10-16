// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { Page, PageItem, PageRequest } from '../../client/stream/index.js';
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
 * watermark says where the scan stopped.
 */
export async function fetchListPage(
	family: GrpcFamily,
	list: (query: ListQuery, signal: AbortSignal) => LedgerCall<ListFrame>,
	request: PageRequest,
): Promise<Page<GrpcItem>> {
	const { order, range } = request;
	const call = list(listQuery(request), request.signal);
	const items: PageItem<GrpcItem>[] = [];
	let end: { reason: QueryEndReason; watermark?: Watermark } | undefined;
	try {
		for await (const frame of call) {
			if (end) throw protocol('Received a frame after QueryEnd');
			const item = family.item(frame);
			if (item) items.push({ position: family.position(frame, item), item });
			if (frame.end) end = { reason: queryEnd(frame.end.reason, item), watermark: frame.watermark };
		}
	} catch (error) {
		throw historyError(error);
	} finally {
		await call.return();
	}
	if (!end) throw protocol('List RPC completed without QueryEnd');

	const { reason, watermark } = end;
	const more = reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT;
	// The scan stopped at a cursor bound's own item, which is not a place to resume.
	if (reason === QueryEndReason.CURSOR_BOUND) return { items, next: { more } };
	return {
		items,
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
export async function readIndexedTip(transport: RpcTransport, signal: AbortSignal) {
	const call = openLedgerCall(
		transport,
		GRPC_FAMILIES.checkpoints.list,
		{
			readMask: { paths: ['sequence_number'] },
			options: { limit: 1, ordering: Ordering.DESCENDING },
		},
		{ signal, isItem: (frame) => frame.checkpoint !== undefined },
	);
	try {
		for await (const frame of call) {
			const tip = frame.checkpoint?.sequenceNumber;
			if (tip !== undefined) return tip;
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

/** Pruned history cannot come back by retrying. */
function historyError(error: unknown): unknown {
	if (error instanceof RpcError && error.code === 'OUT_OF_RANGE') {
		return new SuiStreamError('HistoryUnavailable', error.message, { cause: error });
	}
	return error;
}

function protocol(message: string) {
	return new SuiStreamError('Protocol', message);
}
