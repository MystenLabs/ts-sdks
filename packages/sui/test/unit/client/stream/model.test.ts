// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Seeded random schedules against the model ledger. Each run injects index lag, failed and
 * repeated scan pages, live feeds that start early or late or resume a position, repeat items,
 * overflow, fail or end. The assertions are the stream's contract:
 *
 * - the delivered items are exactly the expected range of the ledger, in order, each once;
 * - resuming from any emitted token delivers exactly the rest of that range.
 */

import { describe, expect, it } from 'vitest';

import type { SuiClientTypes } from '../../../../src/client/types.js';
import {
	fakeAdapter,
	itemId,
	ledgerOrder,
	positionOf,
	Ledger,
	NetworkError,
	Overflow,
	stream,
	type FakeItem,
	type FakeOptions,
	type FakeOutput,
	type FakePosition,
	type LiveScript,
	type ScanFault,
} from './fake-ledger.js';

const SEEDS = 200;

type Mode = 'follow-cursor' | 'follow-resume' | 'poll' | 'finite-ascending' | 'finite-descending';
const MODES: Mode[] = [
	'follow-cursor',
	'follow-resume',
	'poll',
	'finite-ascending',
	'finite-descending',
];

/** mulberry32 */
function random(seed: number) {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		chance: (p: number) => next() < p,
		int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
		pick: <T>(values: readonly T[]) => values[Math.floor(next() * values.length)],
	};
}
type Random = ReturnType<typeof random>;

interface Scenario {
	mode: Mode;
	ledger: () => Ledger;
	fake: (ledger: Ledger, rng: Random) => FakeOptions;
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>;
	/** Expected items for a stream started with `options`; undefined: from the first delivered. */
	expected: (ledger: Ledger, initialTip: bigint) => FakeItem[] | undefined;
}

function scenario(seed: number): Scenario {
	const rng = random(seed);
	const mode = MODES[seed % MODES.length];
	const resumes = mode === 'follow-resume';
	const counts = Array.from({ length: rng.int(6, 16) }, () => rng.int(0, 3));
	counts[counts.length - 1] = Math.max(counts.at(-1)!, 1); // the last item ends a follow
	const last = counts.length - 1;
	// A follow needs something left to read: the last item ends it.
	const initialTip = rng.int(0, mode.startsWith('finite') ? last : last - 1);
	const ledger = () => new Ledger(counts, initialTip);
	const pageSize = rng.int(1, 4);
	const frames = { progress: rng.chance(0.5), completion: true };
	const after = (start: number) => (items: FakeItem[]) =>
		items.filter((i) => i.checkpoint >= start);

	const faults = (ledger: Ledger, rng: Random): FakeOptions => ({
		pageSize,
		scanProgress: rng.chance(0.5),
		afterScan: (l) => {
			if (rng.chance(0.6) && l.indexedTip < BigInt(last)) l.indexedTip += 1n;
		},
		scanFaults: Array.from({ length: 20 }, (): ScanFault | undefined => {
			if (rng.chance(0.15)) return { failAfterItems: rng.int(0, 3), error: new NetworkError() };
			if (rng.chance(0.15)) return { repeatStartCursor: true };
			return undefined;
		}),
		live: (connection, after) =>
			resumes ? resumeScript(ledger, rng, connection, after) : liveScript(ledger, rng, connection),
	});

	switch (mode) {
		case 'follow-cursor': {
			const anchored = rng.chance(0.3);
			const start = rng.int(0, last);
			return {
				mode,
				ledger,
				fake: (l, r) => ({ ...faults(l, r), anchorsAtLiveTip: anchored }),
				options: { frames, ...(!anchored && { start: { checkpoint: start } }) },
				expected: (l) => (anchored ? undefined : after(start)(l.items)),
			};
		}
		case 'follow-resume': {
			const start = rng.chance(0.3) ? undefined : rng.int(0, last);
			return {
				mode,
				ledger,
				fake: (l, r) => ({ ...faults(l, r), handoff: 'resume' }),
				options: { frames, ...(start !== undefined && { start: { checkpoint: start } }) },
				// Without a start, the stream anchors after the indexed tip it reads first.
				expected: (l, tip) => after(start ?? Number(tip) + 1)(l.items),
			};
		}
		case 'poll': {
			const start = rng.int(0, last);
			return {
				mode,
				ledger,
				fake: faults,
				options: { frames, delivery: 'poll', start: { checkpoint: start } },
				expected: (l) => after(start)(l.items),
			};
		}
		case 'finite-ascending': {
			// Without an end, the range ends at the indexed tip read at startup.
			const end = rng.chance(0.5) ? rng.int(0, last + 1) : undefined;
			const start = rng.int(0, end ?? initialTip + 1);
			return {
				mode,
				ledger,
				fake: faults,
				options: {
					frames,
					follow: false,
					start: { checkpoint: start },
					...(end !== undefined && { end: { checkpoint: end } }),
				},
				expected: (l, tip) =>
					after(start)(l.items).filter(
						(i) => i.checkpoint < (end !== undefined ? BigInt(end) : tip + 1n),
					),
			};
		}
		case 'finite-descending': {
			const start = rng.chance(0.3) ? undefined : rng.int(0, last);
			const end = rng.chance(0.5) ? rng.int(0, start ?? 0) : undefined;
			return {
				mode,
				ledger,
				fake: faults,
				options: {
					frames,
					order: 'descending',
					...(start !== undefined && { start: { checkpoint: start } }),
					...(end !== undefined && { end: { checkpoint: end } }),
				},
				expected: (l, tip) =>
					l.items
						.filter(
							(i) =>
								i.checkpoint <= (start !== undefined ? BigInt(start) : tip) &&
								(end === undefined || i.checkpoint > BigInt(end)),
						)
						.reverse(),
			};
		}
	}
}

/** A live connection: starts near the index, may repeat, report progress, or end early. */
function liveScript(ledger: Ledger, rng: Random, connection: number): LiveScript {
	const last = Number(ledger.lastCheckpoint);
	const from = Math.min(last, Math.max(0, Number(ledger.indexedTip) + rng.int(-2, 3)));
	const faulty = connection < 6;
	const events: LiveScript['events'] = [];
	let checkpoint = -1;
	for (const event of ledger.liveFrom(from)) {
		const cp = Number(event.$kind === 'Item' ? event.item.checkpoint : -1);
		if (checkpoint !== -1 && cp !== checkpoint && rng.chance(0.3)) {
			events.push(ledger.progress(checkpoint));
		}
		checkpoint = cp;
		events.push(event);
		if (rng.chance(0.1)) events.push(events[rng.int(0, events.length - 1)]);
	}
	if (!faulty) return { events, end: 'hang' };
	const cut = rng.int(0, events.length);
	return {
		events: events.slice(0, cut),
		end: rng.pick(['eof', new NetworkError(), new Overflow()] as const),
	};
}

/** A resumed connection: everything after `after`, then live; may repeat or end early. */
function resumeScript(
	ledger: Ledger,
	rng: Random,
	connection: number,
	after: FakePosition | undefined,
): LiveScript {
	const events: LiveScript['events'] = [];
	for (const item of ledger.items) {
		if (after && ledgerOrder(positionOf(item), after) <= 0) continue;
		events.push({ $kind: 'Item', position: positionOf(item), item });
		if (rng.chance(0.1)) events.push(events[rng.int(0, events.length - 1)]);
	}
	if (connection >= 6) return { events, end: 'hang' };
	return {
		events: events.slice(0, rng.int(0, events.length)),
		end: rng.pick(['eof', new NetworkError(), new Overflow()] as const),
	};
}

/** Reads until the stream completes or delivers the ledger's last item. */
async function run(
	s: Scenario,
	seed: number,
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>,
	finite: boolean,
) {
	const ledger = s.ledger();
	const initialTip = ledger.indexedTip;
	const adapter = fakeAdapter(ledger, s.fake(ledger, random(seed)));
	const lastId = itemId(ledger.items.at(-1)!);
	const frames: FakeOutput[] = [];
	const limit = ledger.items.length * 4 + 20;
	for await (const frame of stream(adapter, options)) {
		frames.push(frame);
		if (frames.length > limit) throw new Error('stream did not converge');
		if (!finite && frame.$kind === 'Item' && frame.id === lastId) break;
	}
	return { frames, ledger, initialTip };
}

const itemIds = (frames: FakeOutput[]) =>
	frames.flatMap((frame) => (frame.$kind === 'Item' ? [frame.id] : []));

describe('model: exactly-once delivery and resume from every token', () => {
	it.each(Array.from({ length: SEEDS }, (_, seed) => [seed, MODES[seed % MODES.length]] as const))(
		'seed %i (%s)',
		async (seed, mode) => {
			const s = scenario(seed);
			const finite = mode.startsWith('finite');
			const { frames, ledger, initialTip } = await run(s, seed * 7919 + 1, s.options, finite);
			const delivered = itemIds(frames);
			const expected = (s.expected(ledger, initialTip) ?? suffixFrom(ledger, delivered[0])).map(
				itemId,
			);
			expect(delivered).toEqual(expected);
			if (finite) expect(frames.at(-1)?.$kind).toBe('Complete');

			// Resume from every token: items, progress and the completion.
			for (const [index, frame] of frames.entries()) {
				const token = frame.$kind === 'Complete' ? frame.completion.resumeToken : frame.resumeToken;
				if (!token) continue;
				const remaining = expected.slice(itemIds(frames.slice(0, index + 1)).length);
				const resumeOptions = { ...s.options, start: { resumeToken: token }, end: undefined };
				if (finite && remaining.length === 0) {
					const resumed = await run(s, seed + index, resumeOptions, true);
					expect(itemIds(resumed.frames)).toEqual([]);
					continue;
				}
				if (remaining.length === 0) continue; // a follow past the last item has nothing to read
				const resumed = await run(s, seed + index, resumeOptions, finite);
				expect(itemIds(resumed.frames)).toEqual(remaining);
			}
		},
	);
});

function suffixFrom(ledger: Ledger, first: string | undefined): FakeItem[] {
	const index = ledger.items.findIndex((item) => itemId(item) === first);
	return index === -1 ? [] : ledger.items.slice(index);
}
