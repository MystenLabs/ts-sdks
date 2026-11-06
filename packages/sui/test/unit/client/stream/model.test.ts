// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Seeded random schedules against the model ledger, for event and checkpoint streams and both
 * transport styles: gRPC (watermark positions, subscriptions at the live tip and a gap replay) and
 * GraphQL (cursor-only progress, resuming subscriptions). Each run injects lagging replicas, sparse
 * scans that return empty pages, failed pages, and live feeds that start early or late, fail or end.
 * The assertions are the stream's contract:
 *
 * - the delivered items are exactly the expected range of the ledger, in order, each once;
 * - resuming from any emitted token, with the same options, delivers exactly the rest.
 */

import { describe, expect, it } from 'vitest';

import type { Bound } from '../../../../src/client/stream/adapter.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';
import {
	fakeAdapter,
	itemId,
	Ledger,
	NetworkError,
	stream,
	type FakeItem,
	type FakeOptions,
	type FakeOutput,
	type LiveScript,
	type PageFault,
} from './fake-ledger.js';

const SEEDS = 250;

const MODES = ['follow-grpc', 'follow-graphql', 'poll', 'finite-ascending', 'finite-descending'];
type Mode = (typeof MODES)[number];

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

type Options = SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>;

interface Scenario {
	ledger: () => Ledger;
	fake: (ledger: Ledger, rng: Random) => FakeOptions;
	options: Options;
	/** Expected items for a stream started with `options`; undefined: from the first delivered. */
	expected: (ledger: Ledger) => FakeItem[] | undefined;
}

function scenario(seed: number): Scenario {
	const rng = random(seed);
	const mode: Mode = MODES[seed % MODES.length];
	const counts = Array.from({ length: rng.int(6, 16) }, () => rng.int(0, 3));
	counts[counts.length - 1] = Math.max(counts.at(-1)!, 1); // the last item ends a follow
	// Every fourth seed streams checkpoints: one item per checkpoint, each covering its own.
	const family = seed % 4 === 3 ? 'checkpoints' : 'events';
	if (family === 'checkpoints') counts.fill(1);
	const last = counts.length - 1;
	// A follow needs something left to read: the last item ends it.
	const initialTip = rng.int(0, mode.startsWith('finite') ? last : last - 1);
	const ledger = () => new Ledger(counts, initialTip);
	const grpc = mode === 'follow-grpc' || (mode !== 'follow-graphql' && rng.chance(0.5));
	const pageSize = rng.int(1, 4);
	const scanWindow = rng.chance(0.5) ? rng.int(1, 3) : undefined;
	const maxLag = rng.chance(0.5) ? rng.int(1, 3) : 0;
	const frames = { progress: rng.chance(0.5), completion: true };
	const from = (start: number) => (items: FakeItem[]) => items.filter((i) => i.checkpoint >= start);

	const fake = (ledger: Ledger, rng: Random): FakeOptions => ({
		family,
		pageSize,
		scanWindow,
		watermarks: grpc,
		// GraphQL positions identify an item within a checkpoint without ordering it.
		opaqueOrder: !grpc,
		transport: grpc ? 'grpc' : 'graphql',
		live: grpc ? 'fromTip' : 'resume',
		replicaLag: () => rng.int(0, maxLag),
		afterRead: (l) => {
			if (rng.chance(0.6) && l.indexedTip < BigInt(last)) l.indexedTip += 1n;
		},
		pageFaults: Array.from({ length: 40 }, (): PageFault | undefined =>
			rng.chance(0.1)
				? { error: new NetworkError(), afterItems: rng.chance(0.5) ? 1 : undefined }
				: undefined,
		),
		subscriptions: (connection, from) =>
			grpc ? tipScript(ledger, rng, connection) : resumeScript(ledger, rng, connection, from),
	});

	switch (mode) {
		case 'follow-grpc':
		case 'follow-graphql': {
			const anchored = rng.chance(0.3);
			const start = rng.int(0, last);
			return {
				ledger,
				fake,
				options: { frames, ...(!anchored && { start: { checkpoint: start } }) },
				// A gRPC follow without a start begins at the live tip; GraphQL after the indexed tip.
				expected: (l) =>
					anchored ? (grpc ? undefined : from(initialTip + 1)(l.items)) : from(start)(l.items),
			};
		}
		case 'poll': {
			const start = rng.int(0, last);
			return {
				ledger,
				fake,
				options: { frames, delivery: 'poll', start: { checkpoint: start } },
				expected: (l) => from(start)(l.items),
			};
		}
		case 'finite-ascending': {
			// Without an end, the range ends at the indexed tip read at startup.
			const end = rng.chance(0.5) ? rng.int(0, last + 1) : undefined;
			const start = rng.int(0, end ?? initialTip + 1);
			return {
				ledger,
				fake,
				options: {
					frames,
					follow: false,
					start: { checkpoint: start },
					...(end !== undefined && { end: { checkpoint: end } }),
				},
				expected: (l) =>
					from(start)(l.items).filter((i) => i.checkpoint < BigInt(end ?? initialTip + 1)),
			};
		}
		default: {
			const start = rng.chance(0.3) ? undefined : rng.int(0, last);
			const end = rng.chance(0.5) ? rng.int(0, start ?? 0) : undefined;
			return {
				ledger,
				fake,
				options: {
					frames,
					order: 'descending',
					...(start !== undefined && { start: { checkpoint: start } }),
					...(end !== undefined && { end: { checkpoint: end } }),
				},
				expected: (l) =>
					l.items
						.filter(
							(i) =>
								i.checkpoint <= BigInt(start ?? initialTip) &&
								(end === undefined || i.checkpoint > BigInt(end)),
						)
						.reverse(),
			};
		}
	}
}

/**
 * A gRPC connection: an entry watermark at a live tip near the index, then items from there with
 * occasional heartbeats; it may end early.
 */
function tipScript(ledger: Ledger, rng: Random, connection: number): LiveScript {
	const last = Number(ledger.lastCheckpoint);
	const tip = Math.min(last, Math.max(0, Number(ledger.indexedTip) + rng.int(-2, 3)));
	const events: LiveScript['events'] = [ledger.watermark(tip)];
	let checkpoint = tip;
	for (const event of ledger.liveFrom(tip)) {
		const at = Number(event.$kind === 'Item' ? event.item.checkpoint : checkpoint);
		if (at !== checkpoint && rng.chance(0.3)) events.push(ledger.watermark(at));
		checkpoint = at;
		events.push(event);
	}
	return endScript(rng, connection, events);
}

/** A GraphQL connection: everything after `from`, with progress edges, then live. */
function resumeScript(
	ledger: Ledger,
	rng: Random,
	connection: number,
	from: Bound | undefined,
): LiveScript {
	const events: LiveScript['events'] = [];
	let checkpoint: bigint | undefined;
	for (const item of ledger.after(from)) {
		if (checkpoint !== undefined && item.checkpoint !== checkpoint && rng.chance(0.3)) {
			events.push(ledger.progress(item.checkpoint));
		}
		checkpoint = item.checkpoint;
		events.push(ledger.item(Number(item.checkpoint), item.index));
	}
	return endScript(rng, connection, events);
}

function endScript(rng: Random, connection: number, events: LiveScript['events']): LiveScript {
	if (connection >= 6) return { events, end: 'hang' };
	return {
		events: events.slice(0, rng.int(0, events.length)),
		end: rng.pick(['eof', new NetworkError()] as const),
	};
}

/** Reads until the stream completes or delivers the ledger's last item. */
async function run(s: Scenario, seed: number, options: Options, finite: boolean) {
	const ledger = s.ledger();
	const adapter = fakeAdapter(ledger, s.fake(ledger, random(seed)));
	const lastId = itemId(ledger.items.at(-1)!);
	const frames: FakeOutput[] = [];
	const limit = ledger.items.length * 6 + 40;
	const retry = { initialDelay: 0, maxDelay: 0, maxAttempts: Infinity };
	for await (const frame of stream(adapter, { ...options, retry })) {
		frames.push(frame);
		if (frames.length > limit) throw new Error('stream did not converge');
		if (!finite && frame.$kind === 'Item' && frame.id === lastId) break;
	}
	return { frames, ledger };
}

const itemIds = (frames: FakeOutput[]) =>
	frames.flatMap((frame) => (frame.$kind === 'Item' ? [frame.id] : []));

describe('model: exactly-once delivery and resume from every token', () => {
	it.each(Array.from({ length: SEEDS }, (_, seed) => [seed, MODES[seed % MODES.length]] as const))(
		'seed %i (%s)',
		async (seed, mode) => {
			const s = scenario(seed);
			const finite = mode.startsWith('finite');
			const { frames, ledger } = await run(s, seed * 7919 + 1, s.options, finite);
			const delivered = itemIds(frames);
			const expected = (s.expected(ledger) ?? suffixFrom(ledger, delivered[0])).map(itemId);
			expect(delivered).toEqual(expected);
			if (finite) expect(frames.at(-1)?.$kind).toBe('Complete');

			for (const [index, frame] of frames.entries()) {
				if (!frame.resumeToken) continue;
				const remaining = expected.slice(itemIds(frames.slice(0, index + 1)).length);
				// A follow past the last item has nothing to read.
				if (!finite && remaining.length === 0) continue;
				const resumed = await run(
					s,
					seed + index,
					{ ...s.options, start: { resumeToken: frame.resumeToken } },
					finite,
				);
				expect(itemIds(resumed.frames)).toEqual(remaining);
			}
		},
	);
});

function suffixFrom(ledger: Ledger, first: string | undefined): FakeItem[] {
	const index = ledger.items.findIndex((item) => itemId(item) === first);
	return index === -1 ? [] : ledger.items.slice(index);
}
