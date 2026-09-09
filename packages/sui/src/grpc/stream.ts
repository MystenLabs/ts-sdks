// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/utils';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { ServerStreamingCall } from '@protobuf-ts/runtime-rpc';
import type { SuiClientTypes } from '../client/types.js';
import { compareLedgerCursors, decodeLedgerCursor } from '../client/stream-cursor.js';
import { createLedgerStream, waitForStream } from '../client/stream.js';
import type {
	LedgerStreamAdapter,
	LedgerStreamEvent,
	LedgerStreamRequest,
	StreamPosition,
	StreamBound,
} from '../client/stream.js';
import { resolveEventFilter, resolveTransactionFilter } from '../client/query-filters.js';
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import type { SuiGrpcClient } from './client.js';
import { parseGrpcTransactionResponse, transactionReadMaskPaths } from './core.js';
import { toGrpcEventFilter, toGrpcTransactionFilter } from './filters.js';
import { bufferedGrpcCall } from './stream-buffer.js';
import type { GrpcStreamInclude, GrpcStreamStage, GrpcStreamQueryEnd } from './stream-types.js';
import type { Checkpoint } from './proto/sui/rpc/v2/checkpoint.js';
import type { Event } from './proto/sui/rpc/v2/event.js';
import type { ExecutedTransaction } from './proto/sui/rpc/v2/executed_transaction.js';
import type { EventFilter, TransactionFilter } from './proto/sui/rpc/v2/filter.js';
import { Ordering, QueryEndReason } from './proto/sui/rpc/v2/query_options.js';
import type { QueryEnd, Watermark, QueryOptions } from './proto/sui/rpc/v2/query_options.js';
import { Value } from './proto/google/protobuf/struct.js';

type Family = 'checkpoints' | 'transactions' | 'events';
type Frame = Record<string, unknown>;
type Options = SuiClientTypes.StreamOptions & {
	filter?: SuiClientTypes.TransactionFilter | SuiClientTypes.EventFilter;
	grpcFilter?: TransactionFilter | EventFilter;
	include?: GrpcStreamInclude & SuiClientTypes.TransactionInclude;
	readMask?: string[];
	pageSize?: number;
	maxBufferedItems?: number;
	onQueryEnd?: (metadata: GrpcStreamQueryEnd) => void;
};
interface RawFrame {
	checkpoint?: Checkpoint;
	transaction?: ExecutedTransaction;
	event?: Event;
	watermark?: Watermark;
	end?: QueryEnd;
	cursor?: bigint;
}

const U64_MAX = (1n << 64n) - 1n;
const hasItem = (frame: RawFrame) => !!(frame.checkpoint || frame.transaction || frame.event);
const protocol = (message: string) => new RpcError(message, 'DATA_LOSS');

function linkedController(signal: AbortSignal) {
	const controller = new AbortController();
	const abort = () => controller.abort(signal.reason);
	if (signal.aborted) abort();
	else signal.addEventListener('abort', abort, { once: true });
	return { controller, dispose: () => signal.removeEventListener('abort', abort) };
}

function checkpointPosition(checkpoint: bigint): StreamPosition {
	return {
		cursor: `checkpoint:${checkpoint}`,
		checkpoint: checkpoint.toString(),
		coveredCheckpoint: checkpoint.toString(),
	};
}

/** Native cursor values remain opaque. Only separately reported ledger positions are ordered. */
function comparePositions(a: StreamPosition, b: StreamPosition): number {
	if (a.cursor === b.cursor) return 0;
	if (a.cursor === 'genesis') return -1;
	if (b.cursor === 'genesis') return 1;
	if (!a.cursor.startsWith('checkpoint:') && !b.cursor.startsWith('checkpoint:'))
		return compareLedgerCursors(a.cursor, b.cursor);
	const ac = a.checkpoint ?? a.coveredCheckpoint;
	const bc = b.checkpoint ?? b.coveredCheckpoint;
	if (ac === undefined || bc === undefined)
		throw protocol('Cannot compare ledger positions without checkpoints');
	if (BigInt(ac) !== BigInt(bc)) return BigInt(ac) < BigInt(bc) ? -1 : 1;
	for (const field of ['transactionIndex', 'eventIndex'] as const) {
		if (a[field] !== undefined && b[field] !== undefined && a[field] !== b[field]) {
			return BigInt(a[field]) < BigInt(b[field]) ? -1 : 1;
		}
	}
	// A fully covered checkpoint sorts after every item in that checkpoint.
	if (a.coveredCheckpoint === ac && b.coveredCheckpoint !== bc) return 1;
	if (b.coveredCheckpoint === bc && a.coveredCheckpoint !== ac) return -1;
	return 0;
}

function position(frame: RawFrame, family: Family, live: boolean): StreamPosition {
	if (family === 'checkpoints' && live) {
		if (frame.cursor === undefined) throw protocol('Checkpoint subscription is missing its cursor');
		return checkpointPosition(frame.cursor);
	}
	const watermark = frame.watermark;
	if (!watermark?.cursor?.length) throw protocol('Ledger response is missing its watermark cursor');
	const payload = frame.transaction ?? frame.event;
	const decoded = decodeLedgerCursor(watermark.cursor, family);
	const checkpoint = frame.checkpoint?.sequenceNumber ?? payload?.checkpoint;
	if (hasItem(frame) && checkpoint === undefined)
		throw protocol('Ledger item is missing its checkpoint');
	if (payload && payload.transactionIndex === undefined)
		throw protocol('Ledger item is missing its transaction index');
	// Payload transactionIndex is checkpoint-local; the cursor's transactionIndex
	// is ledger-global (tx_seq). They can differ by every earlier checkpoint's size.
	if (
		payload &&
		(payload.transactionIndex! < 0n ||
			payload.transactionIndex! > BigInt(decoded.transactionIndex!))
	)
		throw protocol('Checkpoint-local transaction index exceeds the global cursor index');
	if (hasItem(frame) && decoded.kind !== 'item')
		throw protocol('Ledger item requires an item watermark cursor');
	if (frame.event && frame.event.eventIndex === undefined)
		throw protocol('Event is missing its event index');
	return {
		cursor: toBase64(watermark.cursor),
		checkpoint: checkpoint?.toString() ?? decoded.checkpoint,
		coveredCheckpoint: watermark.checkpoint?.toString(),
		transactionIndex: decoded.transactionIndex,
		eventIndex: frame.event?.eventIndex,
	};
}

function mapItem(frame: RawFrame, include: Options['include']): Frame {
	let result: Frame;
	if (frame.checkpoint) {
		const checkpoint = frame.checkpoint;
		const summary = checkpoint.summary;
		if (
			checkpoint.sequenceNumber === undefined ||
			!checkpoint.digest ||
			summary?.epoch === undefined ||
			!summary.timestamp
		) {
			throw protocol('Checkpoint header is incomplete');
		}
		result = {
			$kind: 'Checkpoint',
			checkpoint: {
				sequenceNumber: checkpoint.sequenceNumber.toString(),
				digest: checkpoint.digest,
				epoch: summary.epoch.toString(),
				timestamp: (
					summary.timestamp.seconds * 1000n +
					BigInt(Math.floor(summary.timestamp.nanos / 1_000_000))
				).toString(),
			} satisfies SuiClientTypes.Checkpoint,
		};
	} else if (frame.transaction) {
		if (!frame.transaction.digest || !frame.transaction.effects?.status)
			throw protocol('Transaction response is incomplete');
		result = {
			$kind: 'Transaction',
			transaction: parseGrpcTransactionResponse(frame.transaction, { include }),
		};
	} else if (frame.event) {
		const event = frame.event;
		if (
			!event.packageId ||
			!event.module ||
			!event.sender ||
			!event.eventType ||
			!event.transactionDigest ||
			event.eventIndex === undefined
		) {
			throw protocol('Event response is incomplete');
		}
		result = {
			$kind: 'Event',
			event: {
				packageId: normalizeSuiAddress(event.packageId),
				module: event.module,
				sender: normalizeSuiAddress(event.sender),
				eventType: normalizeStructTag(event.eventType),
				bcs: event.contents?.value ?? new Uint8Array(),
				json: event.json ? (Value.toJson(event.json) as Record<string, unknown>) : null,
				checkpoint: event.checkpoint?.toString() ?? null,
				transactionDigest: event.transactionDigest,
				eventIndex: event.eventIndex,
			} satisfies SuiClientTypes.EventEntry,
		};
	} else throw protocol('Expected a ledger item');
	if (include?.proto) result.proto = frame.checkpoint ?? frame.transaction ?? frame.event;
	return result;
}

export function grpcLedgerStream(client: SuiGrpcClient, family: Family, input: Options) {
	let filter: TransactionFilter | EventFilter | undefined;
	const include = input.include;
	let callbackFailed = false;
	function onQueryEnd(frame: RawFrame, stage: GrpcStreamStage) {
		if (!frame.end) return;
		try {
			input.onQueryEnd?.({
				queryEnd: frame.end,
				watermark: frame.watermark!,
				stage,
				lastItem: frame.checkpoint ?? frame.transaction ?? frame.event,
			});
		} catch (error) {
			callbackFailed = true;
			throw error;
		}
	}
	const paths =
		family === 'checkpoints'
			? ['sequence_number', 'digest', 'summary.epoch', 'summary.timestamp']
			: family === 'transactions'
				? [...transactionReadMaskPaths(include), 'transaction_index']
				: [
						'package_id',
						'module',
						'sender',
						'event_type',
						'contents',
						'json',
						'checkpoint',
						'transaction_digest',
						'transaction_index',
						'event_index',
					];
	const readMask = { paths: [...new Set([...paths, ...(input.readMask ?? [])])] };
	const limit = input.maxBufferedItems ?? 1024;
	const pageSize = input.pageSize ?? 1000;

	function open(request: object, signal: AbortSignal, live: boolean, streamFamily = family) {
		const linked = linkedController(signal);
		const service = live ? client.subscriptionService : client.ledgerService;
		const method =
			`${live ? 'subscribe' : 'list'}${streamFamily[0].toUpperCase()}${streamFamily.slice(1)}` as 'listEvents';
		const call = (
			service as unknown as Record<
				string,
				(request: object, options: object) => ServerStreamingCall<object, RawFrame>
			>
		)[method](request, { abort: linked.controller.signal });
		const buffer = bufferedGrpcCall(call, linked.controller, {
			limit,
			isItem: hasItem,
			coalesceProgress: live,
		});
		return {
			buffer,
			close: async () => {
				await buffer.return?.();
				linked.dispose();
			},
		};
	}

	function bounds(request: LedgerStreamRequest) {
		const query: QueryOptions = {
			limit: pageSize,
			ordering: request.order === 'descending' ? Ordering.DESCENDING : Ordering.ASCENDING,
		};
		let startCheckpoint: bigint | undefined;
		let endCheckpoint: bigint | undefined;
		function set(bound: StreamBound | undefined, start: boolean) {
			if (!bound) return;
			const lower = start === (request.order === 'ascending');
			if ('checkpoint' in bound) {
				const checkpoint = BigInt(bound.checkpoint);
				const value = checkpoint + (request.order === 'descending' ? 1n : 0n);
				if (value > U64_MAX) {
					if (lower) throw protocol('Checkpoint bound overflows uint64');
					return;
				}
				if (lower) startCheckpoint = value;
				else endCheckpoint = value;
			} else if (bound.position.cursor === 'genesis') {
				if (lower) startCheckpoint = 0n;
				else endCheckpoint = 0n;
			} else if (bound.position.cursor.startsWith('checkpoint:')) {
				const cp = BigInt(bound.position.cursor.slice(11));
				const value = cp + (lower ? 1n : 0n);
				if (value > U64_MAX) throw protocol('Checkpoint continuation overflows uint64');
				if (lower) startCheckpoint = value;
				else endCheckpoint = value;
			} else {
				query[lower ? 'after' : 'before'] = fromBase64(bound.position.cursor);
			}
		}
		set(request.start, true);
		set(request.end, false);
		return { startCheckpoint, endCheckpoint, options: query };
	}

	function event(frame: RawFrame, live: boolean): LedgerStreamEvent<Frame> | undefined {
		const p = position(frame, family, live);
		if (hasItem(frame)) {
			return {
				$kind: 'item',
				position: p,
				frame: {
					...mapItem(frame, include),
					...(include?.progress ? { coveredCheckpoint: p.coveredCheckpoint } : {}),
				},
			};
		}
		// Cursor-bound watermarks denote the excluded endpoint, not consumed progress.
		if (frame.end?.reason === QueryEndReason.CURSOR_BOUND) {
			return;
		}
		return {
			$kind: 'progress',
			position: p,
			frame: include?.progress
				? { $kind: 'Progress', coveredCheckpoint: p.coveredCheckpoint }
				: undefined,
		};
	}

	async function* scan(
		request: LedgerStreamRequest,
		stage: GrpcStreamStage = 'historical',
	): AsyncGenerator<LedgerStreamEvent<Frame>> {
		// Do not deliver lower records before a requested descending start is indexed:
		// doing so would advance the continuation past the as-yet unavailable interval.
		const requestedStart =
			request.start &&
			('checkpoint' in request.start
				? request.start.checkpoint
				: request.start.position.cursor === 'genesis'
					? '0'
					: request.start.position.cursor.startsWith('checkpoint:')
						? request.start.position.cursor.slice(11)
						: decodeLedgerCursor(request.start.position.cursor, family).checkpoint);
		if (
			request.order === 'descending' &&
			requestedStart !== undefined &&
			BigInt(await adapter.getIndexedTip(request.signal)) < BigInt(requestedStart)
		) {
			yield { $kind: 'end', complete: false };
			return;
		}
		const range = bounds(request);
		let previousCursor =
			request.start && 'position' in request.start ? request.start.position.cursor : undefined;
		let covered: bigint | undefined;
		let previousPosition: StreamPosition | undefined;
		for (;;) {
			const rpc = open({ ...range, filter, readMask }, request.signal, false);
			let end: QueryEnd | undefined;
			let final: StreamPosition | undefined;
			let connected = false;
			try {
				for await (const frame of rpc.buffer) {
					if (!connected) {
						request.onStatus({ $kind: 'Connected' });
						connected = true;
					}
					if (end) throw protocol('Received a frame after QueryEnd');
					final = position(frame, family, false);
					if (
						previousPosition &&
						comparePositions(final, previousPosition) * (request.order === 'ascending' ? 1 : -1) < 0
					)
						throw protocol('Ledger cursor regressed');
					if (hasItem(frame) && previousPosition?.cursor === final.cursor)
						throw protocol('Ledger response repeated an item cursor');
					previousPosition = final;
					if (final.coveredCheckpoint !== undefined) {
						const cp = BigInt(final.coveredCheckpoint);
						if (
							covered !== undefined &&
							(request.order === 'ascending' ? cp < covered : cp > covered)
						)
							throw protocol('Ledger watermark regressed');
						covered = cp;
					}
					if (frame.end) {
						end = frame.end;
						if (
							!end.reason ||
							end.reason < QueryEndReason.ITEM_LIMIT ||
							end.reason > QueryEndReason.LEDGER_TIP
						)
							throw protocol('Unknown QueryEnd reason');
						if (end.reason === QueryEndReason.ITEM_LIMIT && !hasItem(frame))
							throw protocol('Item-limit terminal frame is missing its item');
						if (end.reason !== QueryEndReason.ITEM_LIMIT && hasItem(frame))
							throw protocol('Unexpected item on terminal query frame');
					}
					onQueryEnd(frame, stage);
					const next = event(frame, false);
					// Natural terminal cursors are scan boundaries, not items inside the
					// excluded checkpoint. Preserve that distinction when this progress is saved.
					if (
						next?.$kind === 'progress' &&
						frame.end &&
						(frame.end.reason === QueryEndReason.CHECKPOINT_BOUND ||
							frame.end.reason === QueryEndReason.LEDGER_TIP) &&
						decodeLedgerCursor(next.position.cursor, family).kind === 'boundary'
					) {
						next.position.checkpointBoundary = next.position.checkpoint;
					}
					if (next) yield next;
				}
			} finally {
				await rpc.close();
			}
			if (!end || !final) throw protocol('List RPC completed without QueryEnd');
			if (end.reason === QueryEndReason.ITEM_LIMIT || end.reason === QueryEndReason.SCAN_LIMIT) {
				if (final.cursor === previousCursor) throw protocol('List pagination did not advance');
				previousCursor = final.cursor;
				range.options[request.order === 'ascending' ? 'after' : 'before'] = fromBase64(
					final.cursor,
				);
				continue;
			}
			const target = range.endCheckpoint;
			const complete =
				end.reason !== QueryEndReason.LEDGER_TIP ||
				!request.end ||
				(request.order === 'ascending' &&
					final.coveredCheckpoint !== undefined &&
					((target !== undefined && BigInt(final.coveredCheckpoint) + 1n >= target) ||
						(request.capturedTip === U64_MAX.toString() &&
							BigInt(final.coveredCheckpoint) === U64_MAX)));
			yield { $kind: 'end', complete };
			return;
		}
	}

	async function* live(request: LedgerStreamRequest): AsyncGenerator<LedgerStreamEvent<Frame>> {
		const rpc = open({ filter, readMask }, request.signal, true);
		try {
			let first = await rpc.buffer.next();
			if (!first.done) request.onStatus({ $kind: 'Connected' });
			while (!first.done && request.start && 'checkpoint' in request.start) {
				const firstPosition = position(first.value, family, true);
				const checkpoint = hasItem(first.value)
					? firstPosition.checkpoint
					: firstPosition.coveredCheckpoint;
				if (checkpoint !== undefined && BigInt(checkpoint) >= BigInt(request.start.checkpoint))
					break;
				first = await rpc.buffer.next();
			}
			if (first.done)
				throw new RpcError('Subscription ended before its first frame', 'UNAVAILABLE');
			const frontier = position(first.value, family, true);
			let safe = request.start && 'position' in request.start ? request.start.position : undefined;
			if (request.start) {
				const target =
					first.value.checkpoint?.sequenceNumber ??
					first.value.transaction?.checkpoint ??
					first.value.event?.checkpoint ??
					(frontier.coveredCheckpoint !== undefined
						? BigInt(frontier.coveredCheckpoint)
						: undefined);
				if (target === undefined) throw protocol('Subscription handoff has no checkpoint position');
				if (target === U64_MAX) throw protocol('Subscription handoff overflows uint64');
				// Replay through the entire entry checkpoint. This resolves same-checkpoint
				// reconnects without ordering opaque cursor bytes or losing late indexed items.
				const end = { checkpoint: (target + 1n).toString() };
				let start = request.start;
				if (!safe || comparePositions(frontier, safe) >= 0) {
					request.onStatus?.({ $kind: 'Recovering' });
					for (;;) {
						let complete = false;
						for await (const next of scan({ ...request, start, end }, 'recovery')) {
							if (next.$kind === 'end') {
								complete = next.complete;
								continue;
							}
							if (next.$kind === 'item' || next.$kind === 'progress') {
								safe = next.position;
								start = { position: safe };
							}
							yield next;
						}
						if (complete) break;
						await waitForStream(input.pollInterval ?? 1000, request.signal);
					}
				}
			} else {
				// The subscription establishes the live start. When its first frame is an
				// item, the preceding checkpoint is the safe baseline before delivering it.
				const cp = frontier.checkpoint ?? frontier.coveredCheckpoint;
				if (cp !== undefined && hasItem(first.value)) {
					const baseline: StreamPosition =
						BigInt(cp) === 0n
							? { cursor: 'genesis', checkpoint: '0' }
							: checkpointPosition(BigInt(cp) - 1n);
					yield {
						$kind: 'progress',
						position: baseline,
						frame: include?.progress
							? { $kind: 'Progress', coveredCheckpoint: baseline.coveredCheckpoint }
							: undefined,
					};
				}
			}
			let current: IteratorResult<RawFrame> = first;
			let previousLive: StreamPosition | undefined;
			for (;;) {
				if (current.done) throw new RpcError('Ledger subscription disconnected', 'UNAVAILABLE');
				const p = position(current.value, family, true);
				if (previousLive && comparePositions(p, previousLive) < 0)
					throw protocol('Subscription watermark regressed');
				previousLive = p;
				if (
					!safe ||
					comparePositions(p, safe) > 0 ||
					(comparePositions(p, safe) === 0 &&
						!p.cursor.startsWith('checkpoint:') &&
						!safe.cursor.startsWith('checkpoint:') &&
						decodeLedgerCursor(safe.cursor).kind === 'boundary' &&
						decodeLedgerCursor(p.cursor).kind === 'item')
				) {
					yield event(current.value, true)!;
					safe = p;
				}
				current = await rpc.buffer.next();
			}
		} finally {
			await rpc.close();
		}
	}

	const adapter: LedgerStreamAdapter<Frame> = {
		transport: 'grpc',
		family,
		comparePositions,
		validatePosition(value) {
			if (value.cursor === 'genesis') {
				if (
					(value.checkpoint !== undefined && value.checkpoint !== '0') ||
					value.coveredCheckpoint !== undefined ||
					value.checkpointBoundary !== undefined ||
					value.transactionIndex !== undefined ||
					value.eventIndex !== undefined
				)
					throw protocol('Invalid genesis continuation');
				return;
			}
			if (value.cursor.startsWith('checkpoint:')) {
				const cp = value.cursor.slice(11);
				if (
					!/^(0|[1-9]\d*)$/.test(cp) ||
					BigInt(cp) > U64_MAX ||
					(value.checkpoint !== undefined && value.checkpoint !== cp) ||
					(value.coveredCheckpoint !== undefined && value.coveredCheckpoint !== cp) ||
					value.transactionIndex !== undefined ||
					value.eventIndex !== undefined ||
					value.checkpointBoundary !== undefined
				)
					throw protocol('Invalid checkpoint continuation');
				return;
			}
			const decoded = decodeLedgerCursor(value.cursor, family);
			if (
				value.checkpointBoundary !== undefined &&
				(decoded.kind !== 'boundary' || value.checkpointBoundary !== decoded.checkpoint)
			)
				throw protocol('Checkpoint boundary does not match its native cursor');
			for (const key of ['checkpoint', 'transactionIndex', 'eventIndex'] as const) {
				if (value[key] !== undefined && value[key] !== decoded[key])
					throw protocol('Resume position does not match its native cursor');
			}
		},
		liveFromTip: true,
		async initialize(signal) {
			if (input.filter !== undefined && input.grpcFilter !== undefined)
				throw new TypeError('filter and grpcFilter are mutually exclusive');
			if (input.readMask && !include?.proto) throw new TypeError('readMask requires include.proto');
			for (const [name, value] of [
				['pageSize', pageSize],
				['maxBufferedItems', limit],
			] as const) {
				if (!Number.isSafeInteger(value) || value <= 0 || value > 0xffffffff)
					throw new TypeError(`${name} must be a positive uint32`);
			}
			if (input.grpcFilter) filter = input.grpcFilter;
			else if (input.filter)
				filter =
					family === 'events'
						? toGrpcEventFilter(
								await resolveEventFilter(
									client.mvr,
									input.filter as SuiClientTypes.EventFilter,
									signal,
								),
							)
						: toGrpcTransactionFilter(
								await resolveTransactionFilter(
									client.mvr,
									input.filter as SuiClientTypes.TransactionFilter,
									signal,
								),
							);
			const { chainIdentifier } = await client.getChainIdentifier({ signal });
			return { chain: chainIdentifier, filter: filter ?? null };
		},
		async getIndexedTip(signal) {
			const rpc = open(
				{
					readMask: { paths: ['sequence_number'] },
					options: { limit: 1, ordering: Ordering.DESCENDING },
				},
				signal,
				false,
				'checkpoints',
			);
			try {
				let tip: string | undefined;
				let terminal = false;
				for await (const frame of rpc.buffer) {
					if (terminal) throw protocol('Received a frame after tip QueryEnd');
					if (frame.checkpoint?.sequenceNumber !== undefined)
						tip = frame.checkpoint.sequenceNumber.toString();
					if (frame.end) {
						if (
							!frame.watermark?.cursor?.length ||
							!frame.end.reason ||
							frame.end.reason > QueryEndReason.LEDGER_TIP
						)
							throw protocol('Invalid indexed tip QueryEnd');
						terminal = true;
						onQueryEnd(frame, 'tip');
					}
				}
				if (!terminal || tip === undefined) throw protocol('Indexed checkpoint tip is unavailable');
				return tip;
			} finally {
				await rpc.close();
			}
		},
		isRetryable(error) {
			return (
				!callbackFailed &&
				error instanceof RpcError &&
				[
					'UNAVAILABLE',
					'DEADLINE_EXCEEDED',
					'RESOURCE_EXHAUSTED',
					'ABORTED',
					'UNKNOWN',
					'CANCELLED',
				].includes(error.code)
			);
		},
		scan,
		live,
	};
	return createLedgerStream<Frame>(input, adapter);
}
