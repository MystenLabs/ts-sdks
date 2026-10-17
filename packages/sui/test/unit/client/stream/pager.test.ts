// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import type {
	LedgerStreamAdapter,
	Page,
	PageRequest,
} from '../../../../src/client/stream/adapter.js';
import { readPages, type Pass, type PassEvent } from '../../../../src/client/stream/pager.js';
import {
	boundaryPosition,
	itemPosition,
	progressPosition,
	type StreamPosition,
} from '../../../../src/client/stream/position.js';

const bytes = (label: string) => new TextEncoder().encode(label);
const item = (checkpoint: bigint, index: bigint): StreamPosition =>
	itemPosition(checkpoint, { cursor: bytes(`${checkpoint}:${index}`), transactionIndex: index });
const page = (
	positions: StreamPosition[],
	next: Page<string>['next'],
	fields: Partial<Page<string>> = {},
): Page<string> => ({
	items: positions.map((position) => ({ position, item: label(position) })),
	next,
	...fields,
});
const label = (position: StreamPosition) =>
	position.kind === 'Item' ? `${position.checkpoint}:${position.transactionIndex}` : position.kind;

/** An adapter that answers each request with the next scripted page. */
function scripted(pages: Page<string>[], tip = 100n, family = 'events') {
	const requests: PageRequest[] = [];
	const adapter = {
		family,
		fetchPage: async (request: PageRequest) => {
			requests.push(request);
			const next = pages.shift();
			if (!next) throw new Error('No more pages scripted');
			return next;
		},
		indexedTip: async () => tip,
	} as unknown as LedgerStreamAdapter<string, any>;
	return { adapter, requests };
}

async function read(adapter: LedgerStreamAdapter<string, any>, pass: Omit<Pass, 'signal'>) {
	const events: PassEvent<string>[] = [];
	const pages = readPages(adapter, { ...pass, signal: new AbortController().signal });
	while (true) {
		const next = await pages.next();
		if (next.done) return { events, result: next.value };
		events.push(next.value);
	}
}

const delivered = (events: PassEvent<string>[]) =>
	events.flatMap((event) => {
		if (event.$kind === 'Item') return [event.item];
		if (event.$kind === 'Progress') return [`${event.position.kind}@${event.position.checkpoint}`];
		return [];
	});

describe('readPages', () => {
	const frontier = progressPosition(bytes('f'), { indexedCheckpoint: 20n });
	it.each([
		[
			'checkpoint bounds',
			'events',
			{ start: { checkpoint: 8n }, end: { checkpoint: 12n } },
			{
				range: { start: 8n, end: 12n },
			},
		],
		[
			'an item start, keeping the rest of its checkpoint',
			'events',
			{
				start: { position: item(8n, 1n) },
			},
			{ range: { start: 8n }, after: bytes('8:1') },
		],
		[
			'a checkpoint start by number alone',
			'checkpoints',
			{ start: { position: itemPosition(8n) } },
			{
				range: { start: 9n },
			},
		],
		[
			'a progress start by cursor alone',
			'events',
			{ start: { position: frontier } },
			{
				range: {},
				after: bytes('f'),
			},
		],
		[
			'an end item by its checkpoint',
			'events',
			{
				start: { checkpoint: 1n },
				end: { position: item(8n, 1n) },
			},
			{ range: { start: 1n, end: 9n } },
		],
		[
			'an end checkpoint item, excluding its checkpoint',
			'checkpoints',
			{
				start: { checkpoint: 1n },
				end: { position: itemPosition(8n) },
			},
			{ range: { start: 1n, end: 8n } },
		],
		[
			'an end without a checkpoint by its cursor',
			'events',
			{
				start: { checkpoint: 1n },
				end: { position: frontier },
			},
			{ range: { start: 1n }, before: bytes('f') },
		],
		[
			'descending checkpoint bounds',
			'events',
			{
				order: 'descending',
				start: { checkpoint: 12n },
				end: { checkpoint: 8n },
			},
			{ range: { start: 9n, end: 13n } },
		],
		[
			'a descending item start',
			'events',
			{
				order: 'descending',
				start: { position: item(12n, 0n) },
				end: { position: boundaryPosition(8n) },
			},
			{ range: { start: 8n, end: 13n }, before: bytes('12:0') },
		],
	] as const)('translates %s', async (_, family, pass, expected) => {
		const { adapter, requests } = scripted([page([], { more: false })], 100n, family);
		await read(adapter, { order: 'ascending', ...pass });
		const { range, after, before } = requests[0];
		expect({ range, after, before }).toEqual({ after: undefined, before: undefined, ...expected });
	});

	it('translates checkpoint bounds and continues with each page cursor', async () => {
		const { adapter, requests } = scripted([
			page([item(3n, 0n), item(3n, 1n)], { more: true, cursor: bytes('3:1') }, { viewedAt: 9n }),
			page([item(4n, 0n)], { more: false, cursor: bytes('4:0') }, { viewedAt: 9n }),
		]);
		const { events, result } = await read(adapter, {
			order: 'ascending',
			start: { checkpoint: 3n },
			end: { checkpoint: 6n },
		});
		expect(delivered(events)).toEqual(['3:0', '3:1', '4:0', 'Boundary@6']);
		expect(result).toEqual({ complete: true, retentionLimit: false });
		expect(requests.map(({ range, after }) => ({ range, after }))).toEqual([
			{ range: { start: 3n, end: 6n }, after: undefined },
			{ range: { start: 3n, end: 6n }, after: bytes('3:1') },
		]);
	});

	it('resumes after a start cursor and stops at an end item by its coordinates', async () => {
		const { adapter, requests } = scripted([
			page([item(5n, 2n), item(6n, 0n), item(6n, 1n)], { more: true, cursor: bytes('6:1') }),
		]);
		const { events, result } = await read(adapter, {
			order: 'ascending',
			start: { position: item(5n, 1n) },
			end: { position: item(6n, 1n) },
		});
		expect(delivered(events)).toEqual(['5:2', '6:0']);
		expect(result.complete).toBe(true);
		expect(requests[0]).toMatchObject({ range: { start: 5n, end: 7n }, after: bytes('5:1') });
		expect(requests[0].before).toBeUndefined();
	});

	it('commits an empty page cursor as progress', async () => {
		const { adapter } = scripted([
			page([], { more: true, cursor: bytes('quiet') }, { viewedAt: 8n }),
			page([item(9n, 0n)], { more: false }, { viewedAt: 9n }),
		]);
		const { events } = await read(adapter, { order: 'ascending', start: { checkpoint: 1n } });
		const progress = events.find((event) => event.$kind === 'Progress');
		expect(progress).toMatchObject({ position: { kind: 'Progress', indexedCheckpoint: 8n } });
		expect(delivered(events)).toEqual(['Progress@null', '9:0', 'Boundary@10']);
	});

	it.each([
		['repeats the cursor it was sent', { more: true, cursor: bytes('5:1') }],
		['has more items but no cursor', { more: true }],
	])('rejects a page that %s', async (_, next) => {
		const { adapter } = scripted([page([], next)]);
		await expect(
			read(adapter, { order: 'ascending', start: { position: item(5n, 1n) } }),
		).rejects.toMatchObject({ code: 'Protocol' });
	});

	it('ends incomplete when the server is behind the point it resumes from', async () => {
		const { adapter } = scripted([page([item(7n, 0n)], { more: false }, { viewedAt: 4n })]);
		const { events, result } = await read(adapter, {
			order: 'ascending',
			start: { position: item(5n, 0n) },
		});
		expect(delivered(events)).toEqual([]);
		expect(result.complete).toBe(false);
	});

	it('reads the tip before trusting a descending start it cannot see', async () => {
		const { adapter } = scripted([page([item(5n, 0n)], { more: false })], 3n);
		const { result } = await read(adapter, { order: 'descending', start: { checkpoint: 5n } });
		expect(result.complete).toBe(false);
	});

	it('fails a range that starts below the retained history', async () => {
		const { adapter } = scripted([page([], { more: false }, { retainedFrom: 4n })]);
		await expect(
			read(adapter, { order: 'ascending', start: { checkpoint: 2n }, end: { checkpoint: 5n } }),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
	});

	it('fails when retention moves past unread history between pages', async () => {
		const { adapter } = scripted([
			page([item(10n, 0n)], { more: true, cursor: bytes('c1') }, { retainedFrom: 5n }),
			page([item(15n, 0n)], { more: false }, { retainedFrom: 15n }),
		]);
		const events: PassEvent<string>[] = [];
		const pages = readPages(adapter, {
			order: 'ascending',
			start: { checkpoint: 5n },
			end: { checkpoint: 30n },
			signal: new AbortController().signal,
		});
		await expect(
			(async () => {
				for await (const event of pages) events.push(event);
			})(),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
		expect(delivered(events)).toEqual(['10:0']);
	});

	it('fails a checkpoint range whose next checkpoint is pruned between pages', async () => {
		const checkpoint = (n: bigint) => itemPosition(n, { cursor: bytes(`${n}`) });
		const { adapter } = scripted(
			[
				page([checkpoint(10n)], { more: true, cursor: bytes('10') }, { retainedFrom: 10n }),
				page([checkpoint(20n), checkpoint(21n)], { more: false }, { retainedFrom: 20n }),
			],
			100n,
			'checkpoints',
		);
		await expect(
			read(adapter, { order: 'ascending', start: { checkpoint: 10n }, end: { checkpoint: 22n } }),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
	});

	it('fails a descending read that starts below the retained history', async () => {
		const { adapter } = scripted([page([], { more: false }, { retainedFrom: 9n })]);
		await expect(
			read(adapter, { order: 'descending', start: { checkpoint: 3n } }),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
	});

	it('completes a range ending at a progress cursor once the server has indexed past it', async () => {
		const end = { position: progressPosition(bytes('end'), { indexedCheckpoint: 100n }) };
		const pass = { order: 'ascending', start: { checkpoint: 1n }, end } as const;

		const caughtUp = scripted([
			page([item(5n, 0n)], { more: false }, { covered: 9n, viewedAt: 100n }),
		]);
		const done = await read(caughtUp.adapter, pass);
		expect(caughtUp.requests[0].before).toEqual(bytes('end'));
		expect(delivered(done.events)).toEqual(['5:0']);
		expect(done.result.complete).toBe(true);

		const lagging = scripted([page([], { more: false }, { covered: 9n, viewedAt: 95n })]);
		expect((await read(lagging.adapter, pass)).result.complete).toBe(false);
	});

	it('reports a descending read to genesis that stopped at the retained history', async () => {
		const { adapter } = scripted([page([item(5n, 0n)], { more: false }, { retainedFrom: 4n })]);
		const { result } = await read(adapter, { order: 'descending', start: { checkpoint: 6n } });
		expect(result).toEqual({ complete: true, retentionLimit: true });
	});

	it('commits the boundary after a quiet range, within it, and judges completeness', async () => {
		const quiet = (fields: Partial<Page<string>>) => scripted([page([], { more: false }, fields)]);
		const pass = {
			order: 'ascending',
			start: { checkpoint: 3n },
			end: { checkpoint: 8n },
		} as const;

		const behind = await read(quiet({ viewedAt: 5n }).adapter, pass);
		expect(delivered(behind.events)).toEqual(['Boundary@6']);
		expect(behind.result.complete).toBe(false);

		const covered = await read(quiet({ covered: 7n }).adapter, pass);
		expect(delivered(covered.events)).toEqual(['Boundary@8']);
		expect(covered.result.complete).toBe(true);

		const before = await read(quiet({ viewedAt: 1n }).adapter, pass);
		expect(delivered(before.events)).toEqual(['Boundary@3']);
	});
});
