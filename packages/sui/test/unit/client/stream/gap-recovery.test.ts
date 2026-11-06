// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Gap recovery on a transport whose subscriptions start at the live tip: the gap ends at the
 * subscription's first placed frame, normally its entry watermark, and the feed then advances on
 * the server's heartbeats.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LiveSubscription } from '../../../../src/client/stream/adapter.js';
import { comparePositions, nextUncovered } from '../../../../src/client/stream/position.js';
import { decodeToken } from '../../../../src/client/stream/token.js';
import {
	collect,
	type FakeAdapter,
	fakeAdapter,
	type FakeItem,
	type FakeOptions,
	type FakeOutput,
	ids,
	itemId,
	Ledger,
	type LiveScript,
	LostConnection,
	NetworkError,
	statusLog,
	stream,
	take,
	tokenOf,
} from './fake-ledger.js';

/** Checkpoints 0..`last`, with `count(checkpoint)` items each, indexed through `tip`. */
function ledgerWith(last: number, tip: number, count: (checkpoint: number) => number) {
	return new Ledger(
		Array.from({ length: last + 1 }, (_, checkpoint) => count(checkpoint)),
		tip,
	);
}

const range = (from: number, to: number) =>
	Array.from({ length: to - from + 1 }, (_, i) => `${from + i}:0`);

/**
 * A subscription entered at `entry`: the entry watermark after `entry - 1`, then every item from
 * `entry` through `last`, a heartbeat after every `heartbeat` checkpoints without a match, and a
 * final watermark at `last`.
 */
function subscription(ledger: Ledger, entry: number, last: number, heartbeat: number) {
	const events = [ledger.watermark(entry - 1)];
	let quiet = 0;
	for (let checkpoint = entry; checkpoint <= last; checkpoint++) {
		const items = ledger.liveFrom(checkpoint).filter((event) => {
			return event.$kind === 'Item' && event.item.checkpoint === BigInt(checkpoint);
		});
		events.push(...items);
		quiet = items.length ? 0 : quiet + 1;
		if (quiet === heartbeat || (checkpoint === last && quiet)) {
			events.push(ledger.watermark(checkpoint));
			quiet = 0;
		}
	}
	if (events.at(-1)!.$kind === 'Item') events.push(ledger.watermark(last));
	return events;
}

const positionOfFrame = (frame: FakeOutput) => decodeToken(tokenOf(frame)).position;
const coverageOf = (frame: FakeOutput) => decodeToken(tokenOf(frame)).coverage;

/** Tokens never move backwards: in coverage or in coordinates. */
function expectMonotoneTokens(frames: FakeOutput[]) {
	const tokens = frames.filter((frame) => frame.$kind !== 'Complete');
	for (let i = 1; i < tokens.length; i++) {
		const [before, after] = [tokens[i - 1], tokens[i]];
		const covered = [coverageOf(before), coverageOf(after)].map((c) => nextUncovered(c) ?? -1n);
		expect(covered[1]).toBeGreaterThanOrEqual(covered[0]);
		const [a, b] = [positionOfFrame(before), positionOfFrame(after)];
		expect(comparePositions(b, a)).toBeGreaterThanOrEqual(0);
	}
}

/** Reads frames until a token covers `checkpoint`, then closes the stream. */
async function untilCovered(frames: AsyncGenerator<FakeOutput>, checkpoint: number, limit = 5000) {
	const read: FakeOutput[] = [];
	for await (const frame of frames) {
		read.push(frame);
		if ((nextUncovered(coverageOf(frame)) ?? 0n) > BigInt(checkpoint)) break;
		if (read.length >= limit) throw new Error(`No token covered ${checkpoint}`);
	}
	return read;
}

/** Live statuses split per connection. */
const connections = (log: string[]) =>
	log
		.join(' ')
		.split(/Connecting\(\d+\)/)
		.map((part) => part.trim().split(' ').filter(Boolean));

describe('gap recovery to the first placed frame', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it(
		'S1: delivers the gap and advances on heartbeats with no live item',
		{ timeout: 2000 },
		async () => {
			// History reaches 8. Matches at 9..20 are indexed only after subscribing, and the feed then
			// sends only its entry watermark and heartbeats.
			const ledger = ledgerWith(40, 8, (checkpoint) => (checkpoint <= 20 ? 1 : 0));
			let subscribed = false;
			const adapter = fakeAdapter(ledger, {
				pageSize: 4,
				afterRead: () => {
					if (subscribed) ledger.indexedTip = BigInt(Math.min(Number(ledger.indexedTip) + 3, 40));
				},
				live: () => {
					subscribed = true;
					return { events: subscription(ledger, 21, 40, 5), end: 'hang' };
				},
			});
			const { log, onStatus } = statusLog();
			const frames = await untilCovered(
				stream(adapter, { start: { checkpoint: 0 }, frames: { progress: true }, onStatus }),
				40,
			);
			expect(ids(frames)).toEqual(range(0, 20));
			const after = frames.slice(frames.findIndex((frame) => ids([frame])[0] === '20:0') + 1);
			expect(after.map((frame) => frame.$kind === 'Progress' && frame.coveredCheckpoint)).toEqual([
				'20',
				'25',
				'30',
				'35',
				'40',
			]);
			const statuses = log.filter((status) => !status.startsWith('Page'));
			expect(statuses).toEqual(['Connecting(0)', 'Connected', 'Recovering', 'Live']);
			// Live is reported once the gap's last page is in.
			expect(log.slice(log.indexOf('Recovering') + 1, -1).every((s) => s.startsWith('Page'))).toBe(
				true,
			);
		},
	);

	it('S2: commits nothing past the index while the entry is ahead of it', async () => {
		const ledger = ledgerWith(55, 8, () => 1);
		let subscribed = false;
		const adapter = fakeAdapter(ledger, {
			pageSize: 4,
			afterRead: () => {
				if (subscribed) ledger.indexedTip = BigInt(Math.min(Number(ledger.indexedTip) + 1, 55));
			},
			live: () => {
				subscribed = true;
				return { events: [ledger.watermark(50), ledger.item(51), ledger.item(52)], end: 'hang' };
			},
		});
		const frames: FakeOutput[] = [];
		for await (const frame of stream(adapter, {
			start: { checkpoint: 0 },
			frames: { progress: true },
		})) {
			const covered = nextUncovered(coverageOf(frame))! - 1n;
			expect(covered).toBeLessThanOrEqual(ledger.indexedTip);
			frames.push(frame);
			if (ids([frame])[0] === '52:0') break;
		}
		expect(ids(frames)).toEqual(range(0, 52));
		// The entry watermark commits only once the replay has delivered everything before it.
		const entry = frames.findIndex((f) => f.$kind === 'Progress' && f.coveredCheckpoint === '50');
		expect(entry).toBe(frames.findIndex((frame) => ids([frame])[0] === '50:0') + 1);
	});

	it('S3: never moves a token back when the index is ahead of the subscription', async () => {
		// History commits the boundary before 31; the subscription enters at 21 and repeats 25 and 28.
		const ledger = ledgerWith(45, 30, (checkpoint) => ([25, 28, 35].includes(checkpoint) ? 1 : 0));
		const adapter = fakeAdapter(ledger, {
			afterRead: () => (ledger.indexedTip = 45n),
			live: [
				{
					events: [
						ledger.watermark(20),
						ledger.item(25),
						ledger.watermark(26),
						ledger.item(28),
						ledger.watermark(30),
						ledger.item(35),
						ledger.watermark(40),
					],
					end: 'hang',
				},
			],
		});
		const frames = await untilCovered(
			stream(adapter, { start: { checkpoint: 0 }, frames: { progress: true } }),
			40,
		);
		expect(ids(frames)).toEqual(['25:0', '28:0', '35:0']);
		expectMonotoneTokens(frames);
	});

	it('S4: waits on a quiet feed with one pending read and no timers or pages', async () => {
		vi.useFakeTimers();
		const ledger = ledgerWith(10, 10, () => 1);
		const periods = 1000;
		async function* heartbeats() {
			for (let i = 1; i <= periods; i++) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				yield ledger.watermark(10 + 25 * i);
			}
		}
		let pending = 0;
		let maxPending = 0;
		const adapter = fakeAdapter(ledger, {
			live: [{ events: [ledger.watermark(10)], later: heartbeats(), end: 'hang' }],
		});
		const subscribe = adapter.subscribe;
		adapter.subscribe = (from, signal): LiveSubscription<FakeItem> => {
			const iterator = subscribe(from, signal)[Symbol.asyncIterator]();
			return {
				[Symbol.asyncIterator]: () => ({
					next: () => {
						maxPending = Math.max(maxPending, ++pending);
						return iterator.next().finally(() => pending--);
					},
					return: (value) => iterator.return!(value),
				}),
			};
		};
		const controller = new AbortController();
		const progress: string[] = [];
		let live = false;
		const done = (async () => {
			for await (const frame of stream(adapter, {
				start: { checkpoint: 0 },
				frames: { progress: true },
				signal: controller.signal,
				onStatus: (status) => (live ||= status.$kind === 'Live'),
			})) {
				if (frame.$kind === 'Progress') progress.push(frame.coveredCheckpoint!);
			}
		})().catch(() => {});

		await vi.advanceTimersByTimeAsync(0);
		expect(live).toBe(true);
		const pages = adapter.calls.pages.length;
		const timers = vi.getTimerCount();
		for (let i = 0; i < periods; i++) {
			await vi.advanceTimersByTimeAsync(1000);
			expect(vi.getTimerCount()).toBeLessThanOrEqual(timers);
		}
		expect(maxPending).toBe(1);
		expect(adapter.calls.pages).toHaveLength(pages);
		expect(progress.at(-1)).toBe(String(10 + 25 * periods));
		controller.abort();
		await done;
	});

	it('S5: delivers the same items across disconnects in the gap and in Live', async () => {
		const ledger = () => ledgerWith(60, 10, (checkpoint) => (checkpoint % 3 === 0 ? 1 : 0));
		async function run(disconnects: boolean) {
			const source = ledger();
			const options: FakeOptions = {
				afterRead: (l) => (l.indexedTip = BigInt(Math.min(Number(l.indexedTip) + 2, 60))),
				live: (connection): LiveScript => {
					if (!disconnects) return { events: subscription(source, 20, 60, 4), end: 'hang' };
					// Each connection enters at a new live tip; the third enters behind the committed state.
					const [entry, last] = [
						[20, 40],
						[30, 50],
						[40, 60],
					][Math.min(connection, 2)];
					const end = connection === 1 ? new LostConnection() : 'hang';
					return { events: subscription(source, entry, last, 4), end };
				},
			};
			const adapter: FakeAdapter = fakeAdapter(source, options);
			if (disconnects) {
				const fetchPage = adapter.fetchPage;
				let failed = false;
				adapter.fetchPage = (request) => {
					// Only a gap page has an end.
					if (request.range.end !== undefined && !failed) {
						failed = true;
						throw new NetworkError();
					}
					return fetchPage(request);
				};
			}
			const { log, onStatus } = statusLog();
			const frames = await untilCovered(
				stream(adapter, { start: { checkpoint: 0 }, frames: { progress: true }, onStatus }),
				60,
			);
			return { frames, log, adapter };
		}
		const quiet = await run(false);
		const { frames, log, adapter } = await run(true);
		expect(adapter.calls.subscriptions).toBe(3);
		expect(ids(frames)).toEqual(ids(quiet.frames));
		expect(ids(frames)).toEqual(Array.from({ length: 21 }, (_, i) => `${i * 3}:0`));
		expectMonotoneTokens(frames);
		for (const statuses of connections(log)) {
			const live = statuses.indexOf('Live');
			if (live !== -1) expect(statuses.slice(live)).not.toContain('Recovering');
		}
	});
});

describe('tokens across subscriptions', () => {
	it('drops a watermark behind the last delivered item', async () => {
		const ledger = ledgerWith(12, 9, (checkpoint) => (checkpoint === 10 ? 2 : 0));
		const adapter = fakeAdapter(ledger, {
			live: [
				{ events: [ledger.watermark(9), ledger.item(10, 0)], end: 'eof' },
				// A server behind the first: its watermark after 9 is behind item 10:0.
				{
					events: [ledger.watermark(5), ledger.watermark(9), ledger.item(10, 1)],
					end: 'hang',
				},
			],
		});
		const frames: FakeOutput[] = [];
		for await (const frame of stream(adapter, {
			start: { checkpoint: 10 },
			frames: { progress: true },
		})) {
			frames.push(frame);
			if (ids([frame])[0] === '10:1') break;
		}
		expect(ids(frames)).toEqual(['10:0', '10:1']);
		expectMonotoneTokens(frames);
	});

	it('commits no boundary behind a watermark token on a lagging server', async () => {
		const ledger = ledgerWith(30, 18, (checkpoint) => (checkpoint === 25 ? 1 : 0));
		// The history boundary before 19; the entry watermark after 18 is the same boundary.
		const first = await take(
			stream(fakeAdapter(ledger, { live: [{ events: [ledger.watermark(18)], end: 'hang' }] }), {
				start: { checkpoint: 0 },
				frames: { progress: true },
			}),
			1,
		);
		const token = tokenOf(first.at(-1));
		expect(decodeToken(token).position).toMatchObject({ kind: 'Boundary', checkpoint: 19n });

		ledger.indexedTip = 15n;
		const adapter = fakeAdapter(ledger, {
			afterRead: (l) => (l.indexedTip = BigInt(Math.min(Number(l.indexedTip) + 1, 30))),
			live: [{ events: subscription(ledger, 21, 30, 5), end: 'hang' }],
		});
		const frames = await untilCovered(
			stream(adapter, { start: { resumeToken: token }, frames: { progress: true } }),
			30,
		);
		expect(ids(frames)).toEqual(['25:0']);
		expect(frames.map((frame) => nextUncovered(coverageOf(frame))! > 18n)).not.toContain(false);
		expectMonotoneTokens(frames);
	});
});

describe('S6: gap recovery properties', () => {
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
		return (below: number) => Math.floor(next() * below);
	}

	it(
		'delivers every match once, keeps tokens monotone and resumable',
		{ timeout: 60_000 },
		async () => {
			for (let seed = 1; seed <= 500; seed++) {
				const rng = random(seed);
				const last = 15 + rng(30);
				const counts = Array.from({ length: last + 1 }, () => (rng(10) < 3 ? 1 + rng(2) : 0));
				const ledger = new Ledger(counts, rng(last + 1));
				const start = rng(Math.floor(last / 2));
				const step = 1 + rng(4);
				const heartbeat = 1 + rng(5);
				let cuts = rng(4);
				const adapter = fakeAdapter(ledger, {
					afterRead: (l) => (l.indexedTip = BigInt(Math.min(Number(l.indexedTip) + step, last))),
					live: (): LiveScript => {
						// The server that takes the subscription can be behind or ahead of the index.
						const entry = Math.min(Math.max(Number(ledger.indexedTip) + rng(9) - 4, 1), last + 1);
						const events = subscription(ledger, entry, last, heartbeat);
						if (cuts-- > 0) return { events: events.slice(0, rng(events.length + 1)), end: 'eof' };
						return { events, end: 'hang' };
					},
				});
				const context = `seed ${seed}`;
				const oracle = ledger.items.filter((item) => item.checkpoint >= start).map(itemId);

				const frames = await untilCovered(
					stream(adapter, { start: { checkpoint: start }, frames: { progress: true } }),
					last,
				);
				expect(ids(frames), context).toEqual(oracle);
				expectMonotoneTokens(frames);

				const indexed = new Ledger(counts);
				for (const at of [rng(frames.length), rng(frames.length), frames.length - 1]) {
					const delivered = ids(frames.slice(0, at + 1)).length;
					const resumed = await collect(
						stream(fakeAdapter(indexed), {
							start: { resumeToken: tokenOf(frames[at]) },
							follow: false,
						}),
					);
					expect(ids(resumed), `${context}, frame ${at}`).toEqual(oracle.slice(delivered));
				}
			}
		},
	);
});

describe('a quiet filtered follow', () => {
	const heartbeats = ['15', '20', '25', '30', '35', '40'];

	/** Reads a follow whose filter never matches until a token covers 40. */
	async function follow(how: 'checkpoint' | 'token' | 'reconnect') {
		const ledger = ledgerWith(40, 10, () => 0);
		let start: { checkpoint: number } | { resumeToken: string } = { checkpoint: 5 };
		if (how === 'token') {
			const earlier = ledgerWith(40, 8, () => 0);
			const [frame] = await take(
				stream(fakeAdapter(earlier), { start, frames: { progress: true } }),
				1,
			);
			start = { resumeToken: tokenOf(frame) };
		}
		// The entry watermark after 10, then a heartbeat every 5 quiet checkpoints.
		const live: LiveScript[] =
			how === 'reconnect'
				? [
						{ events: subscription(ledger, 11, 20, 5), end: new LostConnection() },
						{ events: subscription(ledger, 21, 40, 5), end: 'hang' },
					]
				: [{ events: subscription(ledger, 11, 40, 5), end: 'hang' }];
		const adapter = fakeAdapter(ledger, { live });
		return untilCovered(stream(adapter, { start, frames: { progress: true } }), 39);
	}

	it.each(['checkpoint', 'token', 'reconnect'] as const)(
		'yields progress at every heartbeat when started from a %s',
		async (how) => {
			const frames = await follow(how);
			expect(frames.every((frame) => frame.$kind === 'Progress')).toBe(true);
			const covered = frames.map((frame) => frame.$kind === 'Progress' && frame.coveredCheckpoint);
			expect(covered).toEqual(expect.arrayContaining(heartbeats));
			expect(covered.slice(-heartbeats.length)).toEqual(heartbeats);
			// Each token moves forward.
			const positions = frames.map(positionOfFrame);
			for (let i = 1; i < positions.length; i++) {
				expect(comparePositions(positions[i], positions[i - 1])).toBe(1);
			}
		},
	);
});
