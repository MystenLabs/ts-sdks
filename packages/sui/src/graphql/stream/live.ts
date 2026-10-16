// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Bound, LiveEvent, LiveSubscription } from '../../client/stream/adapter.js';
import { StreamDisconnected } from '../../client/stream/errors.js';
import { progressPosition } from '../../client/stream/index.js';
import {
	cursorBytes,
	cursorString,
	type LedgerFamily,
	type LedgerItem,
	type ResumePoint,
} from './families.js';

/** A subscription after `from`: the server backfills from there, then goes live. */
export function liveSubscription<Node>(
	family: LedgerFamily<Node>,
	from: Bound | undefined,
	signal: AbortSignal,
): LiveSubscription<LedgerItem<Node>> {
	return { [Symbol.asyncIterator]: () => liveEvents(family, resumePoint(from), signal) };
}

/** A position with a cursor resumes after it; one without, from the checkpoint after it. */
function resumePoint(from: Bound | undefined): ResumePoint {
	if (!from) return {};
	if ('checkpoint' in from) return { start: from.checkpoint };
	const { kind, cursor, checkpoint } = from.position;
	if (cursor) return { after: cursorString(cursor) };
	return { start: kind === 'Item' ? checkpoint! + 1n : checkpoint! };
}

/**
 * @yields `Connected` once the subscription opens, then one event per edge: an item, or progress
 * for an edge without a node.
 * @throws {StreamDisconnected} for an item without a checkpoint, so the next connection resumes
 * before it and the server backfills it from the index.
 */
async function* liveEvents<Node>(
	family: LedgerFamily<Node>,
	resume: ResumePoint,
	signal: AbortSignal,
): AsyncGenerator<LiveEvent<LedgerItem<Node>>> {
	let opened!: () => void;
	const open = new Promise<void>((resolve) => (opened = resolve));
	const edges = family.subscribe(signal, resume, opened)[Symbol.asyncIterator]();
	try {
		const first = edges.next();
		// A filtered subscription can stay quiet for a while after it opens.
		await Promise.race([open, first]);
		yield { $kind: 'Connected' };
		for (let result = await first; !result.done; result = await edges.next()) {
			const { node, cursor } = result.value;
			if (node === null) {
				yield { $kind: 'Progress', position: progressPosition(cursorBytes(cursor)) };
				continue;
			}
			const checkpoint = family.checkpoint(node);
			if (checkpoint === null) throw new StreamDisconnected('Live item has no checkpoint');
			yield {
				$kind: 'Item',
				position: family.position({ cursor, node }, checkpoint),
				item: { node, checkpoint },
			};
		}
	} finally {
		await edges.return?.();
	}
}
