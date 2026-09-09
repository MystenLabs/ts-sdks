// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { maxValue, minValue, number, parse, pipe, safeInteger } from 'valibot';

import { fromBase64, toBase64 } from '@mysten/utils';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { ServerStreamingCall } from '@protobuf-ts/runtime-rpc';
import type { SuiClientTypes } from '../client/types.js';
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
function comparePositions(a: StreamPosition, b: StreamPosition): number | undefined {
	if (a.cursor === b.cursor) return 0;
	if (a.cursor === 'genesis') return -1;
	if (b.cursor === 'genesis') return 1;
	// Item coordinates and scan coverage are different domains. A watermark can
	// advance inside a checkpoint without having finished that checkpoint.
	if (a.checkpoint === undefined || b.checkpoint === undefined) {
		if (
			a.checkpoint !== undefined ||
			b.checkpoint !== undefined ||
			a.coveredCheckpoint === undefined ||
			b.coveredCheckpoint === undefined
		)
			return undefined;
		const ac = BigInt(a.coveredCheckpoint);
		const bc = BigInt(b.coveredCheckpoint);
		return ac === bc ? undefined : ac < bc ? -1 : 1;
	}
	const ac = BigInt(a.checkpoint);
	const bc = BigInt(b.checkpoint);
	if (ac !== bc) return ac < bc ? -1 : 1;
	for (const field of ['transactionIndex', 'eventIndex'] as const) {
		if (a[field] === undefined || b[field] === undefined) {
			if (a[field] !== b[field]) return undefined;
			continue;
		}
		if (a[field] !== b[field]) return BigInt(a[field]) < BigInt(b[field]) ? -1 : 1;
	}
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
	const checkpoint = frame.checkpoint?.sequenceNumber ?? payload?.checkpoint;
	if (hasItem(frame) && checkpoint === undefined)
		throw protocol('Ledger item is missing its checkpoint');
	if (payload && payload.transactionIndex === undefined)
		throw protocol('Ledger item is missing its transaction index');
	if (frame.event && frame.event.eventIndex === undefined)
		throw protocol('Event is missing its event index');
	return {
		cursor: toBase64(watermark.cursor),
		checkpoint: checkpoint?.toString(),
		coveredCheckpoint: watermark.checkpoint?.toString(),
		transactionIndex: payload?.transactionIndex?.toString(),
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
				watermark: frame.watermark ?? {},
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
	const readMask = { paths };
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

	function event(
		frame: RawFrame,
		live: boolean,
		knownPosition?: StreamPosition,
	): LedgerStreamEvent<Frame> | undefined {
		// A cursor bound is an excluded endpoint, never committed progress.
		if (!hasItem(frame) && frame.end?.reason === QueryEndReason.CURSOR_BOUND) return;
		const p = knownPosition ?? position(frame, family, live);
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
						: (request.start.position.checkpoint ?? request.start.position.coveredCheckpoint));
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
		let covered =
			request.start &&
			'position' in request.start &&
			request.start.position.coveredCheckpoint !== undefined
				? BigInt(request.start.position.coveredCheckpoint)
				: undefined;
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
					if (!hasItem(frame) && frame.end?.reason === QueryEndReason.CURSOR_BOUND) {
						end = frame.end;
						onQueryEnd(frame, stage);
						continue;
					}
					final = position(frame, family, false);
					if (
						previousPosition?.checkpoint !== undefined &&
						final.checkpoint !== undefined &&
						(comparePositions(final, previousPosition) ?? 0) *
							(request.order === 'ascending' ? 1 : -1) <
							0
					)
						throw protocol('Ledger cursor regressed');
					if (hasItem(frame) && previousPosition?.cursor === final.cursor)
						throw protocol('Ledger response repeated an item cursor');
					previousPosition = final;
					if (final.coveredCheckpoint === undefined) final.coveredCheckpoint = covered?.toString();
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
					const next = event(frame, false, final);
					if (next?.$kind === 'progress' && frame.end) {
						if (frame.end.reason === QueryEndReason.CHECKPOINT_BOUND) {
							next.position.checkpointBoundary = (
								request.order === 'ascending' ? range.endCheckpoint : range.startCheckpoint
							)?.toString();
						} else if (
							frame.end.reason === QueryEndReason.LEDGER_TIP &&
							request.order === 'ascending' &&
							next.position.coveredCheckpoint !== undefined &&
							BigInt(next.position.coveredCheckpoint) < U64_MAX
						) {
							next.position.checkpointBoundary = (
								BigInt(next.position.coveredCheckpoint) + 1n
							).toString();
						}
					}
					if (next) yield next;
				}
			} finally {
				await rpc.close();
			}
			if (!end || (!final && end.reason !== QueryEndReason.CURSOR_BOUND))
				throw protocol('List RPC completed without QueryEnd');
			if (end.reason === QueryEndReason.CURSOR_BOUND) {
				yield { $kind: 'end', complete: true };
				return;
			}
			if (!final) throw protocol('List RPC completed without a watermark');
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
		let previousLive: StreamPosition | undefined;
		async function read() {
			const current = await rpc.buffer.next();
			if (current.done) throw new RpcError('Ledger subscription disconnected', 'UNAVAILABLE');
			const p = position(current.value, family, true);
			if (previousLive) {
				if (
					previousLive.coveredCheckpoint !== undefined &&
					(p.coveredCheckpoint === undefined ||
						BigInt(p.coveredCheckpoint) < BigInt(previousLive.coveredCheckpoint))
				)
					throw protocol('Subscription checkpoint coverage regressed or became unavailable');
				if (hasItem(current.value) && previousLive.cursor === p.cursor)
					throw protocol('Subscription item repeated its cursor');
				if ((comparePositions(p, previousLive) ?? 0) < 0)
					throw protocol('Subscription item position regressed');
			}
			previousLive = p;
			return { frame: current.value, position: p };
		}
		try {
			let current = await read();
			request.onStatus({ $kind: 'Connected' });
			let safe = request.start && 'position' in request.start ? request.start.position : undefined;
			const requestedCheckpoint =
				request.start && 'checkpoint' in request.start
					? request.start.checkpoint
					: safe?.cursor === 'genesis'
						? '0'
						: undefined;
			let replayItem =
				safe?.transactionIndex !== undefined || family === 'checkpoints' ? safe : undefined;
			let replayCoverage: string | undefined;
			let end: StreamBound | undefined;
			if (requestedCheckpoint !== undefined) {
				for (;;) {
					const cp = current.position.checkpoint ?? current.position.coveredCheckpoint;
					if (cp !== undefined && BigInt(cp) >= BigInt(requestedCheckpoint)) {
						if (BigInt(cp) === U64_MAX) throw protocol('Subscription handoff overflows uint64');
						end = { checkpoint: (BigInt(cp) + 1n).toString() };
						break;
					}
					current = await read();
				}
			} else if (safe) {
				for (;;) {
					const incoming = current.position;
					const committedCoverage = safe.coveredCheckpoint;
					const incomingCoverage = incoming.coveredCheckpoint;
					if (
						incoming.cursor === safe.cursor &&
						!(
							committedCoverage !== undefined &&
							incomingCoverage !== undefined &&
							BigInt(incomingCoverage) < BigInt(committedCoverage)
						)
					)
						break;
					if (
						committedCoverage !== undefined &&
						incomingCoverage !== undefined &&
						BigInt(incomingCoverage) >= BigInt(committedCoverage)
					) {
						if (BigInt(incomingCoverage) > BigInt(committedCoverage) && family !== 'checkpoints') {
							end = { position: incoming };
						} else {
							// A cursor can be inside the next checkpoint. Explicit item metadata
							// lets recovery include that checkpoint without interpreting its cursor.
							if (
								family !== 'checkpoints' &&
								safe.checkpoint === undefined &&
								incoming.checkpoint === undefined
							) {
								current = await read();
								continue;
							}
							const upper = [
								committedCoverage,
								safe.checkpoint,
								incoming.checkpoint,
							].reduce<bigint>(
								(maximum, cp) => (cp !== undefined && BigInt(cp) > maximum ? BigInt(cp) : maximum),
								BigInt(incomingCoverage),
							);
							if (upper === U64_MAX) throw protocol('Subscription handoff overflows uint64');
							end = { checkpoint: (upper + 1n).toString() };
						}
						break;
					}
					// Different subscriptions have no cursor ordering guarantee. Wait until
					// equality or reported coverage establishes a recoverable interval.
					current = await read();
				}
			}
			if (end) {
				request.onStatus({ $kind: 'Recovering' });
				let start = request.start;
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
							if (safe.coveredCheckpoint !== undefined) replayCoverage = safe.coveredCheckpoint;
							if (next.$kind === 'item') {
								if (replayItem && (comparePositions(safe, replayItem) ?? 1) <= 0) continue;
								replayItem = safe;
							}
						}
						yield next;
					}
					if (complete) break;
					await waitForStream(input.pollInterval ?? 1000, request.signal);
				}
			} else if (!request.start && hasItem(current.frame)) {
				const cp = current.position.checkpoint!;
				const baseline: StreamPosition =
					BigInt(cp) === 0n
						? { cursor: 'genesis', checkpoint: '0' }
						: checkpointPosition(BigInt(cp) - 1n);
				safe = baseline;
				yield {
					$kind: 'progress',
					position: baseline,
					frame: include?.progress
						? { $kind: 'Progress', coveredCheckpoint: baseline.coveredCheckpoint }
						: undefined,
				};
			}
			for (;;) {
				const p = current.position;
				const item = hasItem(current.frame);
				const sameCursorAdvancedCoverage =
					!item &&
					p.coveredCheckpoint !== undefined &&
					(safe?.coveredCheckpoint === undefined ||
						BigInt(p.coveredCheckpoint) > BigInt(safe.coveredCheckpoint));
				const overlaps =
					(p.cursor === safe?.cursor && !sameCursorAdvancedCoverage) ||
					(item &&
						((replayItem !== undefined && (comparePositions(p, replayItem) ?? 1) <= 0) ||
							(replayCoverage !== undefined &&
								p.checkpoint !== undefined &&
								BigInt(p.checkpoint) <= BigInt(replayCoverage))));
				const progressBehindReplay =
					!item &&
					replayCoverage !== undefined &&
					(p.coveredCheckpoint === undefined ||
						BigInt(p.coveredCheckpoint) <= BigInt(replayCoverage));
				if (!overlaps && !progressBehindReplay) {
					const committed = {
						...p,
						coveredCheckpoint: p.coveredCheckpoint ?? safe?.coveredCheckpoint,
					};
					yield event(current.frame, true, committed)!;
					safe = committed;
				}
				current = await read();
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
			// Resume tokens own their metadata; the server owns native cursor validation.
			if (fromBase64(value.cursor).length === 0) throw protocol('Empty ledger cursor');
		},
		liveFromTip: true,
		async initialize(signal) {
			parse(pipe(number(), safeInteger(), minValue(1), maxValue(0xffffffff)), pageSize);
			parse(pipe(number(), safeInteger(), minValue(1)), limit);
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
