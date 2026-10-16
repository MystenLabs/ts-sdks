// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { isBufferOverflow, openLedgerCall } from '../../../../src/grpc/stream/call.js';
import { GRPC_FAMILIES, type LiveFrame } from '../../../../src/grpc/stream/families.js';
import { event, FakeLedger, mark, progress, type Delivery } from './fake-grpc.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

function open(ledger: FakeLedger, options: { maxItems?: number; coalesceProgress?: boolean } = {}) {
	const controller = new AbortController();
	const call = openLedgerCall(
		ledger,
		GRPC_FAMILIES.events.subscribe,
		{ readMask: { paths: [] } },
		{ signal: controller.signal, isItem: (frame: LiveFrame) => !!frame.event, ...options },
	);
	return { call, controller };
}

async function rejection(promise: Promise<unknown>) {
	return promise.then(
		() => {
			throw new Error('expected a rejection');
		},
		(error: unknown) => error,
	);
}

describe('ledger calls: pull path', () => {
	it('reads a response only when asked', async () => {
		const ledger = new FakeLedger('pull').subscribe(
			'SubscribeEvents',
			[1, 2, 3, 4].map((n) => event(n)),
		);
		const { call } = open(ledger);
		await settle();
		expect(ledger.reads.SubscribeEvents ?? 0).toBe(0);
		await call.next();
		await settle();
		expect(ledger.reads.SubscribeEvents).toBe(1);
		await call.return();
	});

	it('reads ahead into the bounded queue only while asked to, and overflows past it', async () => {
		const frames = Array.from({ length: 10 }, (_, n) => event(n + 1));
		const ledger = new FakeLedger('pull').subscribe('SubscribeEvents', frames);
		const { call } = open(ledger, { maxItems: 4 });
		expect((await call.next()).value?.event?.checkpoint).toBe(1n);
		call.readAhead(true);
		await settle();
		call.readAhead(false);
		expect(ledger.reads.SubscribeEvents).toBe(6);
		for (const checkpoint of [2n, 3n, 4n, 5n]) {
			expect((await call.next()).value?.event?.checkpoint).toBe(checkpoint);
		}
		expect(isBufferOverflow(await rejection(call.next()))).toBe(true);
		await call.return();
		expect(ledger.cancelled.SubscribeEvents).toBe(1);
	});

	it('stops reading when read-ahead is switched off', async () => {
		const frames = Array.from({ length: 3 }, (_, n) => event(n + 1));
		const ledger = new FakeLedger('pull').subscribe('SubscribeEvents', frames);
		const { call } = open(ledger);
		call.readAhead(true);
		await settle();
		call.readAhead(false);
		const read = ledger.reads.SubscribeEvents;
		await settle();
		expect(ledger.reads.SubscribeEvents).toBe(read);
		await call.return();
		expect(ledger.cancelled.SubscribeEvents).toBe(1);
	});
});

describe('ledger calls: push path (interceptor configured)', () => {
	it('holds at most the bounded queue, draining the protobuf runtime queue', async () => {
		const frames = Array.from({ length: 100 }, (_, n) => event(n + 1));
		const ledger = new FakeLedger('push').subscribe('SubscribeEvents', frames);
		const { call, controller } = open(ledger, { maxItems: 2 });
		await settle();
		// The transport pushed past the limit, so the call was cancelled at the third item.
		expect(controller.signal.aborted).toBe(false);
		expect(ledger.cancelled.SubscribeEvents).toBe(1);
		expect((await call.next()).done).toBe(false);
		expect((await call.next()).done).toBe(false);
		expect(isBufferOverflow(await rejection(call.next()))).toBe(true);
		await call.return();
	});
});

describe.each(['pull', 'push'] satisfies Delivery[])('ledger calls (%s)', (delivery) => {
	it('cancels a pending read on return()', async () => {
		const ledger = new FakeLedger(delivery).subscribe('SubscribeEvents', []);
		const { call } = open(ledger);
		const pending = call.next();
		await settle();
		await call.return();
		expect(await pending).toEqual({ done: true, value: undefined });
		expect(ledger.cancelled.SubscribeEvents).toBe(1);
	});

	it('cancels a pending read when the stream signal aborts', async () => {
		const ledger = new FakeLedger(delivery).subscribe('SubscribeEvents', []);
		const { call, controller } = open(ledger);
		const pending = call.next();
		await settle();
		controller.abort(new Error('stop'));
		expect(await rejection(pending)).toMatchObject({ message: 'stop' });
		await call.return();
	});

	it('keeps only the newest of consecutive queued progress responses when coalescing', async () => {
		const ledger = new FakeLedger(delivery).subscribe('SubscribeEvents', [
			progress(mark('a'), 1),
			progress(mark('b'), 2),
			event(3),
		]);
		const { call } = open(ledger, { coalesceProgress: true });
		call.readAhead(true);
		await settle();
		expect((await call.next()).value?.watermark?.checkpoint).toBe(2n);
		expect((await call.next()).value?.event?.checkpoint).toBe(3n);
		await call.return();
	});
});
