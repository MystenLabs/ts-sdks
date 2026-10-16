// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/utils';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';

import type { Bound, ScanEvent, ScanRequest, StreamPosition } from '../../client/stream/index.js';
import {
	assertAdvanced,
	assertAdvancing,
	boundaryPosition,
	boundCoverage,
	CoverageTracker,
	startBeyondTip,
	SuiStreamError,
} from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import { Ordering, QueryEndReason } from '../proto/sui/rpc/v2/query_options.js';
import type { QueryEnd } from '../proto/sui/rpc/v2/query_options.js';
import { openLedgerCall, type LedgerCall } from './call.js';
import {
	framePosition,
	GRPC_FAMILIES,
	type GrpcFamily,
	type GrpcItem,
	type ListFrame,
	type ListRequest,
	type LiveFrame,
} from './families.js';

const U64_MAX = (1n << 64n) - 1n;

/** Servers coerce larger limits down to their own maximum (50 to 1,000 depending on the method). */
const PAGE_LIMIT = 1000;

/** This stream's calls, with its resolved filter and read mask fixed. */
export interface GrpcStreamCalls {
	readonly family: GrpcFamily;
	list(query: ListQuery, signal: AbortSignal): LedgerCall<ListFrame>;
	subscribe(signal: AbortSignal): LedgerCall<LiveFrame>;
	indexedTip(signal: AbortSignal): Promise<bigint>;
}

/** A List request without the stream's filter and read mask. */
export type ListQuery = Omit<ListRequest, 'readMask' | 'filter'>;

const PAGE_END: Record<QueryEndReason, SuiClientTypes.StreamPageEnd | undefined> = {
	[QueryEndReason.UNKNOWN]: undefined,
	[QueryEndReason.ITEM_LIMIT]: 'limit',
	[QueryEndReason.SCAN_LIMIT]: 'limit',
	[QueryEndReason.CHECKPOINT_BOUND]: 'bound',
	[QueryEndReason.CURSOR_BOUND]: 'bound',
	[QueryEndReason.LEDGER_TIP]: 'indexedTip',
};

/**
 * One scan pass: List pages from `start` toward `end` or the indexed tip.
 *
 * @yields `Connected`, items and progress, a `Page` per page, and exactly one final `End`.
 */
export async function* scanLedger(
	calls: GrpcStreamCalls,
	request: ScanRequest,
): AsyncGenerator<ScanEvent<GrpcItem>> {
	const { order, signal } = request;
	const family = calls.family;
	// Items below an unindexed descending start would get tokens that skip the unindexed part.
	if (order === 'descending' && !(await startIndexed(calls, request))) {
		yield { $kind: 'End', complete: false };
		return;
	}

	const bounds = listBounds(request);
	const tracker = new CoverageTracker(
		order,
		family.name,
		boundCoverage(request.start, family.name),
	);
	let pageStart =
		request.start && 'position' in request.start ? cursorKey(request.start.position) : undefined;
	let previous: StreamPosition | undefined;
	let connected = false;

	while (true) {
		const call = calls.list(listQuery(bounds, order), signal);
		let reason: QueryEndReason | undefined;
		let terminal: StreamPosition | undefined;
		let lowest: bigint | undefined;
		try {
			for await (const frame of call) {
				if (!connected) {
					connected = true;
					yield { $kind: 'Connected' };
				}
				if (reason !== undefined) throw protocol('Received a frame after QueryEnd');
				const item = family.item(frame);
				reason = frame.end && assertQueryEnd(frame.end, item);
				// A cursor bound is the excluded endpoint itself, never a resumable position.
				if (reason === QueryEndReason.CURSOR_BOUND) {
					yield { $kind: 'Page', end: 'bound', coverage: { $kind: 'Unknown' } };
					continue;
				}

				const raw = framePosition(frame, item);
				assertAdvancing(previous, raw, order);
				previous = raw;
				let position = tracker.apply(raw);
				if (reason !== undefined && !item) {
					position = atCheckpointBoundary(position, reason, bounds, order);
				}
				yield item ? { $kind: 'Item', position, item } : { $kind: 'Progress', position };
				if (reason !== undefined) {
					terminal = position;
					lowest = frame.watermark?.checkpoint;
					yield { $kind: 'Page', end: pageEnd(reason), coverage: position.coverage };
				}
			}
		} catch (error) {
			throw historyError(error);
		} finally {
			await call.return();
		}

		if (reason === undefined) throw protocol('List RPC completed without QueryEnd');
		if (reason === QueryEndReason.CURSOR_BOUND) {
			yield { $kind: 'End', complete: true };
			return;
		}
		if (!terminal) throw protocol('List RPC ended without a terminal watermark');
		if (reason === QueryEndReason.ITEM_LIMIT || reason === QueryEndReason.SCAN_LIMIT) {
			const cursor = nativeCursor(terminal);
			assertAdvanced(pageStart, toBase64(cursor));
			pageStart = toBase64(cursor);
			if (order === 'ascending') bounds.after = cursor;
			else bounds.before = cursor;
			continue;
		}
		// Without an end, the server stops a descending read at the oldest checkpoint it retains.
		const retentionLimit = order === 'descending' && !request.end && !!lowest;
		yield {
			$kind: 'End',
			complete: reachedEnd(reason, terminal, request, bounds),
			...(retentionLimit && { retentionLimit }),
		};
		return;
	}
}

/** Whether `start` is indexed. The tip captured when the range was planned answers without a call. */
async function startIndexed(
	calls: GrpcStreamCalls,
	{ start, capturedTip, signal }: ScanRequest,
): Promise<boolean> {
	if (!start) return true;
	if (capturedTip !== undefined && !startBeyondTip(start, capturedTip)) return true;
	return !startBeyondTip(start, await calls.indexedTip(signal));
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

/** Checkpoint and cursor bounds intersect on the server. `endCheckpoint` may be 2^64. */
interface ListBounds {
	startCheckpoint?: bigint;
	endCheckpoint?: bigint;
	after?: Uint8Array;
	before?: Uint8Array;
}

function listBounds(request: ScanRequest): ListBounds {
	const ascending = request.order === 'ascending';
	return {
		...lowerBound(ascending ? request.start : request.end, ascending),
		...upperBound(ascending ? request.end : request.start, ascending),
	};
}

/** Everything after this bound. An ascending start checkpoint is inclusive. */
function lowerBound(
	bound: Bound | undefined,
	ascending: boolean,
): Pick<ListBounds, 'startCheckpoint' | 'after'> {
	if (!bound) return {};
	if ('checkpoint' in bound) {
		return { startCheckpoint: ascending ? bound.checkpoint : bound.checkpoint + 1n };
	}
	const { cursor, kind, checkpoint } = bound.position;
	if (cursor) return { after: cursor };
	// Positions without a cursor resume by checkpoint: after an item, or at a boundary.
	return { startCheckpoint: kind === 'Item' ? checkpoint! + 1n : checkpoint! };
}

/** Everything before this bound. A descending start checkpoint is inclusive. */
function upperBound(
	bound: Bound | undefined,
	ascending: boolean,
): Pick<ListBounds, 'endCheckpoint' | 'before'> {
	if (!bound) return {};
	if ('checkpoint' in bound) {
		return { endCheckpoint: ascending ? bound.checkpoint : bound.checkpoint + 1n };
	}
	const { cursor, checkpoint } = bound.position;
	// Without a cursor, an item or a boundary ends before its checkpoint.
	return cursor ? { before: cursor } : { endCheckpoint: checkpoint! };
}

function listQuery(bounds: ListBounds, order: SuiClientTypes.Order): ListQuery {
	if (bounds.startCheckpoint !== undefined && bounds.startCheckpoint > U64_MAX) {
		throw new SuiStreamError('InvalidOptions', 'Checkpoint bound overflows u64');
	}
	return {
		startCheckpoint: bounds.startCheckpoint,
		endCheckpoint:
			bounds.endCheckpoint !== undefined && bounds.endCheckpoint <= U64_MAX
				? bounds.endCheckpoint
				: undefined,
		options: {
			limit: PAGE_LIMIT,
			ordering: order === 'ascending' ? Ordering.ASCENDING : Ordering.DESCENDING,
			after: bounds.after,
			before: bounds.before,
		},
	};
}

function pageEnd(reason: QueryEndReason): SuiClientTypes.StreamPageEnd {
	const end = PAGE_END[reason];
	if (!end) throw protocol('Unknown QueryEnd reason');
	return end;
}

/** QueryEnd is set once, on the last frame; only an item-limit end carries an item. */
function assertQueryEnd(end: QueryEnd, item: GrpcItem | undefined): QueryEndReason {
	const reason = end.reason;
	if (reason === undefined) throw protocol('Unknown QueryEnd reason');
	pageEnd(reason);
	if (reason === QueryEndReason.ITEM_LIMIT && !item) {
		throw protocol('Item-limit terminal frame is missing its item');
	}
	if (reason !== QueryEndReason.ITEM_LIMIT && item) {
		throw protocol('Unexpected item on terminal query frame');
	}
	return reason;
}

/**
 * Terminal progress at a checkpoint bound or the ascending indexed tip sits at a checkpoint
 * boundary; recording it lets a resumed token see that its range is complete.
 */
function atCheckpointBoundary(
	position: StreamPosition,
	reason: QueryEndReason,
	bounds: ListBounds,
	order: SuiClientTypes.Order,
): StreamPosition {
	if (reason === QueryEndReason.CHECKPOINT_BOUND) {
		const boundary = order === 'ascending' ? bounds.endCheckpoint : bounds.startCheckpoint;
		return boundary === undefined ? position : atBoundary(position, boundary);
	}
	if (
		reason === QueryEndReason.LEDGER_TIP &&
		order === 'ascending' &&
		position.coverage.$kind === 'Through'
	) {
		return atBoundary(position, position.coverage.checkpoint + 1n);
	}
	return position;
}

/** Whether a pass that stopped at a checkpoint bound or the indexed tip reached its end. */
function reachedEnd(
	reason: QueryEndReason,
	terminal: StreamPosition,
	request: ScanRequest,
	bounds: ListBounds,
): boolean {
	if (reason !== QueryEndReason.LEDGER_TIP || !request.end) return true;
	if (request.order !== 'ascending' || bounds.endCheckpoint === undefined) return false;
	const covered = terminal.coverage;
	return covered.$kind === 'Through' && covered.checkpoint + 1n >= bounds.endCheckpoint;
}

/** The terminal position of a page that stopped at a checkpoint boundary keeps its cursor. */
function atBoundary(position: StreamPosition, checkpoint: bigint): StreamPosition {
	return boundaryPosition(checkpoint, { cursor: position.cursor, coverage: position.coverage });
}

function nativeCursor(position: StreamPosition): Uint8Array {
	if (!position.cursor) throw protocol('List page ended without a cursor');
	return position.cursor;
}

function cursorKey(position: StreamPosition): string | undefined {
	return position.cursor ? toBase64(position.cursor) : undefined;
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
