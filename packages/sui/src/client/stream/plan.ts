// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parseCheckpointNumber } from '../query-filters.js';
import type { SuiClientTypes } from '../types.js';
import type { Bound, Coverage, LedgerStreamAdapter } from './adapter.js';
import { SuiStreamError } from './errors.js';
import {
	decodePosition,
	decodeToken,
	filterHash,
	mapRangePosition,
	sameBytes,
	type RangeEnd,
	type StreamToken,
	type TokenRange,
} from './token.js';

/**
 * Stream planning. Everything before `planStream` makes no request, so option and token errors
 * surface before any retryable failure; `planStream` reads the indexed tip at most once.
 */

/** finite: scan to the end. poll: scan to the tip repeatedly. follow: the adapter's live handoff. */
export type StreamMode = 'finite' | 'poll' | 'follow';

export interface StreamTokens {
	start?: StreamToken;
	end?: StreamToken;
}

export interface Traversal {
	order: SuiClientTypes.Order;
	mode: StreamMode;
	pollInterval: number;
	startCheckpoint?: bigint;
	endCheckpoint?: bigint;
}

export interface StreamPlan<P> {
	mode: StreamMode;
	order: SuiClientTypes.Order;
	pollInterval: number;
	/** This invocation's start, reported as the completion's `range.start`. */
	start?: Bound<P>;
	/** The exclusive end of every scan in a finite stream. */
	end?: Bound<P>;
	/** Written into every token. */
	range: TokenRange<P>;
	/** Passed to every scan; never rediscovered. */
	capturedTip?: bigint;
	/** Coverage recorded in the start token. */
	startCoverage: Coverage;
	/** Equal bounds: complete without a scan. */
	empty: boolean;
}

export function decodeStreamTokens(options: SuiClientTypes.StreamOptions): StreamTokens {
	return {
		start:
			options.start?.resumeToken !== undefined ? decodeToken(options.start.resumeToken) : undefined,
		end: options.end?.resumeToken !== undefined ? decodeToken(options.end.resumeToken) : undefined,
	};
}

/** Option rules that need no network: order, mode, checkpoint values and token range changes. */
export function resolveTraversal(
	options: SuiClientTypes.StreamOptions,
	tokens: StreamTokens,
): Traversal {
	const startRange = tokens.start?.range;
	const tokenOrder = startRange && rangeOrder(startRange);
	const order = options.order ?? tokenOrder ?? 'ascending';
	if (tokenOrder && order !== tokenOrder) {
		throw new SuiStreamError('IncompatibleToken', 'A resume token cannot change traversal order');
	}

	const follow = options.follow ?? defaultFollow(options, startRange, order);
	if (follow && (order === 'descending' || options.end)) {
		throw new SuiStreamError(
			'InvalidOptions',
			'Following requires ascending order without an end bound',
		);
	}
	if (follow && startRange?.$kind === 'Finite') {
		throw new SuiStreamError('IncompatibleToken', 'A finite resume token cannot be followed');
	}
	if (!follow && order === 'ascending' && !options.start) {
		throw new SuiStreamError('InvalidOptions', 'Ascending finite streams require a start');
	}

	const startCheckpoint = checkpointOption(options.start?.checkpoint, 'start');
	const endCheckpoint = checkpointOption(options.end?.checkpoint, 'end');
	// A finite token fixes its end. Repeating that end is allowed; an implicit genesis end has no
	// explicit form.
	if (startRange?.$kind === 'Finite' && options.end) {
		const sameEnd =
			endCheckpoint !== undefined
				? endCheckpoint === checkpointEnd(startRange.end)
				: startRange.end.$kind === 'Cursor' &&
					sameBytes(startRange.end.position, tokens.end!.position);
		if (!sameEnd) {
			throw new SuiStreamError('IncompatibleToken', 'A resume token cannot change its end bound');
		}
	}

	const pollInterval = options.pollInterval ?? 1000;
	if (!(pollInterval > 0 && Number.isFinite(pollInterval))) {
		throw new SuiStreamError('InvalidOptions', 'pollInterval must be a positive number');
	}
	let mode: StreamMode = 'finite';
	if (follow) mode = options.delivery === 'poll' ? 'poll' : 'follow';
	return { order, mode, pollInterval, startCheckpoint, endCheckpoint };
}

/** An explicit end reads a finite range; otherwise a token keeps its range kind. */
function defaultFollow(
	options: SuiClientTypes.StreamOptions,
	startRange: TokenRange<unknown> | undefined,
	order: SuiClientTypes.Order,
): boolean {
	if (options.end) return false;
	if (startRange) return startRange.$kind === 'Follow';
	return order === 'ascending';
}

/** Tokens only resume the stream that produced them: the same transport and stream family. */
export function assertTokensMatchAdapter(
	tokens: StreamTokens,
	adapter: Pick<LedgerStreamAdapter<unknown, unknown>, 'transport' | 'family'>,
) {
	for (const token of [tokens.start, tokens.end]) {
		if (token && (token.transport !== adapter.transport || token.family !== adapter.family)) {
			throw incompatibleToken();
		}
	}
}

/** Tokens only resume the stream that produced them: the same chain and filter. */
export function assertTokensCompatible(
	tokens: StreamTokens,
	identity: { chain: string; filter: unknown },
	adapter: Pick<LedgerStreamAdapter<unknown, unknown>, 'transport' | 'family'>,
) {
	assertTokensMatchAdapter(tokens, adapter);
	const filter = filterHash(identity.filter);
	for (const token of [tokens.start, tokens.end]) {
		if (token && (token.chain !== identity.chain || !sameBytes(token.filter, filter))) {
			throw incompatibleToken();
		}
	}
}

function incompatibleToken() {
	return new SuiStreamError(
		'IncompatibleToken',
		'Resume token belongs to a different transport, chain, stream family or filter',
	);
}

/** Everything `planStream` needs that is known before any request. */
export interface PreparedStream<P> {
	traversal: Traversal;
	tokens: StreamTokens;
	adapter: LedgerStreamAdapter<P, unknown, any>;
	start?: Bound<P>;
	explicitEnd?: Bound<P>;
	resumedRange?: TokenRange<P>;
}

/**
 * Decodes token positions (running the codec's `validate`) and rejects reversed bounds when both
 * are known without the indexed tip. Makes no request.
 */
export function prepareStream<P>(
	traversal: Traversal,
	tokens: StreamTokens,
	adapter: LedgerStreamAdapter<P, unknown, any>,
): PreparedStream<P> {
	assertTokensMatchAdapter(tokens, adapter);
	const codec = adapter.position;
	// Decoding validates position metadata before anything else, even for an empty interval.
	const resumedRange =
		tokens.start && mapRangePosition(tokens.start.range, (bytes) => decodePosition(codec, bytes));
	const start: Bound<P> | undefined = tokens.start
		? { position: decodePosition(codec, tokens.start.position) }
		: checkpointBound(traversal.startCheckpoint);
	// An end token contributes only its position, not its direction or range.
	const explicitEnd: Bound<P> | undefined = tokens.end
		? { position: decodePosition(codec, tokens.end.position) }
		: checkpointBound(traversal.endCheckpoint);

	// The end is known without the tip unless it is a new range's IndexedTip end.
	let knownEnd: Bound<P> | undefined;
	if (resumedRange?.$kind === 'Finite') knownEnd = rangeEndBound(resumedRange);
	else if (traversal.mode === 'finite') knownEnd = explicitEnd;
	if (start && knownEnd) checkBounds(start, knownEnd, traversal.order, adapter);

	return { traversal, tokens, adapter, start, explicitEnd, resumedRange };
}

export async function planStream<P>(
	prepared: PreparedStream<P>,
	readIndexedTip: () => Promise<bigint>,
): Promise<StreamPlan<P>> {
	const { traversal, tokens, adapter, explicitEnd, resumedRange } = prepared;
	const { order, mode } = traversal;
	let start = prepared.start;
	const resumesFinite = resumedRange?.$kind === 'Finite';

	let tip: bigint | undefined;
	if (needsIndexedTip({ mode, order, start, explicitEnd, resumesFinite, adapter })) {
		tip = await readIndexedTip();
		start ??= { checkpoint: order === 'descending' ? tip : tip + 1n };
	}

	let range: TokenRange<P>;
	if (resumesFinite) range = resumedRange;
	else if (mode !== 'finite') range = { $kind: 'Follow' };
	else range = finiteRange(order, explicitEnd, tip);

	const end = rangeEndBound(range);
	// Repeats the check in `prepareStream` for bounds that only the tip resolved.
	const empty = start && end ? checkBounds(start, end, order, adapter) : false;

	return {
		mode,
		order,
		pollInterval: traversal.pollInterval,
		start,
		end,
		range,
		capturedTip: capturedTip(range),
		startCoverage: tokens.start?.coverage ?? { $kind: 'Unknown' },
		empty,
	};
}

/** Throws `InvalidOptions` for reversed bounds; returns whether they are equal. */
function checkBounds<P>(
	start: Bound<P>,
	end: Bound<P>,
	order: SuiClientTypes.Order,
	adapter: Pick<LedgerStreamAdapter<P, unknown, any>, 'compare' | 'locate' | 'position'>,
): boolean {
	const comparison = compareBounds(start, end, order, adapter);
	if (comparison !== undefined && comparison > 0) {
		throw new SuiStreamError('InvalidOptions', 'Stream start and end bounds are reversed');
	}
	return comparison === 0;
}

/**
 * The tip is read when there is no start to anchor at (unless the adapter anchors a live follow
 * itself), and to fix the end of a new ascending finite range.
 */
function needsIndexedTip(state: {
	mode: StreamMode;
	order: SuiClientTypes.Order;
	start: unknown;
	explicitEnd: unknown;
	resumesFinite: boolean;
	adapter: { anchorsAtLiveTip: boolean };
}): boolean {
	const anchorsItself = state.mode === 'follow' && state.adapter.anchorsAtLiveTip;
	const opensFiniteRange =
		state.mode === 'finite' &&
		state.order === 'ascending' &&
		!state.explicitEnd &&
		!state.resumesFinite;
	return (!state.start && !anchorsItself) || opensFiniteRange;
}

function finiteRange<P>(
	order: SuiClientTypes.Order,
	explicitEnd: Bound<P> | undefined,
	tip: bigint | undefined,
): TokenRange<P> {
	let end: RangeEnd<P>;
	if (explicitEnd && 'checkpoint' in explicitEnd) {
		end = { $kind: 'Checkpoint', checkpoint: explicitEnd.checkpoint };
	} else if (explicitEnd) {
		end = { $kind: 'Cursor', position: explicitEnd.position };
	} else if (order === 'descending') {
		end = { $kind: 'Genesis' };
	} else {
		end = { $kind: 'IndexedTip', checkpoint: tip! };
	}
	// An IndexedTip end already records the tip.
	return {
		$kind: 'Finite',
		order,
		capturedTip: end.$kind === 'IndexedTip' ? undefined : tip,
		end,
	};
}

export function rangeEndBound<P>(range: TokenRange<P>): Bound<P> | undefined {
	if (range.$kind === 'Follow') return undefined;
	const end = range.end;
	switch (end.$kind) {
		case 'Checkpoint':
		case 'IndexedTip':
			return { checkpoint: checkpointEnd(end)! };
		case 'Cursor':
			return { position: end.position };
		case 'Genesis':
			return undefined;
	}
}

/** The exclusive checkpoint end of a range end, if it has one. */
function checkpointEnd(end: RangeEnd<unknown>): bigint | undefined {
	if (end.$kind === 'Checkpoint') return end.checkpoint;
	if (end.$kind === 'IndexedTip') return end.checkpoint + 1n;
	return undefined;
}

function capturedTip(range: TokenRange<unknown>): bigint | undefined {
	if (range.$kind === 'Follow') return undefined;
	return range.end.$kind === 'IndexedTip' ? range.end.checkpoint : range.capturedTip;
}

function rangeOrder(range: TokenRange<unknown>): SuiClientTypes.Order {
	return range.$kind === 'Follow' ? 'ascending' : range.order;
}

/**
 * Where `start` lies relative to `end` in traversal order: negative before, 0 equal, positive
 * reversed, undefined unknown (the server resolves it). Never interprets cursor bytes: positions
 * are compared by the adapter, then by the checkpoints they report.
 */
export function compareBounds<P>(
	start: Bound<P>,
	end: Bound<P>,
	order: SuiClientTypes.Order,
	adapter: Pick<LedgerStreamAdapter<P, unknown, any>, 'compare' | 'locate' | 'position'>,
): number | undefined {
	const direction = order === 'ascending' ? 1 : -1;
	if ('position' in start && 'position' in end) {
		const schema = adapter.position.schema;
		if (
			sameBytes(
				schema.serialize(start.position).toBytes(),
				schema.serialize(end.position).toBytes(),
			)
		) {
			return 0;
		}
		const comparison = adapter.compare(start.position, end.position);
		if (comparison !== undefined) return comparison * direction;
	}
	const a = locateBound(start, order, adapter);
	const b = locateBound(end, order, adapter);
	if (a.checkpoint === null || b.checkpoint === null) return undefined;
	if (a.checkpoint !== b.checkpoint) return (a.checkpoint < b.checkpoint ? -1 : 1) * direction;
	// Same checkpoint: a boundary lies before every position inside that checkpoint.
	if (a.boundary && b.boundary) return 0;
	if (a.boundary) return -direction;
	if (b.boundary) return direction;
	return undefined;
}

/**
 * Checkpoint bounds as ledger boundaries: ascending `c` is the boundary before `c`; descending
 * `c` (inclusive start or exclusive end) is the boundary after `c`, i.e. before `c + 1`.
 */
function locateBound<P>(
	bound: Bound<P>,
	order: SuiClientTypes.Order,
	adapter: Pick<LedgerStreamAdapter<P, unknown, any>, 'locate'>,
): { checkpoint: bigint | null; boundary: boolean } {
	if ('position' in bound) return adapter.locate(bound.position);
	return { checkpoint: bound.checkpoint + (order === 'descending' ? 1n : 0n), boundary: true };
}

/** For adapters: a descending scan cannot start above the indexed tip until it is indexed. */
export function startBeyondTip<P>(
	start: Bound<P> | undefined,
	tip: bigint,
	locate: (position: P) => { checkpoint: bigint | null },
): boolean {
	if (!start) return false;
	const checkpoint = 'checkpoint' in start ? start.checkpoint : locate(start.position).checkpoint;
	return checkpoint !== null && checkpoint > tip;
}

function checkpointOption(
	value: SuiClientTypes.CheckpointNumber | undefined,
	label: string,
): bigint | undefined {
	if (value === undefined) return undefined;
	try {
		return parseCheckpointNumber(value, label);
	} catch (error) {
		throw new SuiStreamError('InvalidOptions', (error as Error).message, { cause: error });
	}
}

function checkpointBound(checkpoint: bigint | undefined): Bound<never> | undefined {
	return checkpoint === undefined ? undefined : { checkpoint };
}
