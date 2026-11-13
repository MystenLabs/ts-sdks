// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { base64decode } from '@protobuf-ts/runtime';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { Page, PageEnd, PageItem, PageRequest } from '../../client/stream/index.js';
import { SuiStreamError } from '../../client/stream/index.js';
import { ErrorInfo } from '../proto/google/rpc/error_details.js';
import { Status } from '../proto/google/rpc/status.js';
import { Ordering, QueryEndReason } from '../proto/sui/rpc/v2/query_options.js';
import type { Watermark } from '../proto/sui/rpc/v2/query_options.js';
import { openLedgerCall, type LedgerCall } from './call.js';
import {
	GRPC_FAMILIES,
	type GrpcFamily,
	type GrpcItem,
	type ListFrame,
	type ListRequest,
	watermarkPosition,
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
		const pruned = new SuiStreamError('HistoryUnavailable', error.message, { cause: error });
		const marker = ledgerErrorInfo(error);
		if (marker?.reason === 'ABOVE_LATEST_AVAILABLE') {
			return { next: { more: false }, notIndexed: true };
		}
		if (marker?.reason === 'BELOW_EARLIEST_AVAILABLE') {
			const floor = marker.metadata.lowestAvailableCheckpoint;
			// A descending read with no low end of its own stops at the floor, after its items.
			if (
				order === 'descending' &&
				range.start === undefined &&
				!request.after &&
				/^\d+$/.test(floor ?? '')
			) {
				return { next: { more: false }, retainedFrom: BigInt(floor) };
			}
		}
		throw pruned;
	} finally {
		await call.return();
	}
	if (!end) throw protocol('List RPC completed without QueryEnd');

	const { reason, watermark } = end;
	const more = reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT;
	// The scan stopped at a cursor bound's own item, which is not a place to resume.
	if (reason === QueryEndReason.CURSOR_BOUND) return { next: { more } };
	// An empty scan reports no checkpoint. At the tip, nothing past the start is indexed yet, which
	// only a read with an end has to wait for.
	const checkpoint = watermark?.checkpoint;
	const empty = checkpoint === undefined && reason === QueryEndReason.LEDGER_TIP;
	const bounded = range.end !== undefined || request.before !== undefined;
	if (order === 'ascending' && empty && bounded) {
		return { next: { more: false }, notIndexed: true };
	}
	return {
		next: { more, cursor: watermark?.cursor, position: watermarkPosition(watermark) },
		covered: order === 'ascending' ? checkpoint : undefined,
		// Without a lower bound, a descending read stops at the oldest checkpoint the server keeps.
		retainedFrom:
			order === 'descending' && !more && range.start === undefined
				? (checkpoint ?? (await retainedFrom(request.signal)))
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
	throw markNotIndexed(new RpcError('No checkpoint is indexed yet', 'UNAVAILABLE'));
}

const notIndexed = new WeakSet<object>();

function markNotIndexed<E extends object>(error: E): E {
	notIndexed.add(error);
	return error;
}

/** Whether `error` reports that the server has not indexed what the stream needs yet. */
export function isNotIndexed(error: unknown): boolean {
	return typeof error === 'object' && error !== null && notIndexed.has(error);
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

/** The `ErrorInfo` a server marks a ledger OUT_OF_RANGE with, if any. */
function ledgerErrorInfo(error: RpcError): ErrorInfo | undefined {
	const details = error.meta['grpc-status-details-bin'];
	const encoded = Array.isArray(details) ? details[0] : details;
	if (!encoded) return undefined;
	try {
		const status = Status.fromBinary(base64decode(encoded));
		// Servers send the type URL `/google.rpc.ErrorInfo`, with no host, which `Any.contains` rejects.
		const detail = status.details.find(
			({ typeUrl }) => typeUrl.slice(typeUrl.lastIndexOf('/') + 1) === ErrorInfo.typeName,
		);
		const info = detail && ErrorInfo.fromBinary(detail.value);
		return info?.domain === 'sui.io' ? info : undefined;
	} catch {
		return undefined;
	}
}

function isOutOfRange(error: unknown): error is RpcError {
	return error instanceof RpcError && error.code === 'OUT_OF_RANGE';
}

function protocol(message: string) {
	return new SuiStreamError('Protocol', message);
}
