// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PassThrough } from 'node:stream';

import type { MethodInfo, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';
import type { GrpcWebFetchTransportOptions } from '../../../src/grpc/index.js';
import { withClientProtocolVersion } from '../../../src/grpc/transport.js';
import {
	SubscribeCheckpointsRequest,
	SubscribeCheckpointsResponse,
	SubscriptionService,
} from '../../../src/grpc/proto/sui/rpc/v2/subscription_service.js';
import {
	httpStatusOf,
	isConnectionLost,
	isRequestFailed,
} from '../../../src/grpc/network-error.js';
import { isNonRetryable, pullServerStreaming } from '../../../src/grpc/pull-call.js';

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

/**
 * The pull method, and the push method with the transport's defaults merged in as a generated
 * client merges them (the pull method merges them itself).
 */
function transport(s: FakeServer, extra: Partial<GrpcWebFetchTransportOptions> = {}) {
	const t = new GrpcWebFetchTransport({
		baseUrl: 'http://localhost',
		format: 'binary',
		fetch: s.fetch,
		...extra,
	});
	return {
		pull: pullServerStreaming(t)!,
		serverStreaming: ((m, i, o) =>
			t.serverStreaming(m, i, t.mergeOptions(o))) as RpcTransport['serverStreaming'],
	};
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
			const call = transport(s).pull(method, {}, {});
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
		const t = new GrpcWebFetchTransport({
			baseUrl: 'http://localhost',
			format: 'text',
			fetch: s.fetch,
		});
		const call = pullServerStreaming(t)!(method, {});
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
		const call = transport(s).pull(method, {}, {});
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
		const call = transport(s).pull(countingMethod().method, {}, {});
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
		const call = transport(s).pull(
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
		const call = transport(s).pull(countingMethod().method, {}, {});
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
		const call = transport(s).pull(countingMethod().method, {}, { abort: abort.signal });
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
		const call = transport(s).pull(
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
			const call = transport(s).pull(countingMethod().method, {}, { abort: abort.signal });
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
			const call = transport(s).pull(countingMethod().method, {}, {});
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
				const call = transport(server(() => grpcWeb(b))).pull(
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
		const call = transport(s).pull(method, {}, {});
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

describe('error paths', () => {
	it('trailer-only error status, percent-decoded', async () => {
		const s = server(() =>
			grpcWeb(null, { 'grpc-status': '5', 'grpc-message': 'checkpoint%20not%20found' }),
		);
		const call = transport(s).pull(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error).toBeInstanceOf(RpcError);
		expect(error.code).toBe('NOT_FOUND');
		expect(error.message).toBe('checkpoint not found');
		expect(error.methodName).toBe('SubscribeCheckpoints');
		expect(await rejection(call.status)).toBe(error);
	});

	it('trailer-only OK with no body ends the stream', async () => {
		const s = server(() => grpcWeb(null, { 'grpc-status': '0' }));
		const call = transport(s).pull(countingMethod().method, {}, {});
		await expect(call.responses.next()).resolves.toEqual({ done: true, value: undefined });
		await expect(call.status).resolves.toEqual({ code: 'OK', detail: 'OK' });
	});

	it('non-zero terminal status after messages, with trailers on the error', async () => {
		const b = body([...frames(2), trailerFrame(14, 'try%20again', { 'x-retry': '1' })]);
		const call = transport(server(() => grpcWeb(b))).pull(countingMethod().method, {}, {});
		expect((await call.responses.next()).value?.cursor).toBe(0n);
		expect((await call.responses.next()).value?.cursor).toBe(1n);
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('UNAVAILABLE');
		expect(error.message).toBe('try again');
		expect(error.meta).toEqual({ 'x-retry': '1' });
		expect(await rejection(call.trailers)).toBe(error);
	});

	it.each([
		['trailer', () => grpcWeb(body([...frames(1), trailerFrame(11, 'pruned')]))],
		[
			'trailers-only response',
			() => grpcWeb(null, { 'grpc-status': '11', 'grpc-message': 'pruned' }),
		],
	])('keeps OUT_OF_RANGE from a %s, never a network code', async (_, respond) => {
		const call = transport(server(respond)).pull(countingMethod().method, {}, {});
		let error: RpcError | undefined;
		try {
			for await (const _message of call.responses);
		} catch (caught) {
			error = caught as RpcError;
		}
		expect(error).toMatchObject({ code: 'OUT_OF_RANGE', message: 'pruned' });
	});

	it('truncated frame is a lost connection', async () => {
		const frame = dataFrame(message(1));
		const b = body([frame.subarray(0, frame.length - 1)]);
		const call = transport(server(() => grpcWeb(b))).pull(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('UNAVAILABLE');
		expect(error.message).toBe('premature EOF');
		expect(isConnectionLost(error)).toBe(true);
	});

	it('an empty body without a status is a lost connection', async () => {
		const call = transport(server(() => grpcWeb(body([])))).pull(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'missing status' });
		expect(isConnectionLost(error)).toBe(true);
	});

	it('a null body without a status is a lost connection', async () => {
		const call = transport(server(() => grpcWeb(null))).pull(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'missing response body' });
		expect(isConnectionLost(error)).toBe(true);
	});

	it('messages without trailers is a lost connection', async () => {
		const b = body(frames(1));
		const call = transport(server(() => grpcWeb(b))).pull(countingMethod().method, {}, {});
		await call.responses.next();
		const error = await rejection(call.responses.next());
		expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'missing trailers' });
		expect(isConnectionLost(error)).toBe(true);
	});

	it('malformed protobuf is INTERNAL and cancels the body', async () => {
		const b = body([dataFrame(new Uint8Array([0x0a, 0xff, 0xff, 0xff, 0xff])), trailerFrame()]);
		const s = server(() => grpcWeb(b));
		const call = transport(s).pull(countingMethod().method, {}, {});
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
		).pull(countingMethod().method, {}, {});
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(isNonRetryable(error)).toBe(true);
		expect(b.pulls).toBe(1);
		expect(b.cancelled).toHaveLength(1);
	});

	it('the message limit does not apply to the trailer', async () => {
		const b = body([dataFrame(new Uint8Array([8, 7])), trailerFrame()]);
		const call = transport(
			server(() => grpcWeb(b)),
			{
				maxResponseMessageBytes: 8,
			},
		).pull(countingMethod().method, {}, {});
		const seen = [];
		for await (const m of call.responses) seen.push(m.cursor);
		expect(seen).toEqual([7n]);
		await expect(call.status).resolves.toEqual({ code: 'OK', detail: 'OK' });
	});

	it('an AbortError from a custom fetch that combines signals is CANCELLED', async () => {
		const own = new AbortController();
		const s = server(() => 'hang');
		const fetch = ((url: string, init: RequestInit) => {
			const signal = AbortSignal.any([init.signal!, own.signal]);
			return s.fetch(url, { ...init, signal });
		}) as typeof globalThis.fetch;
		const call = transport({ fetch }).pull(countingMethod().method, {}, {});
		const pending = rejection(call.responses.next());
		await settle();
		own.abort();
		const error = await pending;
		expect(error).toBeInstanceOf(RpcError);
		expect(error.code).toBe('CANCELLED');
		expect(error.message).toBe('This operation was aborted');
		expect(await rejection(call.status)).toBe(error);
	});

	it('an AbortError from a body that ignores the call signal is CANCELLED', async () => {
		const own = new AbortController();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(dataFrame(message(0)));
				own.signal.addEventListener('abort', () => controller.error(own.signal.reason));
			},
		});
		const call = transport(server(() => grpcWeb({ stream, pulls: 0, cancelled: [] }))).pull(
			countingMethod().method,
			{},
			{},
		);
		expect((await call.responses.next()).value?.cursor).toBe(0n);
		const pending = rejection(call.responses.next());
		await settle();
		own.abort();
		expect((await pending).code).toBe('CANCELLED');
	});

	it('invalid request metadata is INTERNAL and sends no request', async () => {
		const s = server(() => grpcWeb(body([trailerFrame()])));
		const { method } = countingMethod();
		const call = transport(s).pull(
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
		const call = transport(s).pull({ ...method, I }, {}, {});
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('INTERNAL');
		expect(error.message).toBe('failed to serialize request: invalid uint 32: -1');
		expect(s.signal).toBeUndefined();
		expect(await rejection(call.status)).toBe(error);
	});

	it('compressed frame flag is INTERNAL', async () => {
		const frame = dataFrame(message(0));
		frame[0] = 1;
		const call = transport(server(() => grpcWeb(body([frame])))).pull(
			countingMethod().method,
			{},
			{},
		);
		expect((await rejection(call.responses.next())).code).toBe('INTERNAL');
	});

	it('network failure while reading the body is UNAVAILABLE (retryable)', async () => {
		const b = body(frames(3), { errorAt: 1 });
		const call = transport(server(() => grpcWeb(b))).pull(countingMethod().method, {}, {});
		await call.responses.next();
		const error = await rejection(call.responses.next());
		expect(error.code).toBe('UNAVAILABLE');
		expect(error.message).toBe('socket hang up');
	});

	it('fetch rejection is UNAVAILABLE; HTTP status maps like upstream', async () => {
		const failing = server(() => Promise.reject(new TypeError('fetch failed')));
		const a = transport(failing).pull(countingMethod().method, {}, {});
		expect((await rejection(a.responses.next())).code).toBe('UNAVAILABLE');

		const http = server(() => new Response('nope', { status: 503 }));
		const c = transport(http).pull(countingMethod().method, {}, {});
		const unavailable = await rejection(c.responses.next());
		expect(unavailable.code).toBe('UNAVAILABLE');
		expect(httpStatusOf(unavailable)).toBe(503);
		expect(isRequestFailed(await rejection(a.responses.next()))).toBe(true);

		// A proxy 502 maps to UNKNOWN, so the status is kept for the stream's retry reason.
		const proxy = server(() => new Response('bad gateway', { status: 502 }));
		const d = transport(proxy).pull(countingMethod().method, {}, {});
		const unknown = await rejection(d.responses.next());
		expect(unknown.code).toBe('UNKNOWN');
		expect(httpStatusOf(unknown)).toBe(502);
	});

	it('expired deadline fails without a request', async () => {
		const s = server(() => grpcWeb(body([trailerFrame()])));
		const call = transport(s).pull(
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

describe('Node stream bodies', () => {
	// `node-fetch` returns a Response-like object whose body is a Node stream.
	const nodeResponse = (stream: PassThrough, status = 200) =>
		({
			ok: status >= 200 && status < 300,
			status,
			headers: new Headers({ 'content-type': 'application/grpc-web+proto' }),
			body: stream,
		}) as unknown as Response;

	it('destroys the body of a rejected response', async () => {
		const stream = new PassThrough();
		const call = transport(server(() => nodeResponse(stream, 503))).pull(
			countingMethod().method,
			{},
			{},
		);
		expect((await rejection(call.responses.next())).code).toBe('UNAVAILABLE');
		expect(stream.destroyed).toBe(true);
	});

	it('destroys the body when cancelled during a pending read', async () => {
		const stream = new PassThrough();
		stream.write(dataFrame(message(0)));
		const call = transport(server(() => nodeResponse(stream))).pull(
			countingMethod().method,
			{},
			{},
		);
		expect((await call.responses.next()).value?.cursor).toBe(0n);
		const pending = call.responses.next();
		await settle();
		await call.responses.return!();
		await expect(pending).resolves.toEqual({ done: true, value: undefined });
		expect(stream.destroyed).toBe(true);
	});

	it('reports an error from a body that was not read yet on the next pull', async () => {
		const stream = new PassThrough();
		const call = transport(server(() => nodeResponse(stream))).pull(
			countingMethod().method,
			{},
			{},
		);
		await call.headers;
		stream.destroy(new Error('socket reset'));
		await settle();
		const error = await rejection(call.responses.next());
		expect(error.message).toContain('socket reset');
		expect(isConnectionLost(error)).toBe(true);
	});

	it('ignores an error from destroying a body that was never read', async () => {
		const stream = new PassThrough({
			destroy: (_error, callback) => callback(new Error('close failed')),
		});
		const call = transport(server(() => nodeResponse(stream))).pull(
			countingMethod().method,
			{},
			{},
		);
		await call.headers;
		await call.responses.return!();
		await settle();
		expect(stream.destroyed).toBe(true);
		expect(stream.errored?.message).toBe('close failed');
		expect(stream.listenerCount('error')).toBeGreaterThan(0);
	});
});

describe('pullServerStreaming', () => {
	it('is reached through the protocol-version wrapper and sends the client metadata', async () => {
		const b = body([...frames(3), trailerFrame()]);
		const s = server(() => grpcWeb(b));
		const wrapped = withClientProtocolVersion(
			new GrpcWebFetchTransport({
				baseUrl: 'http://localhost',
				fetch: s.fetch,
				meta: { 'x-api-key': 'k', 'x-bin-bin': 'AAEC' },
			}),
		);
		const call = pullServerStreaming(wrapped)!(
			countingMethod().method,
			{},
			{ meta: { 'x-call': 'c' } },
		);
		await settle();
		expect(b.pulls).toBe(0);
		const seen = [];
		for await (const m of call.responses) seen.push(m.cursor);
		expect(seen).toEqual([0n, 1n, 2n]);
		expect(s.headers?.get('x-sui-client-protocol-version')).toBeTruthy();
		expect(s.headers?.get('x-api-key')).toBe('k');
		expect(s.headers?.get('x-bin-bin')).toBe('AAEC');
		expect(s.headers?.get('x-call')).toBe('c');
	});

	it('is available on the transport SuiGrpcClient builds, with its message limit', async () => {
		const call = (limit: number) => {
			const b = body([dataFrame(message(1)), trailerFrame()]);
			const s = server(() => grpcWeb(b));
			const client = new SuiGrpcClient({
				network: 'testnet',
				baseUrl: 'http://localhost',
				fetch: s.fetch,
				maxResponseMessageBytes: limit,
			});
			// The transport the client's generated service clients were built with.
			const pull = pullServerStreaming(client.subscriptionService['_transport'])!;
			expect(pull).toBeTypeOf('function');
			return { call: pull(countingMethod().method, {}), s };
		};

		const size = message(1).length;
		const within = call(size);
		expect((await within.call.responses.next()).value?.cursor).toBe(1n);
		expect(within.s.headers?.get('x-sui-client-protocol-version')).toBeTruthy();

		const error = await rejection(call(size - 1).call.responses.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(isNonRetryable(error)).toBe(true);
	});

	it('is unavailable on a transport without the capability', () => {
		const inner = new GrpcWebFetchTransport({ baseUrl: 'http://localhost' });
		const custom: RpcTransport = {
			mergeOptions: (o) => inner.mergeOptions(o),
			unary: inner.unary.bind(inner),
			serverStreaming: inner.serverStreaming.bind(inner),
			clientStreaming: inner.clientStreaming.bind(inner),
			duplex: inner.duplex.bind(inner),
		};
		expect(pullServerStreaming(custom)).toBeUndefined();
		expect(pullServerStreaming(withClientProtocolVersion(custom))).toBeUndefined();
	});

	it('is unavailable when interceptors are configured, so they are not bypassed', () => {
		const transport = new GrpcWebFetchTransport({
			baseUrl: 'http://localhost',
			interceptors: [{ interceptServerStreaming: (next, ...args) => next(...args) }],
		});
		expect(pullServerStreaming(transport)).toBeUndefined();
		expect(pullServerStreaming(withClientProtocolVersion(transport))).toBeUndefined();
	});

	it('defaults the message limit to 64 MiB', async () => {
		const declared = (bytes: number) => {
			const header = new Uint8Array(5);
			new DataView(header.buffer).setUint32(1, bytes);
			return header;
		};
		const over = body([declared(64 * 1024 * 1024 + 1)]);
		const error = await rejection(
			transport(server(() => grpcWeb(over)))
				.pull(countingMethod().method, {})
				.responses.next(),
		);
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(isNonRetryable(error)).toBe(true);
	});
});
