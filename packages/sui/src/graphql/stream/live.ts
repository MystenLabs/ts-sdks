// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Bound, LiveEvent, LiveSubscription } from '../../client/stream/adapter.js';
import { progressPosition, SuiStreamError } from '../../client/stream/index.js';
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
	onOpen: () => void,
): LiveSubscription<LedgerItem<Node>> {
	return { [Symbol.asyncIterator]: () => liveEvents(family, resumePoint(from), signal, onOpen) };
}

/**
 * Whether a subscription can backfill from `from`. The service backfills only after a cursor or a
 * checkpoint, so a subscription cannot start at genesis.
 */
export function canResumeSubscription(from: Bound): boolean {
	const { after, start } = resumePoint(from);
	return after !== undefined || (start !== undefined && start > 0n);
}

/** A position with a cursor resumes after it; one without, from the checkpoint after it. */
function resumePoint(from: Bound | undefined): ResumePoint {
	if (!from) return {};
	if ('checkpoint' in from) return { start: from.checkpoint };
	const { kind, cursor, checkpoint } = from.position;
	if (cursor) return { after: cursorString(cursor) };
	return { start: kind === 'Item' ? checkpoint! + 1n : checkpoint! };
}

/** @yields one event per edge: an item, or progress for an edge without a node. */
async function* liveEvents<Node>(
	family: LedgerFamily<Node>,
	resume: ResumePoint,
	signal: AbortSignal,
	onOpen: () => void,
): AsyncGenerator<LiveEvent<LedgerItem<Node>>> {
	const edges = family.subscribe(signal, resume, onOpen)[Symbol.asyncIterator]();
	try {
		for (let result = await edges.next(); !result.done; result = await edges.next()) {
			const { node, cursor } = result.value;
			if (node === null) {
				yield { $kind: 'Progress', position: progressPosition(cursorBytes(cursor)) };
				continue;
			}
			const checkpoint = family.checkpoint(node);
			if (checkpoint === null) {
				throw new SuiStreamError('Protocol', `Live ${family.name} item has no checkpoint`);
			}
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
