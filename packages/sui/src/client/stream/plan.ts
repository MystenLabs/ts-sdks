// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parseCheckpointNumber } from '../query-filters.js';
import type { SuiClientTypes } from '../types.js';
import type { Bound, Coverage, LedgerStreamAdapter } from './adapter.js';
import { SuiStreamError } from './errors.js';
import {
	boundaryPosition,
	comparePositions,
	maxCoverage,
	nextUncovered,
	positionBytes,
	positionCoverage,
	type StreamPosition,
} from './position.js';
import {
	decodeToken,
	filterHash,
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

export interface StreamPlan {
	mode: StreamMode;
	order: SuiClientTypes.Order;
	pollInterval: number;
	/** This invocation's start, reported as the completion's `range.start`. */
	start?: Bound;
	/** No start was given, so `start` was set from the indexed tip. */
	anchored: boolean;
	/** The exclusive end of every scan in a finite stream. */
	end?: Bound;
	/** Written into every token. */
	range: TokenRange;
	/** Passed to every scan; never rediscovered. */
	capturedTip?: bigint;
	/** Coverage recorded in the start token. */
	startCoverage: Coverage;
	/** The start token is from this finite range, so a page of the range was read before. */
	resumesRange: boolean;
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
					sameBytes(positionBytes(startRange.end.position), positionBytes(tokens.end!.position));
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
	startRange: TokenRange | undefined,
	order: SuiClientTypes.Order,
): boolean {
	if (options.end) return false;
	if (startRange) return startRange.$kind === 'Follow';
	return order === 'ascending';
}

/** Tokens only resume the stream that produced them: the same transport and stream family. */
export function assertTokensMatchAdapter(
	tokens: StreamTokens,
	adapter: Pick<LedgerStreamAdapter<unknown>, 'transport' | 'family'>,
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
	adapter: Pick<LedgerStreamAdapter<unknown>, 'transport' | 'family'>,
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
export interface PreparedStream {
	traversal: Traversal;
	tokens: StreamTokens;
	adapter: LedgerStreamAdapter<unknown, any>;
	start?: Bound;
	explicitEnd?: Bound;
	resumedRange?: TokenRange;
}

/** Rejects reversed bounds when both are known without the indexed tip. Makes no request. */
export function prepareStream(
	traversal: Traversal,
	tokens: StreamTokens,
	adapter: LedgerStreamAdapter<unknown, any>,
): PreparedStream {
	assertTokensMatchAdapter(tokens, adapter);
	const resumedRange = tokens.start?.range;
	const start: Bound | undefined = tokens.start
		? { position: tokens.start.position }
		: checkpointBound(traversal.startCheckpoint);
	// An end token contributes only its position, not its direction or range.
	const explicitEnd: Bound | undefined = tokens.end
		? { position: tokens.end.position }
		: checkpointBound(traversal.endCheckpoint);

	// The end is known without the tip unless it is a new range's IndexedTip end.
	let knownEnd: Bound | undefined;
	if (resumedRange?.$kind === 'Finite') knownEnd = rangeEndBound(resumedRange);
	else if (traversal.mode === 'finite') knownEnd = explicitEnd;
	if (start && knownEnd) checkBounds(start, knownEnd, traversal.order);

	return { traversal, tokens, adapter, start, explicitEnd, resumedRange };
}

export async function planStream(
	prepared: PreparedStream,
	readIndexedTip: () => Promise<bigint>,
): Promise<StreamPlan> {
	const { traversal, tokens, adapter, explicitEnd, resumedRange } = prepared;
	const { order, mode } = traversal;
	let start = prepared.start;
	const resumesFinite = resumedRange?.$kind === 'Finite';

	let tip: bigint | undefined;
	let anchored = false;
	if (needsIndexedTip({ mode, order, start, explicitEnd, resumesFinite, adapter })) {
		tip = await readIndexedTip();
		if (!start) {
			start = { checkpoint: order === 'descending' ? tip : tip + 1n };
			anchored = true;
		}
	}

	let range: TokenRange;
	if (resumesFinite) range = resumedRange;
	else if (mode !== 'finite') range = { $kind: 'Follow' };
	else range = finiteRange(order, explicitEnd, tip);

	const end = rangeEndBound(range);
	// Repeats the check in `prepareStream` for bounds that only the tip resolved.
	const empty = start && end ? checkBounds(start, end, order) : false;

	return {
		mode,
		order,
		pollInterval: traversal.pollInterval,
		start,
		anchored,
		end,
		range,
		capturedTip: capturedTip(range),
		startCoverage: tokens.start?.coverage ?? { $kind: 'Unknown' },
		resumesRange: resumesFinite,
		empty,
	};
}

/**
 * Fails an ascending read whose start the server no longer retains. Subscriptions that backfill
 * from the start never read a page, so this is their only retention check.
 */
export function assertStartRetained(
	plan: StreamPlan,
	family: LedgerStreamAdapter<unknown, any>['family'],
	retainedFrom: bigint | undefined,
) {
	const { start, order } = plan;
	if (retainedFrom === undefined || order !== 'ascending' || !start) return;
	const needed =
		'checkpoint' in start
			? start.checkpoint
			: nextUncovered(maxCoverage(positionCoverage(start.position, family), plan.startCoverage));
	if (needed !== undefined && needed < retainedFrom) {
		throw new SuiStreamError(
			'HistoryUnavailable',
			`Checkpoint ${needed} has been pruned; the oldest available is ${retainedFrom}`,
		);
	}
}

/** Throws `InvalidOptions` for reversed bounds; returns whether they are equal. */
function checkBounds(start: Bound, end: Bound, order: SuiClientTypes.Order): boolean {
	const comparison = compareBounds(start, end, order);
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

function finiteRange(
	order: SuiClientTypes.Order,
	explicitEnd: Bound | undefined,
	tip: bigint | undefined,
): TokenRange {
	let end: RangeEnd;
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

export function rangeEndBound(range: TokenRange): Bound | undefined {
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
function checkpointEnd(end: RangeEnd): bigint | undefined {
	if (end.$kind === 'Checkpoint') return end.checkpoint;
	if (end.$kind === 'IndexedTip') return end.checkpoint + 1n;
	return undefined;
}

function capturedTip(range: TokenRange): bigint | undefined {
	if (range.$kind === 'Follow') return undefined;
	return range.end.$kind === 'IndexedTip' ? range.end.checkpoint : range.capturedTip;
}

function rangeOrder(range: TokenRange): SuiClientTypes.Order {
	return range.$kind === 'Follow' ? 'ascending' : range.order;
}

/**
 * Where `start` lies relative to `end` in traversal order: negative before, 0 equal, positive
 * reversed, undefined unknown (the server resolves it).
 */
export function compareBounds(
	start: Bound,
	end: Bound,
	order: SuiClientTypes.Order,
): number | undefined {
	const comparison = comparePositions(boundPosition(start, order), boundPosition(end, order));
	return comparison === undefined ? undefined : comparison * (order === 'ascending' ? 1 : -1);
}

/**
 * Checkpoint bounds as ledger boundaries: ascending `c` is the boundary before `c`; descending
 * `c` (inclusive start or exclusive end) is the boundary after `c`, i.e. before `c + 1`.
 */
export function boundPosition(bound: Bound, order: SuiClientTypes.Order): StreamPosition {
	if ('position' in bound) return bound.position;
	return boundaryPosition(bound.checkpoint + (order === 'descending' ? 1n : 0n));
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

function checkpointBound(checkpoint: bigint | undefined): Bound | undefined {
	return checkpoint === undefined ? undefined : { checkpoint };
}
