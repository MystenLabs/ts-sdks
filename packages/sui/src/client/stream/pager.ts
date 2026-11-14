// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The shared pager. Every paged read is one pass of it: finite ranges, polling, and history before
 * a live handoff. A pass reads pages from its start until the server reports no more, then commits
 * the boundary after what the server covered, so a quiet range still moves its resume point. A
 * pass is complete once the index has reached its end; otherwise the caller waits and reads again.
 */

import type { SuiClientTypes } from '../types.js';
import type {
	Bound,
	LedgerStreamAdapter,
	LiveEvent,
	PageEnd,
	PageRequest,
	StreamFamily,
} from './adapter.js';
import { SuiStreamError } from './errors.js';
import { boundaryPosition, insideCheckpoint, progressPosition } from './position.js';
import { sameBytes } from './token.js';

interface Pass {
	start?: Bound;
	/** Exclusive checkpoint end in traversal order. */
	end?: bigint;
	order: SuiClientTypes.Order;
	signal: AbortSignal;
}

/**
 * `complete: false`: the index has not reached the end yet. `retentionLimit`: a read toward
 * genesis stopped at the oldest retained checkpoint.
 */
interface PassResult {
	complete: boolean;
	retentionLimit: boolean;
}

/** The request that reads everything after `start` and before `end`. */
export function passRequest(
	start: Bound | undefined,
	end: bigint | undefined,
	order: SuiClientTypes.Order,
	family: StreamFamily,
): Omit<PageRequest, 'signal'> {
	const ascending = order === 'ascending';
	const request: Omit<PageRequest, 'signal'> = { range: {}, order };
	if (start && 'checkpoint' in start) {
		if (ascending) request.range.start = start.checkpoint;
		else request.range.end = start.checkpoint + 1n;
	} else if (start) {
		const { checkpoint, cursor } = start.position;
		// A delivered checkpoint and a plain boundary resume by checkpoint; anything inside a
		// checkpoint resumes by its cursor.
		const whole = family === 'checkpoints' && start.position.kind === 'Item';
		const inside = !whole && insideCheckpoint(start.position);
		if (cursor && (checkpoint === null || inside)) {
			if (ascending) request.after = cursor;
			else request.before = cursor;
		}
		if (checkpoint !== null) {
			if (ascending) request.range.start = whole ? checkpoint + 1n : checkpoint;
			else request.range.end = inside ? checkpoint + 1n : checkpoint;
		}
	}
	if (end !== undefined) {
		if (ascending) request.range.end = end;
		else request.range.start = end + 1n;
	}
	return request;
}

export async function* readPages<Item>(
	adapter: LedgerStreamAdapter<Item, any>,
	pass: Pass,
): AsyncGenerator<LiveEvent<Item>, PassResult> {
	const { order, end, signal } = pass;
	const ascending = order === 'ascending';
	const request: PageRequest = {
		...passRequest(pass.start, end, order, adapter.family),
		signal,
	};

	// A boundary from what a replica has covered can sit behind a cursor without a checkpoint,
	// whose place is unknown, so it is committed only after a position with a checkpoint.
	let placed = !pass.start || 'checkpoint' in pass.start || pass.start.position.checkpoint !== null;
	while (true) {
		const page = adapter.fetchPage({ ...request, range: { ...request.range } });
		let empty = true;
		let pageEnd: PageEnd;
		try {
			let read = await page.next();
			for (; !read.done; read = await page.next()) {
				const { position, item } = read.value;
				placed = position.checkpoint !== null;
				if (item === undefined) {
					yield { $kind: 'Progress', position };
					continue;
				}
				empty = false;
				yield { $kind: 'Item', position, item };
			}
			pageEnd = read.value;
		} finally {
			await page.return?.();
		}
		if (pageEnd.notIndexed) return { complete: false, retentionLimit: false };

		const { more, cursor } = pageEnd.next;
		if (more) {
			if (!cursor) throw protocol('Page has more items but no cursor');
			const sent = ascending ? request.after : request.before;
			if (sent && sameBytes(sent, cursor)) throw protocol('Pagination did not advance');
			// A page end that reports where the scan stopped, or an empty page, moves the resume point,
			// so sparse filters save their place.
			const position = pageEnd.next.position ?? (empty ? progressPosition(cursor) : undefined);
			if (position) {
				placed = position.checkpoint !== null;
				yield { $kind: 'Progress', position };
			}
			if (ascending) request.after = cursor;
			else request.before = cursor;
			continue;
		}

		if (!ascending) {
			// Covered down to the end, so a finished range resumes as empty.
			if (end !== undefined) yield { $kind: 'Progress', position: boundaryPosition(end + 1n) };
			const retentionLimit = end === undefined && (pageEnd.retainedFrom ?? 0n) > 0n;
			return { complete: true, retentionLimit };
		}

		const { covered } = pageEnd;
		const boundary = boundaryAfter(covered, request.range);
		if (boundary !== undefined && placed) {
			yield { $kind: 'Progress', position: boundaryPosition(boundary) };
		}
		return {
			complete: end === undefined || covered === undefined || covered >= end - 1n,
			retentionLimit: false,
		};
	}
}

/** The boundary after what an exhausted ascending read covered, within its range. */
function boundaryAfter(covered: bigint | undefined, { start, end }: PageRequest['range']) {
	let boundary = covered === undefined ? end : covered + 1n;
	if (boundary === undefined) return undefined;
	if (end !== undefined && boundary > end) boundary = end;
	if (start !== undefined && boundary < start) boundary = start;
	return boundary;
}

function protocol(message: string) {
	return new SuiStreamError('Protocol', message);
}
