// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { assertAdvanced } from '../../../../src/client/stream/errors.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';
import {
	collect,
	fakeAdapter,
	ids,
	Ledger,
	NetworkError,
	statusLog,
	stream,
	take,
	tokenOf,
} from './fake-ledger.js';

const ledgerOf = (last: number, tip = last) => new Ledger(Array(last + 1).fill(1), tip);

describe('startup', () => {
	it('does nothing before the first next()', async () => {
		const adapter = fakeAdapter(ledgerOf(3));
		const frames = stream(adapter, { start: { checkpoint: 0 }, follow: false });
		expect(adapter.calls.initialize).toBe(0);
		expect(await frames.next()).toMatchObject({ value: { id: '0:0' } });
		expect(adapter.calls.initialize).toBe(1);
		await frames.return(undefined);
	});

	it('aborts before startup without reading the identity or the tip', async () => {
		const adapter = fakeAdapter(ledgerOf(3));
		const signal = AbortSignal.abort(new Error('cancelled'));
		await expect(stream(adapter, { signal }).next()).rejects.toThrow('cancelled');
		expect(adapter.calls).toMatchObject({ initialize: 0, indexedTip: 0 });
	});
});

describe('frames', () => {
	it('emits Complete only when requested', async () => {
		const options = { start: { checkpoint: 0 }, follow: false } as const;
		const plain = await collect(stream(fakeAdapter(ledgerOf(2)), options));
		expect(plain.map((frame) => frame.$kind)).toEqual(['Item', 'Item', 'Item']);
		const withCompletion = await collect(
			stream(fakeAdapter(ledgerOf(2)), { ...options, frames: { completion: true } }),
		);
		expect(withCompletion.map((frame) => frame.$kind)).toEqual([
			'Item',
			'Item',
			'Item',
			'Complete',
		]);
	});

	it('advances tokens only through the item the consumer received', async () => {
		const ledger = ledgerOf(5);
		const adapter = fakeAdapter(ledger);
		const pulled: string[] = [];
		const scan = adapter.scan;
		adapter.scan = async function* (request) {
			for await (const event of scan(request)) {
				if (event.$kind === 'Item') pulled.push(`${event.item.checkpoint}`);
				yield event;
			}
		};
		const [first] = await take(stream(adapter, { start: { checkpoint: 0 }, follow: false }), 1);
		expect(pulled).toEqual(['0']);
		const rest = await collect(
			stream(fakeAdapter(ledger), { start: { resumeToken: tokenOf(first) }, follow: false }),
		);
		expect(ids(rest)).toEqual(['1:0', '2:0', '3:0', '4:0', '5:0']);
	});

	it('builds frames that survive spreading and JSON', async () => {
		const [frame] = await take(stream(fakeAdapter(ledgerOf(1)), { start: { checkpoint: 0 } }), 1);
		expect(JSON.parse(JSON.stringify({ ...frame }))).toEqual(frame);
	});
});

describe('cancellation', () => {
	it('cancels a quiet pending read on return()', async () => {
		const ledger = ledgerOf(3);
		const adapter = fakeAdapter(ledger, { live: [{ events: [], end: 'hang' }] });
		const frames = stream(adapter, { start: { checkpoint: 4 } });
		const pending = frames.next();
		const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		await new Promise((resolve) => setTimeout(resolve, 5));
		await frames.return(undefined);
		await rejected;
	});

	it('cancels a retry wait, never completes, and reports no Error', async () => {
		const controller = new AbortController();
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(ledgerOf(3), {
			scanFaults: [{ failAfterItems: 0, error: new NetworkError() }],
		});
		const frames = stream(adapter, {
			start: { checkpoint: 0 },
			follow: false,
			signal: controller.signal,
			frames: { completion: true },
			retry: { initialDelay: 60_000 },
			onStatus: (status) => {
				onStatus(status);
				if (status.$kind === 'Retrying') controller.abort();
			},
		});
		await expect(collect(frames)).rejects.toMatchObject({ name: 'AbortError' });
		expect(log).toEqual(['Connecting(0)', 'Connected', expect.stringMatching(/^Retrying\(1,/)]);
	});
});

describe('errors', () => {
	it('reports a fatal error once as an Error status and rethrows it unchanged', async () => {
		const error = new TypeError('malformed');
		const statuses: SuiClientTypes.StreamStatus[] = [];
		const adapter = fakeAdapter(ledgerOf(3), { scanFaults: [{ failAfterItems: 1, error }] });
		await expect(
			collect(
				stream(adapter, {
					start: { checkpoint: 0 },
					follow: false,
					onStatus: (status) => statuses.push(status),
				}),
			),
		).rejects.toBe(error);
		expect(statuses.filter((status) => status.$kind === 'Error')).toEqual([
			{ $kind: 'Error', error },
		]);
	});

	it.each(['Connecting', 'Connected', 'Page'])(
		'ends the stream when onStatus throws on %s, even with a transient-looking error',
		async (kind) => {
			const error = new NetworkError('callback');
			const seen: string[] = [];
			const adapter = fakeAdapter(ledgerOf(3));
			const frames = stream(adapter, {
				start: { checkpoint: 0 },
				follow: false,
				onStatus: (status) => {
					seen.push(status.$kind);
					if (status.$kind === kind) throw error;
				},
			});
			await expect(collect(frames)).rejects.toBe(error);
			expect(seen).not.toContain('Retrying');
			expect(seen).not.toContain('Error');
			expect(adapter.calls.scans.length).toBeLessThanOrEqual(1);
		},
	);

	it('gives adapters a protocol error for pagination that does not advance', () => {
		expect(() => assertAdvanced(undefined, 'a')).not.toThrow();
		expect(() => assertAdvanced('a', 'b')).not.toThrow();
		expect(() => assertAdvanced('a', 'a')).toThrow(
			expect.objectContaining({ name: 'SuiStreamError', code: 'Protocol' }),
		);
	});
});
