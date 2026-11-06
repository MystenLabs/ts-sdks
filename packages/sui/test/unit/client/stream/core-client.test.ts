// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { CoreClient, type LedgerStreamRequest } from '../../../../src/client/core.js';
import type { AnyLedgerStreamAdapter } from '../../../../src/client/stream/adapter.js';
import { SuiStreamError } from '../../../../src/client/stream/errors.js';
import { fakeAdapter, ids, Ledger, noDelay, take, type FakeOutput } from './fake-ledger.js';

/** Leaves the abstract transport methods out: only the stream methods are exercised. */
abstract class StreamingCoreClient extends CoreClient {
	readonly requests: LedgerStreamRequest[] = [];
	ledger!: Ledger;

	protected override createLedgerStreamAdapter(
		request: LedgerStreamRequest,
	): AnyLedgerStreamAdapter {
		this.requests.push(request);
		return fakeAdapter(this.ledger, { family: request.family });
	}
}
abstract class NonStreamingCoreClient extends CoreClient {}

function instantiate<T extends CoreClient>(Class: abstract new (...args: never[]) => T): T {
	const Concrete = Class as unknown as new (options: { network: string; base: never }) => T;
	return new Concrete({ network: 'localnet', base: undefined as never });
}

function streamingClient(ledger: Ledger) {
	return Object.assign(instantiate(StreamingCoreClient), { ledger });
}

/** The fake adapter's frames carry a `checkpoint:index` id. */
async function idsOf(stream: AsyncGenerator<unknown>, count: number) {
	return ids((await take(stream, count)) as FakeOutput[]);
}

const finite = { start: { checkpoint: 0 }, follow: false, retry: noDelay } as const;

describe('CoreClient ledger streams', () => {
	it('asks the transport hook for each family with the caller options, on the first next()', async () => {
		const client = streamingClient(new Ledger([1, 1, 1]));
		const filter = { sender: '0x1' };
		const streams = [
			client.streamCheckpoints(finite),
			client.streamTransactions({ ...finite, filter, include: { effects: true } }),
			client.streamEvents({ ...finite, filter }),
		];
		expect(client.requests).toEqual([]);
		for (const stream of streams) expect(await idsOf(stream, 3)).toEqual(['0:0', '1:0', '2:0']);
		expect(client.requests).toEqual([
			{ family: 'checkpoints', options: finite },
			{ family: 'transactions', options: { ...finite, filter, include: { effects: true } } },
			{ family: 'events', options: { ...finite, filter } },
		]);
	});

	it('passes frame options through to the core', async () => {
		const client = streamingClient(new Ledger([1]));
		const frames = await take(client.streamEvents({ ...finite, frames: { completion: true } }), 2);
		expect(frames.map((frame) => frame.$kind)).toEqual(['Item', 'Complete']);
	});

	it('reports a client without stream support as an InvalidOptions stream error', async () => {
		const client = instantiate(NonStreamingCoreClient);
		const stream = client.streamEvents();
		await expect(stream.next()).rejects.toMatchObject({
			name: 'SuiStreamError',
			code: 'InvalidOptions',
			message: expect.stringContaining('does not support ledger streams'),
		});
	});

	it.each([
		['transactions', { affectedAddress: '0x1', function: '0x2::coin' }, 'at most one of'],
		['transactions', { function: '0x2::a::b::c' }, 'Invalid function filter'],
		['events', { emitModule: '0x2::a::b' }, 'Invalid emitModule filter'],
	] as const)(
		'rejects an invalid %s filter %o with InvalidOptions before calling the transport',
		async (family, filter, message) => {
			const client = streamingClient(new Ledger([1]));
			const options = { ...finite, filter: filter as never };
			const stream =
				family === 'events' ? client.streamEvents(options) : client.streamTransactions(options);
			const error = await stream.next().catch((error: unknown) => error);
			expect(error).toBeInstanceOf(SuiStreamError);
			expect(error).toMatchObject({ code: 'InvalidOptions' });
			expect((error as Error).message).toContain(message);
			expect(client.requests).toEqual([]);
		},
	);
});
