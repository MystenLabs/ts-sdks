// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferBcsType } from '@mysten/bcs';
import { blake2b } from '@noble/hashes/blake2.js';

import { check, parse, pipe, regex, string } from 'valibot';

import type { SuiClientTypes } from './types.js';
import {
	type tokenPayload,
	decodeToken,
	encodeToken,
	type GrpcStreamPosition,
	type GraphQLStreamPosition,
} from './stream-token.js';

/** Opaque server cursor with separately reported ledger position and coverage. */
export type StreamPosition = GrpcStreamPosition | GraphQLStreamPosition;

export type StreamBound<Position extends StreamPosition = StreamPosition> =
	{ checkpoint: string } | { position: Position };

export interface LedgerStreamRequest<Position extends StreamPosition = StreamPosition> {
	start?: StreamBound<Position>;
	end?: StreamBound<Position>;
	order: SuiClientTypes.Order;
	capturedTip?: string;
	signal: AbortSignal;
	onStatus: (status: SuiClientTypes.StreamStatus) => void;
}

export type LedgerStreamEvent<
	Frame extends object,
	Position extends StreamPosition = StreamPosition,
> =
	| { $kind: 'item'; frame: Frame; position: Position }
	| { $kind: 'progress'; position: Position; frame?: Frame }
	| { $kind: 'metadata'; frame: Frame }
	| { $kind: 'end'; complete: boolean };

export interface LedgerStreamAdapter<
	Frame extends object,
	Position extends StreamPosition = StreamPosition,
> {
	transport: Position extends GrpcStreamPosition ? 'grpc' : 'graphql';
	family: 'checkpoints' | 'transactions' | 'events';
	/** Native live delivery publishes its own initial safe progress before subsequent items. */
	liveFromTip?: boolean;
	/** Resolve MVR predicates before producing a stable filter identity. */
	initialize(signal: AbortSignal): Promise<{ chain: string; filter: unknown }>;
	/** Discover the readable indexed boundary, not the most recently executed checkpoint. */
	getIndexedTip(signal: AbortSignal): Promise<string>;
	/** Compare reported positions; return undefined when their order is unknown. */
	comparePositions?(a: Position, b: Position): number | undefined;
	/** Validate SDK position metadata without interpreting the native cursor. */
	validatePosition?(position: Position): void;
	isRetryable(error: unknown): boolean;
	/** Paginate to the requested bound or indexed tip; always emit an explicit end event. */
	scan(request: LedgerStreamRequest<Position>): AsyncIterable<LedgerStreamEvent<Frame, Position>>;
	/** Own native handoff, overlap removal, and bounded buffering. EOF is not completion. */
	live(request: LedgerStreamRequest<Position>): AsyncIterable<LedgerStreamEvent<Frame, Position>>;
}

type TokenRange<Position extends StreamPosition = StreamPosition> = InferBcsType<
	ReturnType<typeof tokenPayload<Position, Position>>
>['range'];

function rangeEnd<Position extends StreamPosition>(
	range: TokenRange<Position>,
): StreamBound<Position> | undefined {
	if (range.$kind === 'Follow') return;
	const end = range.Finite.end;
	switch (end.$kind) {
		case 'Checkpoint':
			return { checkpoint: end.Checkpoint };
		case 'Cursor':
			return { position: end.Cursor };
		case 'IndexedTip':
			return { checkpoint: (BigInt(end.IndexedTip) + 1n).toString() };
		default:
			return undefined;
	}
}

function rangeTip(range: TokenRange): string | null {
	if (range.$kind === 'Follow') return null;
	return range.Finite.end.$kind === 'IndexedTip'
		? range.Finite.end.IndexedTip
		: range.Finite.capturedTip;
}

function rangeOrder(range: TokenRange): SuiClientTypes.Order {
	return range.$kind === 'Follow' ? 'ascending' : range.Finite.order.$kind;
}

const MAX_CHECKPOINT = (1n << 64n) - 1n;

/** Sorted keys bind semantically identical resolved filters regardless of property order. */
function canonical(value: unknown): string {
	if (value === undefined) return 'null';
	if (typeof value === 'bigint') return JSON.stringify(value.toString());
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

const checkpointSchema = (maximum = MAX_CHECKPOINT) =>
	pipe(
		string(),
		regex(/^(0|[1-9]\d*)$/),
		check((value) => BigInt(value) <= maximum),
	);
const Checkpoint = checkpointSchema();
function streamRetryOptions(
	options: SuiClientTypes.StreamOptions,
): Required<SuiClientTypes.StreamRetryOptions> {
	for (const bound of [options.start, options.end]) {
		if (bound?.checkpoint != null) parse(Checkpoint, bound.checkpoint);
	}
	return {
		initialDelay: options.retry?.initialDelay ?? 250,
		maxDelay: options.retry?.maxDelay ?? 30_000,
		jitter: options.retry?.jitter ?? 500,
		maxAttempts: options.retry?.maxAttempts ?? Infinity,
	};
}

/** The timer and listener are removed on either completion path. */
export function waitForStream(delay: number, signal: AbortSignal): Promise<void> {
	signal.throwIfAborted();
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', onAbort);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, delay);
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

function compareBounds<Frame extends object, Position extends StreamPosition>(
	start: StreamBound<Position>,
	end: StreamBound<Position>,
	order: SuiClientTypes.Order,
	adapter: LedgerStreamAdapter<Frame, Position>,
): number | undefined {
	if ('position' in start && 'position' in end) {
		if (start.position.cursor === end.position.cursor) return 0;
		const comparison = adapter.comparePositions?.(start.position, end.position);
		if (comparison != null) return comparison;
	}
	const aBoundary =
		'checkpoint' in start ||
		('checkpointBoundary' in start.position && start.position.checkpointBoundary !== null);
	const bBoundary =
		'checkpoint' in end ||
		('checkpointBoundary' in end.position && end.position.checkpointBoundary !== null);
	const a =
		'checkpoint' in start
			? (BigInt(start.checkpoint) + (order === 'descending' ? 1n : 0n)).toString()
			: (('checkpointBoundary' in start.position ? start.position.checkpointBoundary : null) ??
				start.position.checkpoint);
	const b =
		'checkpoint' in end
			? (BigInt(end.checkpoint) + (order === 'descending' ? 1n : 0n)).toString()
			: (('checkpointBoundary' in end.position ? end.position.checkpointBoundary : null) ??
				end.position.checkpoint);
	if (a == null || b == null) return;
	if (BigInt(a) !== BigInt(b)) return BigInt(a) < BigInt(b) ? -1 : 1;
	if (aBoundary && bBoundary) return 0;
	if (aBoundary) return -1;
	if (bBoundary) return 1;
	// The server resolves bounds whose relative order is not available in response metadata.
	return;
}

/**
 * Shared continuation/control loop. Adapters only publish positions once every preceding
 * matching item has been yielded. Projection choices do not change token compatibility.
 */
export function createLedgerStream<Frame extends object, Position extends StreamPosition>(
	options: SuiClientTypes.StreamOptions,
	adapter: LedgerStreamAdapter<Frame, Position>,
): AsyncGenerator<Frame | SuiClientTypes.StreamCompletionFrame> {
	const controller = new AbortController();
	const signal = controller.signal;
	const onAbort = () => controller.abort(options.signal?.reason);
	let callbackFailed = false;
	const onStatus = (status: SuiClientTypes.StreamStatus) => {
		try {
			options.onStatus?.(status);
		} catch (error) {
			callbackFailed = true;
			throw error;
		}
	};
	async function* run(): AsyncGenerator<Frame | SuiClientTypes.StreamCompletionFrame> {
		if (options.signal?.aborted) onAbort();
		options.signal?.addEventListener('abort', onAbort, { once: true });
		let attempts = 0;
		try {
			signal.throwIfAborted();
			const retry = streamRetryOptions(options);
			const startEnvelope = options.start?.resumeToken
				? decodeToken(options.start.resumeToken).V1
				: undefined;
			const endEnvelope = options.end?.resumeToken
				? decodeToken(options.end.resumeToken).V1
				: undefined;
			const startToken = startEnvelope?.[startEnvelope.$kind];
			const endToken = endEnvelope?.[endEnvelope.$kind];
			const order = options.order ?? (startToken ? rangeOrder(startToken.range) : 'ascending');
			if (startToken && order !== rangeOrder(startToken.range))
				throw new Error('Resume token traversal order cannot change');
			const follow =
				options.follow ??
				(options.end
					? false
					: startToken
						? startToken.range.$kind === 'Follow'
						: order === 'ascending');
			if (follow && (order === 'descending' || options.end)) {
				throw new Error('Following requires ascending order without an end bound');
			}
			if (startToken && startToken.range.$kind === 'Finite' && follow)
				throw new Error('Cannot expand a finite resume token range');
			if (!follow && order === 'ascending' && !options.start)
				throw new Error('Ascending finite streams require an explicit start');

			const retryOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
				for (;;) {
					signal.throwIfAborted();
					try {
						return await operation();
					} catch (error) {
						await retryAfter(error);
					}
				}
			};
			const retryAfter = async (error: unknown) => {
				signal.throwIfAborted();
				if (callbackFailed || !adapter.isRetryable(error) || attempts >= retry.maxAttempts)
					throw error;
				const delay =
					Math.min(retry.maxDelay, retry.initialDelay * 2 ** Math.min(attempts, 52)) +
					Math.random() * retry.jitter;
				attempts++;
				onStatus({ $kind: 'Retrying', attempt: attempts, delay, error });
				await waitForStream(delay, signal);
			};
			const identity = await retryOperation(() => adapter.initialize(signal));
			if (!identity.chain) throw new Error('Stream chain identity is missing');
			const filter = blake2b(new TextEncoder().encode(canonical(identity.filter)), { dkLen: 32 });
			for (const envelope of [startEnvelope, endEnvelope]) {
				const token = envelope?.[envelope.$kind];
				if (
					token &&
					(envelope!.$kind !== adapter.transport ||
						token.family.$kind !== adapter.family ||
						token.chain !== identity.chain ||
						token.filter.some((byte, index) => byte !== filter[index]))
				) {
					throw new Error(
						'Resume token is incompatible with the stream transport, chain, family, or resolved filter',
					);
				}
				if (token) {
					adapter.validatePosition?.(token.position as Position);
					if (token.range.$kind === 'Finite' && token.range.Finite.end.$kind === 'Cursor')
						adapter.validatePosition?.(token.range.Finite.end.Cursor as Position);
				}
			}
			const inputStart: StreamBound<Position> | undefined = startToken
				? { position: startToken.position as Position }
				: options.start?.checkpoint != null
					? { checkpoint: options.start.checkpoint }
					: undefined;
			const inputEnd: StreamBound<Position> | undefined = endToken
				? { position: endToken.position as Position }
				: options.end?.checkpoint != null
					? { checkpoint: options.end.checkpoint }
					: undefined;
			if (
				startToken &&
				startToken.range.$kind === 'Finite' &&
				inputEnd &&
				canonical(inputEnd) !== canonical(rangeEnd<StreamPosition>(startToken.range))
			) {
				throw new Error('Resume token end bound cannot change');
			}
			let start = inputStart;
			let capturedTip = startToken ? rangeTip(startToken.range) : null;
			const resumesFiniteRange = startToken?.range.$kind === 'Finite';
			const needsFiniteTip = !follow && !inputEnd && !resumesFiniteRange && order === 'ascending';
			if (
				(!start &&
					!(follow && (options.delivery ?? 'subscribe') === 'subscribe' && adapter.liveFromTip)) ||
				needsFiniteTip
			) {
				const tip =
					capturedTip ??
					parse(Checkpoint, await retryOperation(() => adapter.getIndexedTip(signal)));
				if (!follow) capturedTip = tip;
				if (!start)
					start = { checkpoint: order === 'descending' ? tip : (BigInt(tip) + 1n).toString() };
			}
			let range: TokenRange<Position>;
			if (resumesFiniteRange) {
				range = startToken.range as TokenRange<Position>;
			} else if (follow) {
				range = { $kind: 'Follow', Follow: true };
			} else {
				let end: NonNullable<TokenRange<Position>['Finite']>['end'];
				if (inputEnd && 'checkpoint' in inputEnd)
					end = { $kind: 'Checkpoint', Checkpoint: inputEnd.checkpoint };
				else if (inputEnd) end = { $kind: 'Cursor', Cursor: inputEnd.position };
				else if (order === 'descending') end = { $kind: 'Genesis', Genesis: true };
				else end = { $kind: 'IndexedTip', IndexedTip: capturedTip! };
				range = {
					$kind: 'Finite',
					Finite: {
						order:
							order === 'ascending'
								? { $kind: 'ascending', ascending: true }
								: { $kind: 'descending', descending: true },
						capturedTip: end.$kind === 'IndexedTip' ? null : capturedTip,
						end,
					},
				};
			}
			const invocationStart = start;
			const end = rangeEnd(range);
			let lastToken: string | undefined;
			const tokenFor = (position: Position): string => {
				const payload = {
					family: { [adapter.family]: true } as
						{ checkpoints: true } | { transactions: true } | { events: true },
					chain: identity.chain,
					filter,
					position,
					range,
				};
				// The adapter's transport determines Position and the matching BCS variant.
				return encodeToken({
					V1: adapter.transport === 'grpc' ? { grpc: payload } : { graphql: payload },
				} as Parameters<typeof encodeToken>[0]);
			};
			if (startToken) lastToken = tokenFor(startToken.position as Position);
			const publicBound = (bound: StreamBound<Position>): SuiClientTypes.StreamStart =>
				'checkpoint' in bound ? bound : { resumeToken: tokenFor(bound.position) };
			const complete = (): SuiClientTypes.StreamCompletionFrame => ({
				$kind: 'Complete',
				completion: {
					order,
					reason:
						range.$kind === 'Finite' && range.Finite.end.$kind === 'Checkpoint'
							? 'checkpointBound'
							: range.$kind === 'Finite' && range.Finite.end.$kind === 'Cursor'
								? 'cursorBound'
								: range.$kind === 'Finite' && range.Finite.end.$kind === 'Genesis'
									? 'genesis'
									: 'indexedTip',
					resumeToken: lastToken,
					range: {
						start: invocationStart && publicBound(invocationStart),
						end: end && publicBound(end),
						capturedCheckpoint: rangeTip(range) ?? undefined,
					},
				},
			});
			if (start && end) {
				const comparison = compareBounds(start, end, order, adapter);
				if (comparison != null && comparison * (order === 'ascending' ? 1 : -1) > 0)
					throw new Error('Stream start and end bounds are reversed');
				if (comparison === 0) {
					if (options.include?.completion) yield complete();
					return;
				}
			}
			for (;;) {
				signal.throwIfAborted();
				const live = follow && (options.delivery ?? 'subscribe') === 'subscribe';
				try {
					onStatus({ $kind: 'Connecting', attempt: attempts });
					const request: LedgerStreamRequest<Position> = {
						start,
						end,
						order,
						capturedTip: rangeTip(range) ?? undefined,
						signal,
						onStatus,
					};
					let ended = false;
					let covered = false;
					for await (const event of live ? adapter.live(request) : adapter.scan(request)) {
						signal.throwIfAborted();
						if (ended) throw new Error('Stream adapter emitted data after its end');
						switch (event.$kind) {
							case 'item':
							case 'progress': {
								if (
									!start ||
									!('position' in start) ||
									canonical(start.position) !== canonical(event.position)
								)
									attempts = 0;
								start = { position: event.position };
								lastToken = tokenFor(event.position);
								if (event.frame) yield { ...event.frame, resumeToken: lastToken } as Awaited<Frame>;
								break;
							}
							case 'metadata':
								yield event.frame;
								break;
							case 'end':
								ended = true;
								covered = event.complete;
								break;
						}
					}
					if (live || !ended)
						throw new Error('Ledger stream ended without a terminal range result');
					if (!follow && covered) {
						if (options.include?.completion) yield complete();
						return;
					}
					await waitForStream(options.pollInterval ?? 1000, signal);
				} catch (error) {
					await retryAfter(error);
				}
			}
		} catch (error) {
			if (!signal.aborted && !callbackFailed) onStatus({ $kind: 'Error', error });
			throw error;
		} finally {
			controller.abort();
			options.signal?.removeEventListener('abort', onAbort);
		}
	}
	const iterator = run();
	// Async generators queue return behind a pending next. Abort first so a quiet
	// subscription or retry timer can finish that next and release its resources.
	const originalReturn = iterator.return.bind(iterator);
	iterator.return = (value) => {
		controller.abort();
		return originalReturn(value);
	};
	const originalThrow = iterator.throw.bind(iterator);
	iterator.throw = (error) => {
		controller.abort(error);
		return originalThrow(error);
	};
	return iterator;
}
