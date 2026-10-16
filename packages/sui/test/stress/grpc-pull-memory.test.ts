// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MethodInfo } from '@protobuf-ts/runtime-rpc';
import { expect, it } from 'vitest';

import { GrpcWebFetchTransport } from '../../src/grpc/index.js';
import {
	SubscribeCheckpointsResponse,
	SubscriptionService,
} from '../../src/grpc/proto/sui/rpc/v2/subscription_service.js';
import type { SubscribeCheckpointsRequest } from '../../src/grpc/proto/sui/rpc/v2/subscription_service.js';
import { pullServerStreaming } from '../../src/grpc/pull-call.js';

// Needs `--expose-gc`, which `test/stress/vitest.config.mts` passes to the worker.
const gc = (globalThis as { gc?: () => void }).gc;

const method = SubscriptionService.methods[0] as MethodInfo<
	SubscribeCheckpointsRequest,
	SubscribeCheckpointsResponse
>;

function dataFrame(payload: Uint8Array): Uint8Array {
	const frame = new Uint8Array(5 + payload.length);
	new DataView(frame.buffer).setUint32(1, payload.length);
	frame.set(payload, 5);
	return frame;
}

/** A message carrying `size` bytes in an unknown length-delimited field (number 1000). */
function largeMessage(i: number, size: number): Uint8Array {
	const cursor = SubscribeCheckpointsResponse.toBinary({ cursor: BigInt(i) });
	const field = [0xc2, 0x3e]; // tag: field 1000, wire type 2
	for (let n = size; ; n >>>= 7) {
		if (n < 0x80) {
			field.push(n);
			break;
		}
		field.push((n & 0x7f) | 0x80);
	}
	const out = new Uint8Array(cursor.length + field.length + size);
	out.set(cursor);
	out.set(field, cursor.length);
	return out;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

it.skipIf(!gc)('releases consumed chunks while the stream stays open', async () => {
	const N = 2000;
	const refs: WeakRef<Uint8Array>[] = [];
	let index = 0;
	const stream = new ReadableStream<Uint8Array>(
		{
			pull(controller): Promise<void> | void {
				// The stream stays open after the last frame.
				if (index >= N) return new Promise(() => {});
				const chunk = dataFrame(largeMessage(index++, 64 * 1024));
				refs.push(new WeakRef(chunk));
				controller.enqueue(chunk);
			},
		},
		{ highWaterMark: 0 },
	);
	const transport = new GrpcWebFetchTransport({
		baseUrl: 'http://localhost',
		format: 'binary',
		fetch: (async () =>
			new Response(stream, {
				status: 200,
				headers: { 'content-type': 'application/grpc-web+proto' },
			})) as unknown as typeof fetch,
	});
	const call = pullServerStreaming(transport)!(method, {});
	for (let i = 0; i < N; i++) {
		expect((await call.responses.next()).value?.cursor).toBe(BigInt(i));
	}
	await settle();
	gc!();
	await settle();
	gc!();
	const live = refs.filter((ref) => ref.deref() !== undefined).length;
	expect(live).toBeLessThanOrEqual(2);
	await call.responses.return!();
});

/** Serves `chunks` one per pull, then never answers again. Keeps no reference to a served chunk. */
function hangingFetch(chunks: (() => Uint8Array)[]): typeof fetch {
	let index = 0;
	const stream = new ReadableStream<Uint8Array>(
		{
			pull(controller): Promise<void> | void {
				if (index >= chunks.length) return new Promise(() => {});
				controller.enqueue(chunks[index++]());
			},
		},
		{ highWaterMark: 0 },
	);
	return (async () =>
		new Response(stream, {
			status: 200,
			headers: { 'content-type': 'application/grpc-web+proto' },
		})) as unknown as typeof fetch;
}

async function collected(ref: WeakRef<object>): Promise<boolean> {
	for (let i = 0; i < 3; i++) {
		await settle();
		gc!();
	}
	return ref.deref() === undefined;
}

it.skipIf(!gc)('releases a buffered partial frame when the call is cancelled', async () => {
	let ref: WeakRef<Uint8Array> | undefined;
	const fetch = hangingFetch([
		() => dataFrame(SubscribeCheckpointsResponse.toBinary({ cursor: 0n })),
		() => {
			// The first 4 MiB of an 8 MiB frame.
			const frame = dataFrame(largeMessage(1, 8 * 1024 * 1024)).slice(0, 4 * 1024 * 1024);
			ref = new WeakRef(frame);
			return frame;
		},
	]);
	const transport = new GrpcWebFetchTransport({ baseUrl: 'http://localhost', fetch });
	const call = pullServerStreaming(transport)!(method, {});
	expect((await call.responses.next()).value?.cursor).toBe(0n);
	const pending = call.responses.next();
	await settle();
	expect(ref?.deref()).toBeDefined();
	await call.responses.return!();
	await expect(pending).resolves.toEqual({ done: true, value: undefined });
	// The cancelled call is still referenced; the bytes it buffered are not.
	expect(await collected(ref!)).toBe(true);
	expect(call).toBeDefined();
});

it.skipIf(!gc)('releases the rest of a coalesced chunk when the consumer breaks', async () => {
	let ref: WeakRef<Uint8Array> | undefined;
	const fetch = hangingFetch([
		() => {
			const first = dataFrame(SubscribeCheckpointsResponse.toBinary({ cursor: 0n }));
			const second = dataFrame(largeMessage(1, 4 * 1024 * 1024));
			const chunk = new Uint8Array(first.length + second.length);
			chunk.set(first);
			chunk.set(second, first.length);
			ref = new WeakRef(chunk);
			return chunk;
		},
	]);
	const transport = new GrpcWebFetchTransport({ baseUrl: 'http://localhost', fetch });
	const call = pullServerStreaming(transport)!(method, {});
	for await (const message of call.responses) {
		expect(message.cursor).toBe(0n);
		break;
	}
	expect(await collected(ref!)).toBe(true);
	expect(call).toBeDefined();
});
