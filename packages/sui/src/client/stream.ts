// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/utils';
import { blake2b } from '@noble/hashes/blake2.js';

import {
	check,
	finite,
	literal,
	minValue,
	number,
	object,
	parse,
	pipe,
	regex,
	safeInteger,
	string,
	union,
} from 'valibot';

import type { SuiClientTypes } from './types.js';
import { decodeToken, encodeToken } from './stream-token.js';

/** Opaque server cursor with separately reported ledger position and coverage. */
export interface StreamPosition {
	cursor: string;
	checkpoint?: string;
	coveredCheckpoint?: string;
	/** Canonical boundary immediately before this checkpoint, proven by a terminal scan. */
	checkpointBoundary?: string;
	transactionIndex?: string;
	eventIndex?: number;
	/** Stable item identity from the response, independent of its cursor encoding. */
	itemId?: string;
	/** Checkpoint known to be indexed when the scan cursor was received. */
	indexedCheckpoint?: string;
}

export type StreamBound = { checkpoint: string } | { position: StreamPosition };

export interface LedgerStreamRequest {
	start?: StreamBound;
	end?: StreamBound;
	order: SuiClientTypes.Order;
	capturedTip?: string;
	signal: AbortSignal;
	onStatus: (status: SuiClientTypes.StreamStatus) => void;
}

export type LedgerStreamEvent<Frame extends object> =
	| { $kind: 'item'; frame: Frame; position: StreamPosition }
	| { $kind: 'progress'; position: StreamPosition; frame?: Frame }
	| { $kind: 'metadata'; frame: Frame }
	| { $kind: 'end'; complete: boolean };

export interface LedgerStreamAdapter<Frame extends object> {
	transport: 'grpc' | 'graphql';
	family: 'checkpoints' | 'transactions' | 'events';
	/** Native live delivery publishes its own initial safe progress before subsequent items. */
	liveFromTip?: boolean;
	/** Resolve MVR predicates before producing a stable filter identity. */
	initialize(signal: AbortSignal): Promise<{ chain: string; filter: unknown }>;
	/** Discover the readable indexed boundary, not the most recently executed checkpoint. */
	getIndexedTip(signal: AbortSignal): Promise<string>;
	/** Compare reported positions; return undefined when their order is unknown. */
	comparePositions?(a: StreamPosition, b: StreamPosition): number | undefined;
	/** Validate SDK position metadata without interpreting the native cursor. */
	validatePosition?(position: StreamPosition): void;
	isRetryable(error: unknown): boolean;
	/** Paginate to the requested bound or indexed tip; always emit an explicit end event. */
	scan(request: LedgerStreamRequest): AsyncIterable<LedgerStreamEvent<Frame>>;
	/** Own native handoff, overlap removal, and bounded buffering. EOF is not completion. */
	live(request: LedgerStreamRequest): AsyncIterable<LedgerStreamEvent<Frame>>;
}

interface StoredRange {
	start?: StreamBound;
	end?: StreamBound;
	capturedTip?: string;
	follow: boolean;
	reason: SuiClientTypes.StreamCompletion['reason'];
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
	parse(
		pipe(
			number(),
			finite(),
			check((value) => value > 0, 'Stream pollInterval must be positive'),
		),
		options.pollInterval ?? 1000,
	);
	for (const bound of [options.start, options.end]) {
		if (bound?.checkpoint !== undefined) parse(Checkpoint, bound.checkpoint);
	}
	const retry = {
		initialDelay: options.retry?.initialDelay ?? 250,
		maxDelay: options.retry?.maxDelay ?? 30_000,
		jitter: options.retry?.jitter ?? 500,
		maxAttempts: options.retry?.maxAttempts ?? Infinity,
	};
	parse(
		object({
			initialDelay: pipe(number(), finite(), minValue(0)),
			maxDelay: pipe(number(), finite(), minValue(0)),
			jitter: pipe(number(), finite(), minValue(0)),
			maxAttempts: union([literal(Infinity), pipe(number(), safeInteger(), minValue(0))]),
		}),
		retry,
	);
	return retry;
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

function compareBounds<Frame extends object>(
	start: StreamBound,
	end: StreamBound,
	order: SuiClientTypes.Order,
	adapter: LedgerStreamAdapter<Frame>,
): number | undefined {
	if ('position' in start && 'position' in end) {
		if (start.position.cursor === end.position.cursor) return 0;
		const comparison = adapter.comparePositions?.(start.position, end.position);
		if (comparison !== undefined) return comparison;
	}
	const aBoundary = 'checkpoint' in start || start.position.checkpointBoundary !== undefined;
	const bBoundary = 'checkpoint' in end || end.position.checkpointBoundary !== undefined;
	const a =
		'checkpoint' in start
			? (BigInt(start.checkpoint) + (order === 'descending' ? 1n : 0n)).toString()
			: (start.position.checkpointBoundary ?? start.position.checkpoint);
	const b =
		'checkpoint' in end
			? (BigInt(end.checkpoint) + (order === 'descending' ? 1n : 0n)).toString()
			: (end.position.checkpointBoundary ?? end.position.checkpoint);
	if (a === undefined || b === undefined) return;
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
export function createLedgerStream<Frame extends object>(
	options: SuiClientTypes.StreamOptions,
	adapter: LedgerStreamAdapter<Frame>,
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
			const startToken = options.start?.resumeToken
				? decodeToken(options.start.resumeToken)
				: undefined;
			const endToken = options.end?.resumeToken ? decodeToken(options.end.resumeToken) : undefined;
			const order = options.order ?? startToken?.order ?? 'ascending';
			if (startToken && order !== startToken.order)
				throw new Error('Resume token traversal order cannot change');
			const follow =
				options.follow ??
				(options.end ? false : (startToken?.range.follow ?? order === 'ascending'));
			if (follow && (order === 'descending' || options.end)) {
				throw new Error('Following requires ascending order without an end bound');
			}
			if (startToken && !startToken.range.follow && follow)
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
			const filter = toBase64(
				blake2b(new TextEncoder().encode(canonical(identity.filter)), { dkLen: 32 }),
			);
			for (const token of [startToken, endToken]) {
				if (
					token &&
					(token.transport !== adapter.transport ||
						token.family !== adapter.family ||
						token.chain !== identity.chain ||
						token.filter !== filter)
				) {
					throw new Error(
						'Resume token is incompatible with the stream transport, chain, family, or resolved filter',
					);
				}
				if (token) {
					adapter.validatePosition?.(token.position);
					if (token.range.end && 'position' in token.range.end)
						adapter.validatePosition?.(token.range.end.position);
				}
			}
			const inputStart: StreamBound | undefined = startToken
				? { position: startToken.position }
				: options.start?.checkpoint !== undefined
					? { checkpoint: options.start.checkpoint }
					: undefined;
			const inputEnd: StreamBound | undefined = endToken
				? { position: endToken.position }
				: options.end?.checkpoint !== undefined
					? { checkpoint: options.end.checkpoint }
					: undefined;
			if (
				startToken &&
				!startToken.range.follow &&
				inputEnd &&
				canonical(inputEnd) !== canonical(startToken.range.end)
			) {
				throw new Error('Resume token end bound cannot change');
			}
			const range: StoredRange =
				startToken && !startToken.range.follow
					? { ...startToken.range, start: inputStart }
					: {
							start: inputStart,
							end: inputEnd,
							follow,
							reason: inputEnd
								? 'checkpoint' in inputEnd
									? 'checkpointBound'
									: 'cursorBound'
								: order === 'descending'
									? 'genesis'
									: 'indexedTip',
						};
			let start = inputStart;
			if (
				(!start &&
					!(follow && (options.delivery ?? 'subscribe') === 'subscribe' && adapter.liveFromTip)) ||
				(!follow && !range.end && order === 'ascending')
			) {
				const tip =
					range.capturedTip ??
					parse(Checkpoint, await retryOperation(() => adapter.getIndexedTip(signal)));
				if (!follow) range.capturedTip = tip;
				if (!start)
					start = { checkpoint: order === 'descending' ? tip : (BigInt(tip) + 1n).toString() };
				if (!follow && order === 'ascending' && !range.end)
					range.end = { checkpoint: (BigInt(tip) + 1n).toString() };
			}
			range.start ??= start;
			let lastToken: string | undefined;
			const tokenFor = (position: StreamPosition): string =>
				encodeToken({
					transport: adapter.transport,
					family: adapter.family,
					chain: identity.chain,
					filter,
					order,
					position,
					range,
				});
			if (startToken) lastToken = tokenFor(startToken.position);
			const publicBound = (bound: StreamBound): SuiClientTypes.StreamStart =>
				'checkpoint' in bound ? bound : { resumeToken: tokenFor(bound.position) };
			const complete = (): SuiClientTypes.StreamCompletionFrame => ({
				$kind: 'Complete',
				completion: {
					order,
					reason: range.reason,
					resumeToken: lastToken,
					range: {
						start: range.start && publicBound(range.start),
						end: range.end && publicBound(range.end),
						capturedCheckpoint: range.capturedTip,
					},
				},
			});
			if (start && range.end) {
				const comparison = compareBounds(start, range.end, order, adapter);
				if (comparison !== undefined && comparison * (order === 'ascending' ? 1 : -1) > 0)
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
					const request: LedgerStreamRequest = {
						start,
						end: range.end,
						order,
						capturedTip: range.capturedTip,
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
