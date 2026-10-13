// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MethodInfo, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';
import {
	SubscribeCheckpointsRequest,
	SubscribeCheckpointsResponse,
	SubscriptionService,
} from '../../../src/grpc/proto/sui/rpc/v2/subscription_service.js';
import { isNonRetryable } from '../../../src/grpc/pull.js';
import { openLedgerCall } from '../../../src/grpc/stream-buffer.js';

function dataFrame(payload: Uint8Array): Uint8Array {
	const frame = new Uint8Array(5 + payload.length);
	new DataView(frame.buffer).setUint32(1, payload.length);
	frame.set(payload, 5);
	return frame;
}

function trailerFrame(status = 0, message?: string, extra: Record<string, string> = {}) {
	let text = `grpc-status:${status}\r\n`;
	if (message !== undefined) text += `grpc-message:${message}\r\n`;
	for (const [k, v] of Object.entries(extra)) text += `${k}:${v}\r\n`;
	const bytes = new TextEncoder().encode(text);
	const frame = dataFrame(bytes);
	frame[0] = 0x80;
	return frame;
}

const message = (i: number) => SubscribeCheckpointsResponse.toBinary({ cursor: BigInt(i) });
const frames = (n: number) => Array.from({ length: n }, (_, i) => dataFrame(message(i)));

function concat(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.length;
	}
	return out;
}

/** Splits every part into `pieces` chunks, so no chunk holds a whole frame. */
function split(parts: Uint8Array[], pieces: number): Uint8Array[] {
	return parts.flatMap((part) => {
		const size = Math.ceil(part.length / pieces);
		const out: Uint8Array[] = [];
		for (let i = 0; i < part.length; i += size) out.push(part.subarray(i, i + size));
		return out;
	});
}

function group(parts: Uint8Array[], perChunk: number): Uint8Array[] {
	const out: Uint8Array[] = [];
	for (let i = 0; i < parts.length; i += perChunk) out.push(concat(parts.slice(i, i + perChunk)));
	return out;
}

interface Body {
	stream: ReadableStream<Uint8Array>;
	pulls: number;
	cancelled: unknown[];
}

/**
 * A body that produces one chunk per pull and buffers nothing ahead (`highWaterMark: 0`).
 * `hangAfter` stops answering pulls after that many chunks; `errorAt` errors that pull.
 */
function body(chunks: Uint8Array[], opts: { hangAfter?: number; errorAt?: number } = {}): Body {
	const state: Body = { stream: undefined!, pulls: 0, cancelled: [] };
	let index = 0;
	state.stream = new ReadableStream<Uint8Array>(
		{
			pull(controller): Promise<void> | void {
				state.pulls++;
				if (opts.errorAt !== undefined && index === opts.errorAt) {
					controller.error(new TypeError('socket hang up'));
					return;
				}
				if (opts.hangAfter !== undefined && index >= opts.hangAfter) return new Promise(() => {});
				if (index < chunks.length) controller.enqueue(chunks[index++]);
				else controller.close();
			},
			cancel(reason) {
				state.cancelled.push(reason);
			},
		},
		{ highWaterMark: 0 },
	);
	return state;
}

interface FakeServer {
	fetch: typeof globalThis.fetch;
	signal?: AbortSignal;
	headers?: Headers;
	requestBody?: unknown;
}

function server(
	respond: () => Response | Promise<Response> | 'hang',
	{ abortErrorsFetch = true } = {},
): FakeServer {
	const s: FakeServer = {
		fetch: (async (_url: string, init: RequestInit) => {
			s.signal = init.signal ?? undefined;
			s.headers = init.headers as Headers;
			s.requestBody = init.body;
			const result = respond();
			if (result !== 'hang') return result;
			// Ignores the signal unless asked: our code must not rely on fetch honoring it.
			return new Promise<Response>((_, reject) => {
				if (abortErrorsFetch)
					init.signal?.addEventListener('abort', () => reject(init.signal!.reason));
			});
		}) as unknown as typeof globalThis.fetch,
	};
	return s;
}

const grpcWeb = (b: Body | null, headers: Record<string, string> = {}) =>
	new Response(b?.stream ?? null, {
		status: 200,
		headers: { 'content-type': 'application/grpc-web+proto', ...headers },
	});

/** The real method with a decode counter. */
function countingMethod() {
	const counter = { decodes: 0 };
	const base = SubscriptionService.methods[0] as MethodInfo<
		SubscribeCheckpointsRequest,
		SubscribeCheckpointsResponse
	>;
	const O = Object.create(base.O);
	O.fromBinary = (...args: Parameters<typeof base.O.fromBinary>) => {
		counter.decodes++;
		return base.O.fromBinary(...args);
	};
	return { method: { ...base, O } as typeof base, counter };
}

/** Like a generated client, merge the transport's default options into each call's options. */
function transport(s: FakeServer, extra: object = {}) {
	const t = new GrpcWebFetchTransport({
		baseUrl: 'http://localhost',
		format: 'binary',
		fetch: s.fetch,
		...extra,
	});
	const pull = t.serverStreamingIterable.bind(t);
	const push = t.serverStreaming.bind(t);
	t.serverStreamingIterable = (m, i, o) => pull(m, i, t.mergeOptions(o));
	t.serverStreaming = (m, i, o) => push(m, i, t.mergeOptions(o));
	return t;
}

const settle = () => new Promise((r) => setTimeout(r, 20));

async function rejection(promise: Promise<unknown>) {
	try {
		await promise;
	} catch (error) {
		return error as RpcError;
	}
	throw new Error('expected rejection');
}

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);
beforeEach(() => {
	unhandled.length = 0;
	process.on('unhandledRejection', onUnhandled);
});
afterEach(async () => {
	await settle();
	process.off('unhandledRejection', onUnhandled);
	expect(unhandled).toEqual([]);
});

describe('demand', () => {
	const N = 1000;
	const layouts = {
		'one frame per chunk': () => [...frames(N), trailerFrame()],
		'100 frames per chunk': () => [...group(frames(N), 100), trailerFrame()],
		'every frame split in 3 chunks': () => split([...frames(N), trailerFrame()], 3),
		'all 1000 frames + trailer in 1 chunk': () => [concat([...frames(N), trailerFrame()])],
	};

	it('baseline: existing serverStreaming reads and decodes everything without demand', async () => {
		const b = body(layouts['one frame per chunk']());
		const s = server(() => grpcWeb(b));
		const { method, counter } = countingMethod();
		const call = transport(s).serverStreaming(method, {}, {});
		await call.status;
		expect(b.pulls).toBe(N + 2);
		expect(counter.decodes).toBe(N);
	});

	for (const [layout, chunks] of Object.entries(layouts)) {
		it(`pull: ${layout}`, async () => {
			const parts = chunks();
			const b = body(parts);
			const s = server(() => grpcWeb(b));
			const { method, counter } = countingMethod();
			const call = transport(s).serverStreamingIterable(method, {}, {});
			await call.headers;
			await settle();
			const idle = { pulls: b.pulls, decodes: counter.decodes };

			const first = await call.responses.next();
			expect(first.value?.cursor).toBe(0n);
			await settle();
			const afterOne = { pulls: b.pulls, decodes: counter.decodes };
			const second = await call.responses.next();
			expect(second.value?.cursor).toBe(1n);
			await settle();
			const afterTwo = { pulls: b.pulls, decodes: counter.decodes };

			let expected = 2n;
			for await (const m of call.responses) expect(m.cursor).toBe(expected++);
			expect(expected).toBe(BigInt(N));
			await expect(call.status).resolves.toEqual({ code: 'OK', detail: 'OK' });

			expect(idle).toEqual({ pulls: 0, decodes: 0 });
			expect(afterOne.decodes).toBe(1);
			expect(afterTwo.decodes).toBe(2);
			// Never more pulls than needed to complete the frames asked for.
			const needed = (k: number) => {
				let bytes = 0;
				for (let i = 0; i < k; i++) bytes += message(i).length + 5;
				let pulls = 0;
				for (let acc = 0; acc < bytes; pulls++) acc += parts[pulls].length;
				return pulls;
			};
			expect(afterOne.pulls).toBe(needed(1));
			expect(afterTwo.pulls).toBe(needed(2));
			expect(counter.decodes).toBe(N);
		});
	}

	it('pull: grpc-web-text mode, 997-byte base64 chunks', async () => {
		const binary = concat([...frames(N), trailerFrame()]);
		const text = new TextEncoder().encode(Buffer.from(binary).toString('base64'));
		// Chunk boundaries that do not align to base64 quanta.
		const parts: Uint8Array[] = [];
		for (let i = 0; i < text.length; i += 997) parts.push(text.subarray(i, i + 997));
		const b = body(parts);
		const s = server(() => grpcWeb(b, { 'content-type': 'application/grpc-web-text' }));
		const { method, counter } = countingMethod();
		const t = new GrpcWebFetchTransport({ baseUrl: 'http://localhost', fetch: s.fetch });
		const call = t.serverStreamingIterable(method, {}, t.mergeOptions({}));
		await call.headers;
		await settle();
		const idle = { pulls: b.pulls, decodes: counter.decodes };
		await call.responses.next();
		const afterOne = { pulls: b.pulls, decodes: counter.decodes };
		let expected = 1n;
		for await (const m of call.responses) expect(m.cursor).toBe(expected++);
		expect(expected).toBe(BigInt(N));
		expect(s.headers?.get('content-type')).toBe('application/grpc-web-text');
		expect(typeof s.requestBody).toBe('string');
		expect(idle).toEqual({ pulls: 0, decodes: 0 });
		expect(afterOne).toEqual({ pulls: 1, decodes: 1 });
	});
});

describe('slow consumer', () => {
	it('stops reading and decoding while paused, then delivers every message once in order', async () => {
		const b = body(group(frames(1000), 7).concat(trailerFrame()));
		const s = server(() => grpcWeb(b));
		const { method, counter } = countingMethod();
		const call = transport(s).serverStreamingIterable(method, {}, {});
		const seen: bigint[] = [];
		const pauses: {
			at: number;
			pullsBefore: number;
			pullsAfter: number;
			decodesBefore: number;
			decodesAfter: number;
		}[] = [];
		for await (const m of call.responses) {
			seen.push(m.cursor!);
			if (seen.length % 250 === 0) {
				const before = { p: b.pulls, d: counter.decodes };
				await new Promise((r) => setTimeout(r, 100));
				pauses.push({
					at: seen.length,
					pullsBefore: before.p,
					pullsAfter: b.pulls,
					decodesBefore: before.d,
					decodesAfter: counter.decodes,
				});
			}
		}
		for (const p of pauses) {
			expect(p.pullsAfter).toBe(p.pullsBefore);
			expect(p.decodesAfter).toBe(p.decodesBefore);
			expect(p.decodesBefore).toBe(p.at);
		}
		expect(seen).toEqual(Array.from({ length: 1000 }, (_, i) => BigInt(i)));
		await expect(call.status).resolves.toMatchObject({ code: 'OK' });
	});
});

describe('cancellation', () => {
	it('return() before headers aborts the fetch', async () => {
		const s = server(() => 'hang', { abortErrorsFetch: false });
		const call = transport(s).serverStreamingIterable(countingMethod().method, {}, {});
		await settle();
		await call.responses.return!();
		expect(s.signal?.aborted).toBe(true);
		expect((await rejection(call.headers)).code).toBe('CANCELLED');
		expect((await rejection(call.status)).code).toBe('CANCELLED');
		await expect(call.responses.next()).resolves.toEqual({ done: true, value: undefined });
	});

	it('caller abort before headers rejects with the abort reason', async () => {
		const s = server(() => 'hang', { abortErrorsFetch: false });
		const abort = new AbortController();
		const call = transport(s).serverStreamingIterable(
			countingMethod().method,
			{},
			{
				abort: abort.signal,
			},
		);
		const pending = call.responses.next();
		abort.abort(new DOMException('took too long', 'TimeoutError'));
		const error = await rejection(pending);
		expect(error.code).toBe('DEADLINE_EXCEEDED');
		expect(error.message).toBe('took too long');
		expect(s.signal?.aborted).toBe(true);
		expect((await rejection(call.status)).code).toBe('DEADLINE_EXCEEDED');
	});

	it('return() during a pending read settles the read and cancels the body', async () => {
		const b = body([...frames(1)], { hangAfter: 1 });
		const s = server(() => grpcWeb(b));
		const call = transport(s).serverStreamingIterable(countingMethod().method, {}, {});
		expect((await call.responses.next()).value?.cursor).toBe(0n);
		const pending = call.responses.next();
		await settle();
		expect(b.pulls).toBe(2);
		await call.responses.return!();
		await expect(pending).resolves.toEqual({ done: true, value: undefined });
		expect(s.signal?.aborted).toBe(true);
		expect(b.cancelled).toHaveLength(1);
		expect((await rejection(call.status)).code).toBe('CANCELLED');
	});

	it('an already-aborted signal fails reads when fetch ignores the signal', async () => {
		const s = server(() => 'hang', { abortErrorsFetch: false });
		const abort = new AbortController();
		abort.abort(new DOMException('took too long', 'TimeoutError'));
		const call = transport(s).serverStreamingIterable(
			countingMethod().method,
			{},
			{ abort: abort.signal },
		);
		const pending = call.responses.next();
		const queued = call.responses.next();
		expect((await rejection(pending)).code).toBe('DEADLINE_EXCEEDED');
		expect((await rejection(queued)).code).toBe('DEADLINE_EXCEEDED');
		expect((await rejection(call.status)).code).toBe('DEADLINE_EXCEEDED');
	});

	it('caller abort during a pending read rejects it with the abort code', async () => {
		const b = body([...frames(1)], { hangAfter: 1 });
		const s = server(() => grpcWeb(b));
		const abort = new AbortController();
		const call = transport(s).serverStreamingIterable(
			countingMethod().method,
			{},
			{
				abort: abort.signal,
			},
		);
		await call.responses.next();
		const pending = call.responses.next();
		await settle();
		abort.abort(new RpcError('Ledger stream buffer limit reached', 'RESOURCE_EXHAUSTED'));
		const error = await rejection(pending);
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(b.cancelled).toHaveLength(1);
	});

	it.each([false, true])(
		'cancellation settles reads waiting on headers when fetch ignores the signal (abort=%s)',
		async (viaAbort) => {
			const s = server(() => 'hang', { abortErrorsFetch: false });
			const abort = new AbortController();
			const call = transport(s).serverStreamingIterable(
				countingMethod().method,
				{},
				{ abort: abort.signal },
			);
			const pending = call.responses.next();
			const queued = call.responses.next();
			await settle();
			if (viaAbort) {
				abort.abort(new Error('stop'));
				expect((await rejection(pending)).code).toBe('CANCELLED');
				expect((await rejection(queued)).code).toBe('CANCELLED');
			} else {
				await call.responses.return!();
				await expect(pending).resolves.toEqual({ done: true, value: undefined });
				await expect(queued).resolves.toEqual({ done: true, value: undefined });
			}
			expect(s.signal?.aborted).toBe(true);
		},
	);

	it.each([200, 503])(
		'a response arriving after return() has its body cancelled (HTTP %i)',
		async (status) => {
			const b = body([concat([...frames(1), trailerFrame()])]);
			let respond!: (response: Response) => void;
			const s = server(() => new Promise<Response>((resolve) => (respond = resolve)), {
				abortErrorsFetch: false,
			});
			const call = transport(s).serverStreamingIterable(countingMethod().method, {}, {});
			const pending = call.responses.next();
			await settle();
			await call.responses.return!();
			await expect(pending).resolves.toEqual({ done: true, value: undefined });
			respond(
				new Response(b.stream, {
					status,
					headers: { 'content-type': 'application/grpc-web+proto' },
				}),
			);
			await settle();
			expect(b.cancelled).toHaveLength(1);
		},
	);

	describe.each([
		['a message', () => [...frames(2), trailerFrame()]],
		['an OK trailer', () => [...frames(1), trailerFrame()]],
	])('an abort while the next buffered frame is %s', (_, parts) => {
		it.each([0, 1, 2, 3, 4, 5, 6, 8])(
			'lands %i microtasks into the read and stays',
			async (ticks) => {
				const b = body([concat(parts())]);
				const abort = new AbortController();
				const call = transport(server(() => grpcWeb(b))).serverStreamingIterable(
					countingMethod().method,
					{},
					{ abort: abort.signal },
				);
				expect((await call.responses.next()).value?.cursor).toBe(0n);
				const pending = call.responses.next();
				const outcome = pending.then(
					(result) => result,
					(error: RpcError) => error,
				);
				for (let i = 0; i < ticks; i++) await Promise.resolve();
				abort.abort(new Error('stop'));
				const result = await outcome;
				// Up to two microtasks in, the read is still waiting on the opened call.
				if (ticks <= 2) expect(result).toBeInstanceOf(RpcError);
				if (!(result instanceof RpcError) && result.done) {
					// The trailer was read before the abort: the call completed, and stays completed.
					await expect(call.status).resolves.toMatchObject({ code: 'OK' });
					await expect(call.responses.next()).resolves.toEqual({ done: true, value: undefined });
					return;
				}
				const error = await rejection(call.responses.next());
				expect(error.code).toBe('CANCELLED');
				if (result instanceof RpcError) expect(error).toBe(result);
				expect(await rejection(call.responses.next())).toBe(error);
				expect(await rejection(call.status)).toBe(error);
				expect(await rejection(call.trailers)).toBe(error);
			},
		);
	});

	it('break after yielding stops reads and aborts the request', async () => {
		const b = body([...frames(1000), trailerFrame()]);
		const s = server(() => grpcWeb(b));
		const { method, counter } = countingMethod();
		const call = transport(s).serverStreamingIterable(method, {}, {});
		let n = 0;
		for await (const _ of call.responses) if (++n === 3) break;
		await settle();
		expect(s.signal?.aborted).toBe(true);
		expect(b.pulls).toBe(3);
		expect(counter.decodes).toBe(3);
		expect(b.cancelled).toHaveLength(1);
		await expect(call.headers).resolves.toBeDefined();
		expect((await rejection(call.trailers)).code).toBe('CANCELLED');
	});
});

describe('memory', () => {
	setFlagsFromString('--expose-gc');
	const gc = runInNewContext('gc') as () => void;

	/** A message carrying `size` bytes in an unknown length-delimited field (number 1000). */
	function largeMessage(i: number, size: number): Uint8Array {
		const field = [0xc2, 0x3e]; // tag: field 1000, wire type 2
		for (let n = size; ; n >>>= 7) {
			if (n < 0x80) {
				field.push(n);
				break;
			}
			field.push((n & 0x7f) | 0x80);
		}
		return concat([message(i), new Uint8Array(field), new Uint8Array(size)]);
	}

	it('releases consumed chunks while the stream stays open', async () => {
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
		const call = transport(
			server(
				() =>
					new Response(stream, {
						status: 200,
						headers: { 'content-type': 'application/grpc-web+proto' },
					}),
			),
		).serverStreamingIterable(countingMethod().method, {}, {});
		for (let i = 0; i < N; i++) {
			expect((await call.responses.next()).value?.cursor).toBe(BigInt(i));
		}
		await settle();
		gc();
		await settle();
		gc();
		const live = refs.filter((ref) => ref.deref() !== undefined).length;
		expect(live).toBeLessThanOrEqual(2);
		await call.responses.return!();
	});
});

describe('error paths', () => {
	it('trailer-only error status, percent-decoded', async () => {
		const s = server(() =>
			grpcWeb(null, { 'grpc-status': '5', 'grpc-message': 'checkpoint%20not%20found' }),
		);
		const call = transport(s).serverStreamingIterable(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error).toBeInstanceOf(RpcError);
		expect(error.code).toBe('NOT_FOUND');
		expect(error.message).toBe('checkpoint not found');
		expect(error.methodName).toBe('SubscribeCheckpoints');
		expect(await rejection(call.status)).toBe(error);
	});

	it('trailer-only OK with no body ends the stream', async () => {
		const s = server(() => grpcWeb(null, { 'grpc-status': '0' }));
		const call = transport(s).serverStreamingIterable(countingMethod().method, {}, {});
		await expect(call.responses.next()).resolves.toEqual({ done: true, value: undefined });
		await expect(call.status).resolves.toEqual({ code: 'OK', detail: 'OK' });
	});

	it('non-zero terminal status after messages, with trailers on the error', async () => {
		const b = body([...frames(2), trailerFrame(14, 'try%20again', { 'x-retry': '1' })]);
		const call = transport(server(() => grpcWeb(b))).serverStreamingIterable(
			countingMethod().method,
			{},
			{},
		);
		expect((await call.responses.next()).value?.cursor).toBe(0n);
		expect((await call.responses.next()).value?.cursor).toBe(1n);
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('UNAVAILABLE');
		expect(error.message).toBe('try again');
		expect(error.meta).toEqual({ 'x-retry': '1' });
		expect(await rejection(call.trailers)).toBe(error);
	});

	it('truncated frame is DATA_LOSS', async () => {
		const frame = dataFrame(message(1));
		const b = body([frame.subarray(0, frame.length - 1)]);
		const call = transport(server(() => grpcWeb(b))).serverStreamingIterable(
			countingMethod().method,
			{},
			{},
		);
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('DATA_LOSS');
		expect(error.message).toBe('premature EOF');
	});

	it('messages without trailers is DATA_LOSS', async () => {
		const b = body(frames(1));
		const call = transport(server(() => grpcWeb(b))).serverStreamingIterable(
			countingMethod().method,
			{},
			{},
		);
		await call.responses.next();
		expect((await rejection(call.responses.next())).message).toBe('missing trailers');
	});

	it('malformed protobuf is INTERNAL and cancels the body', async () => {
		const b = body([dataFrame(new Uint8Array([0x0a, 0xff, 0xff, 0xff, 0xff])), trailerFrame()]);
		const s = server(() => grpcWeb(b));
		const call = transport(s).serverStreamingIterable(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('INTERNAL');
		expect(s.signal?.aborted).toBe(true);
		expect(b.cancelled).toHaveLength(1);
		await expect(call.responses.next()).rejects.toBe(error);
	});

	it('oversized declared frame is rejected before its payload is read', async () => {
		const header = new Uint8Array([0, 0, 0x10, 0, 0]); // 1 MiB declared
		const b = body([header, new Uint8Array(1024), new Uint8Array(1024)]);
		const call = transport(
			server(() => grpcWeb(b)),
			{
				maxResponseMessageBytes: 64 * 1024,
			},
		).serverStreamingIterable(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(isNonRetryable(error)).toBe(true);
		expect(b.pulls).toBe(1);
		expect(b.cancelled).toHaveLength(1);
	});

	it('invalid request metadata is INTERNAL and sends no request', async () => {
		const s = server(() => grpcWeb(body([trailerFrame()])));
		const { method } = countingMethod();
		const call = transport(s).serverStreamingIterable(
			method,
			{},
			{
				meta: { authorization: 'bearer\nnot-a-header' },
			},
		);
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('INTERNAL');
		expect(error.message).toMatch(/^failed to serialize request: /);
		expect(s.signal).toBeUndefined();
		expect(await rejection(call.status)).toBe(error);
	});

	it('request serialization failure is INTERNAL and sends no request', async () => {
		const s = server(() => grpcWeb(body([trailerFrame()])));
		const { method } = countingMethod();
		const I = Object.create(method.I);
		I.toBinary = () => {
			throw new Error('invalid uint 32: -1');
		};
		const call = transport(s).serverStreamingIterable({ ...method, I }, {}, {});
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('INTERNAL');
		expect(error.message).toBe('failed to serialize request: invalid uint 32: -1');
		expect(s.signal).toBeUndefined();
		expect(await rejection(call.status)).toBe(error);
	});

	it('compressed frame flag is INTERNAL', async () => {
		const frame = dataFrame(message(0));
		frame[0] = 1;
		const call = transport(server(() => grpcWeb(body([frame])))).serverStreamingIterable(
			countingMethod().method,
			{},
			{},
		);
		expect((await rejection(call.responses.next())).code).toBe('INTERNAL');
	});

	it('network failure while reading the body is UNAVAILABLE (retryable)', async () => {
		const b = body(frames(3), { errorAt: 1 });
		const call = transport(server(() => grpcWeb(b))).serverStreamingIterable(
			countingMethod().method,
			{},
			{},
		);
		await call.responses.next();
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('UNAVAILABLE');
		expect(error.message).toBe('socket hang up');
	});

	it('fetch rejection is UNAVAILABLE; HTTP status maps like upstream', async () => {
		const failing = server(() => Promise.reject(new TypeError('fetch failed')));
		const a = transport(failing).serverStreamingIterable(countingMethod().method, {}, {});
		expect((await rejection(a.responses.next())).code).toBe('UNAVAILABLE');

		const http = server(() => new Response('nope', { status: 503 }));
		const c = transport(http).serverStreamingIterable(countingMethod().method, {}, {});
		expect((await rejection(c.responses.next())).code).toBe('UNAVAILABLE');
	});

	it('expired deadline fails without a request', async () => {
		const s = server(() => grpcWeb(body([trailerFrame()])));
		const call = transport(s).serverStreamingIterable(
			countingMethod().method,
			{},
			{
				timeout: new Date(Date.now() - 1),
			},
		);
		expect((await rejection(call.responses.next())).code).toBe('DEADLINE_EXCEEDED');
		expect(s.signal).toBeUndefined();
	});
});

const ledgerOptions = { limit: 16, isItem: () => true };

describe('ledger calls', () => {
	it('reach the pull path through the protocol-version wrapper with the client metadata', async () => {
		const b = body([...frames(3), trailerFrame()]);
		const s = server(() => grpcWeb(b));
		const client = new SuiGrpcClient({
			baseUrl: 'http://localhost',
			network: 'testnet',
			fetch: s.fetch,
			meta: { 'x-api-key': 'k', 'x-bin-bin': 'AAEC' },
		});
		const call = openLedgerCall<SubscribeCheckpointsResponse>(
			client.subscriptionService,
			'subscribeCheckpoints',
			{},
			new AbortController(),
			ledgerOptions,
		);
		await settle();
		expect(b.pulls).toBe(0);
		const seen = [];
		for await (const m of call) seen.push(m.cursor);
		expect(seen).toEqual([0n, 1n, 2n]);
		expect(s.headers?.get('x-sui-client-protocol-version')).toBeTruthy();
		expect(s.headers?.get('x-api-key')).toBe('k');
		expect(s.headers?.get('x-bin-bin')).toBe('AAEC');
	});

	it('read ahead only while prefetching, and fail past the buffer limit', async () => {
		const b = body([...frames(10), trailerFrame()]);
		const client = new SuiGrpcClient({
			baseUrl: 'http://localhost',
			network: 'testnet',
			fetch: server(() => grpcWeb(b)).fetch,
		});
		const controller = new AbortController();
		const call = openLedgerCall<SubscribeCheckpointsResponse>(
			client.subscriptionService,
			'subscribeCheckpoints',
			{},
			controller,
			{ limit: 4, isItem: () => true },
		);
		expect((await call.next()).value?.cursor).toBe(0n);
		await settle();
		expect(b.pulls).toBe(1);
		call.prefetch(true);
		await settle();
		call.prefetch(false);
		expect(controller.signal.aborted).toBe(true);
		for (const cursor of [1n, 2n, 3n, 4n]) expect((await call.next()).value?.cursor).toBe(cursor);
		expect((await rejection(call.next())).code).toBe('RESOURCE_EXHAUSTED');
	});

	it('stop reading ahead when prefetching is disabled', async () => {
		const b = body([...frames(10), trailerFrame()], { hangAfter: 3 });
		const client = new SuiGrpcClient({
			baseUrl: 'http://localhost',
			network: 'testnet',
			fetch: server(() => grpcWeb(b)).fetch,
		});
		const call = openLedgerCall<SubscribeCheckpointsResponse>(
			client.subscriptionService,
			'subscribeCheckpoints',
			{},
			new AbortController(),
			ledgerOptions,
		);
		call.prefetch(true);
		await settle();
		expect(b.pulls).toBe(4);
		call.prefetch(false);
		for (const cursor of [0n, 1n, 2n]) expect((await call.next()).value?.cursor).toBe(cursor);
		await call.return!();
		expect(b.cancelled).toHaveLength(1);
	});

	it('fall back to serverStreaming for an injected transport without the capability', async () => {
		const b = body([...frames(3), trailerFrame()]);
		const s = server(() => grpcWeb(b));
		const inner = transport(s);
		const custom: RpcTransport = {
			mergeOptions: (o) => inner.mergeOptions(o),
			unary: inner.unary.bind(inner),
			serverStreaming: inner.serverStreaming.bind(inner),
			clientStreaming: inner.clientStreaming.bind(inner),
			duplex: inner.duplex.bind(inner),
		};
		const client = new SuiGrpcClient({ network: 'testnet', transport: custom });
		const call = openLedgerCall<SubscribeCheckpointsResponse>(
			client.subscriptionService,
			'subscribeCheckpoints',
			{},
			new AbortController(),
			ledgerOptions,
		);
		const seen = [];
		for await (const m of call) seen.push(m.cursor);
		expect(seen).toEqual([0n, 1n, 2n]);
		// The push path reads the whole body regardless of demand.
		expect(b.pulls).toBe(5);
	});

	it('fall back to serverStreaming when interceptors are configured, so they run', async () => {
		const s = server(() => grpcWeb(body([...frames(1), trailerFrame()])));
		let intercepted = 0;
		const client = new SuiGrpcClient({
			baseUrl: 'http://localhost',
			network: 'testnet',
			fetch: s.fetch,
			interceptors: [
				{
					interceptServerStreaming(next, method, input, options) {
						intercepted++;
						return next(method, input, options);
					},
				},
			],
		});
		const call = openLedgerCall<SubscribeCheckpointsResponse>(
			client.subscriptionService,
			'subscribeCheckpoints',
			{},
			new AbortController(),
			ledgerOptions,
		);
		const seen = [];
		for await (const m of call) seen.push(m.cursor);
		expect(seen).toEqual([0n]);
		expect(intercepted).toBe(1);
	});
});
