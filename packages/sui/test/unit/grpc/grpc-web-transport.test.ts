// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MethodInfo, RpcInterceptor, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';
import type { GrpcWebFetchTransportOptions } from '../../../src/grpc/index.js';
import { withClientProtocolVersion } from '../../../src/grpc/transport.js';
import {
	SubscribeCheckpointsRequest,
	SubscribeCheckpointsResponse,
	SubscriptionService,
} from '../../../src/grpc/proto/sui/rpc/v2/subscription_service.js';
import { pullServerStreaming } from '../../../src/grpc/pull-call.js';

const method = SubscriptionService.methods[0] as MethodInfo<
	SubscribeCheckpointsRequest,
	SubscribeCheckpointsResponse
>;

function frame(flag: number, payload: Uint8Array): Uint8Array {
	const out = new Uint8Array(5 + payload.length);
	out[0] = flag;
	new DataView(out.buffer).setUint32(1, payload.length);
	out.set(payload, 5);
	return out;
}

const message = (cursor: number) =>
	frame(0, SubscribeCheckpointsResponse.toBinary({ cursor: BigInt(cursor) }));
const messages = (n: number) => Array.from({ length: n }, (_, i) => message(i));
const trailer = (status = 0, text = '') =>
	frame(0x80, new TextEncoder().encode(`grpc-status:${status}\r\n${text}`));

interface Body {
	stream: ReadableStream<Uint8Array>;
	pulls: number;
	cancelled: boolean;
}

/**
 * A body that produces one chunk per pull and buffers nothing ahead. `hangAfter` stops answering
 * after that many chunks; `errorAt` fails that pull.
 */
function body(chunks: Uint8Array[], opts: { hangAfter?: number; errorAt?: number } = {}): Body {
	const state: Body = { stream: undefined!, pulls: 0, cancelled: false };
	let index = 0;
	state.stream = new ReadableStream<Uint8Array>(
		{
			pull(controller): Promise<void> | void {
				state.pulls++;
				if (index === opts.errorAt) return controller.error(new TypeError('socket closed'));
				if (opts.hangAfter !== undefined && index >= opts.hangAfter) return new Promise(() => {});
				if (index < chunks.length) controller.enqueue(chunks[index++]);
				else controller.close();
			},
			cancel() {
				state.cancelled = true;
			},
		},
		{ highWaterMark: 0 },
	);
	return state;
}

const grpcWeb = (b: Body | null, headers: Record<string, string> = {}) =>
	new Response(b?.stream ?? null, {
		headers: { 'content-type': 'application/grpc-web+proto', ...headers },
	});

interface FakeServer {
	fetch: typeof globalThis.fetch;
	signal?: AbortSignal;
	headers?: Headers;
}

/** `'hang'` never responds and ignores the abort: the reader must not rely on fetch honoring it. */
function server(respond: () => Response | Promise<Response> | 'hang'): FakeServer {
	const s: FakeServer = {
		fetch: (async (_url: string, init: RequestInit) => {
			s.signal = init.signal ?? undefined;
			s.headers = new Headers(init.headers);
			const result = respond();
			return result === 'hang' ? new Promise(() => {}) : result;
		}) as typeof globalThis.fetch,
	};
	return s;
}

function transport(s: FakeServer, options: Partial<GrpcWebFetchTransportOptions> = {}) {
	return new GrpcWebFetchTransport({ baseUrl: 'http://localhost', fetch: s.fetch, ...options });
}

const pull = (s: FakeServer, options?: Partial<GrpcWebFetchTransportOptions>) =>
	pullServerStreaming(transport(s, options))!(method, {});

async function rejection(promise: Promise<unknown>): Promise<RpcError> {
	try {
		await promise;
	} catch (error) {
		expect(error).toBeInstanceOf(RpcError);
		return error as RpcError;
	}
	throw new Error('expected a rejection');
}

async function drain(responses: AsyncIterable<unknown>) {
	for await (const _ of responses);
}

const calls = {
	unary: (s: FakeServer) => {
		const t = transport(s);
		return t.unary(method, {}, t.mergeOptions({})).status;
	},
	serverStreaming: (s: FakeServer) => {
		const t = transport(s);
		return drain(t.serverStreaming(method, {}, t.mergeOptions({})).responses);
	},
	'on-demand stream': (s: FakeServer) => drain(pull(s).responses),
};

describe.each(Object.entries(calls))('%s errors', (_, call) => {
	it.each([
		[
			'a failed fetch',
			() => Promise.reject(new TypeError('fetch failed')),
			'UNAVAILABLE',
			'fetch failed',
		],
		[
			'a fetch that fails for a reason other than the network',
			() => Promise.reject(new Error('invalid header value')),
			'INTERNAL',
			'invalid header value',
		],
		[
			'a failed body read',
			() => grpcWeb(body([message(0)], { errorAt: 1 })),
			'UNAVAILABLE',
			'socket closed',
		],
		[
			'a trailers-only status',
			() => grpcWeb(null, { 'grpc-status': '5', 'grpc-message': 'checkpoint%20not%20found' }),
			'NOT_FOUND',
			'checkpoint not found',
		],
		[
			'an error status in the trailer',
			() => grpcWeb(body([message(0), trailer(11, 'grpc-message:pruned\r\n')])),
			'OUT_OF_RANGE',
			'pruned',
		],
		[
			'a proxy error page',
			() => new Response('bad gateway', { status: 502 }),
			'UNKNOWN',
			undefined,
		],
		[
			'an undecodable message',
			() => grpcWeb(body([frame(0, new Uint8Array([0x0a, 0xff, 0xff, 0xff, 0xff])), trailer()])),
			'INTERNAL',
			undefined,
		],
	] as const)('codes %s', async (_, respond, code, text) => {
		const error = await rejection(call(server(respond)));
		expect(error.code).toBe(code);
		if (text) expect(error.message).toBe(text);
	});
});

describe('on-demand stream', () => {
	it('reads and decodes only as messages are requested', async () => {
		const b = body([...messages(10), trailer()]);
		const call = pull(server(() => grpcWeb(b)));
		await new Promise((r) => setTimeout(r, 20));
		expect(b.pulls).toBe(0);
		expect((await call.responses.next()).value?.cursor).toBe(0n);
		expect((await call.responses.next()).value?.cursor).toBe(1n);
		await new Promise((r) => setTimeout(r, 20));
		expect(b.pulls).toBe(2);

		const rest = [];
		for await (const m of call.responses) rest.push(m.cursor);
		expect(rest).toEqual(Array.from({ length: 8 }, (_, i) => BigInt(i + 2)));
	});

	it.each([
		['mid-frame', [message(0).subarray(0, 4)]],
		['after messages without a trailer', [message(0)]],
		['without a status', []],
	])('codes a body that ends %s as UNAVAILABLE', async (_, chunks) => {
		const error = await rejection(drain(pull(server(() => grpcWeb(body(chunks)))).responses));
		expect(error).toMatchObject({
			code: 'UNAVAILABLE',
			message: 'response ended before its status',
		});
	});

	it('ends on a trailers-only OK response', async () => {
		const call = pull(server(() => grpcWeb(null, { 'grpc-status': '0' })));
		await expect(call.responses.next()).resolves.toEqual({ done: true, value: undefined });
	});

	it('limits messages to 64 MiB by default', async () => {
		const prefix = new Uint8Array(5);
		new DataView(prefix.buffer).setUint32(1, 64 * 1024 * 1024 + 1);
		const error = await rejection(pull(server(() => grpcWeb(body([prefix])))).responses.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
	});

	it('fails without a request when the request cannot be built', async () => {
		const s = server(() => grpcWeb(body([trailer()])));
		const call = pullServerStreaming(transport(s))!(
			method,
			{},
			{ timeout: new Date(Date.now() - 1) },
		);
		expect((await rejection(call.responses.next())).code).toBe('DEADLINE_EXCEEDED');
		expect(s.signal).toBeUndefined();
	});

	it('cancels the request on return() before the response, even when fetch ignores it', async () => {
		const s = server(() => 'hang');
		const call = pullServerStreaming(transport(s))!(method, {});
		const pending = call.responses.next();
		await call.responses.return!();
		await expect(pending).resolves.toEqual({ done: true, value: undefined });
		expect(s.signal?.aborted).toBe(true);
		await expect(call.responses.next()).resolves.toEqual({ done: true, value: undefined });
	});

	it('codes a caller abort from its reason, even when fetch ignores it', async () => {
		const abort = new AbortController();
		const call = pullServerStreaming(transport(server(() => 'hang')))!(
			method,
			{},
			{
				abort: abort.signal,
			},
		);
		const pending = call.responses.next();
		abort.abort(new DOMException('took too long', 'TimeoutError'));
		const error = await rejection(pending);
		expect(error).toMatchObject({ code: 'DEADLINE_EXCEEDED', message: 'took too long' });
		expect(await rejection(call.responses.next())).toBe(error);
	});

	it('settles a pending read and cancels the body on return()', async () => {
		const b = body([message(0)], { hangAfter: 1 });
		const s = server(() => grpcWeb(b));
		const call = pullServerStreaming(transport(s))!(method, {});
		await call.responses.next();
		const pending = call.responses.next();
		await new Promise((r) => setTimeout(r, 20));
		await call.responses.return!();
		await expect(pending).resolves.toEqual({ done: true, value: undefined });
		expect(s.signal?.aborted).toBe(true);
		expect(b.cancelled).toBe(true);
	});

	it('cancels the body of a response that arrives after return()', async () => {
		const b = body([message(0), trailer()]);
		let respond!: (response: Response) => void;
		const call = pull(server(() => new Promise<Response>((resolve) => (respond = resolve))));
		await new Promise((r) => setTimeout(r, 0));
		await call.responses.return!();
		respond(grpcWeb(b));
		await new Promise((r) => setTimeout(r, 20));
		expect(b.cancelled).toBe(true);
	});
});

describe('pullServerStreaming', () => {
	it('is reached through the protocol-version wrapper and sends all metadata', async () => {
		const s = server(() => grpcWeb(body([message(0), trailer()])));
		const wrapped = withClientProtocolVersion(transport(s, { meta: { 'x-api-key': 'k' } }));
		const call = pullServerStreaming(wrapped)!(method, {}, { meta: { 'x-call': 'c' } });
		await drain(call.responses);
		expect(s.headers?.get('x-sui-client-protocol-version')).toBeTruthy();
		expect(s.headers?.get('x-api-key')).toBe('k');
		expect(s.headers?.get('x-call')).toBe('c');
	});

	it('is used by the transport SuiGrpcClient builds, with its message limit', async () => {
		const s = server(() => grpcWeb(body([message(1), trailer()])));
		const client = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'http://localhost',
			fetch: s.fetch,
			maxResponseMessageBytes: 1,
		});
		const call = pullServerStreaming(client.subscriptionService['_transport'])!(method, {});
		expect((await rejection(call.responses.next())).code).toBe('RESOURCE_EXHAUSTED');
	});

	it('is unavailable with interceptors, the text format, or another transport', () => {
		const interceptors: RpcInterceptor[] = [
			{ interceptServerStreaming: (next, ...args) => next(...args) },
		];
		const custom: RpcTransport = {
			mergeOptions: (o) => o ?? {},
			unary: () => undefined as never,
			serverStreaming: () => undefined as never,
			clientStreaming: () => undefined as never,
			duplex: () => undefined as never,
		};
		for (const t of [
			transport(
				server(() => 'hang'),
				{ interceptors },
			),
			transport(
				server(() => 'hang'),
				{ format: 'text' },
			),
			custom,
		]) {
			expect(pullServerStreaming(t)).toBeUndefined();
			expect(pullServerStreaming(withClientProtocolVersion(t))).toBeUndefined();
		}
	});
});

describe('baseUrl', () => {
	it.each(['https://fullnode.testnet.sui.io:443', 'http://127.0.0.1:9000'])(
		'accepts %s',
		(baseUrl) => {
			expect(() => new GrpcWebFetchTransport({ baseUrl })).not.toThrow();
		},
	);

	it.each(['fullnode.testnet.sui.io', '127.0.0.1:9000', '/grpc'])('rejects %s', (baseUrl) => {
		expect(() => new GrpcWebFetchTransport({ baseUrl })).toThrow(/baseUrl/);
	});

	it('accepts a path with a custom fetch', () => {
		expect(
			() => new GrpcWebFetchTransport({ baseUrl: '/grpc', fetch: globalThis.fetch }),
		).not.toThrow();
	});
});

it('retries a ledger stream whose first fetch fails', async () => {
	let calls = 0;
	const s = server(() => {
		calls++;
		return Promise.reject(new TypeError('fetch failed'));
	});
	const client = new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'http://localhost',
		fetch: s.fetch,
	});
	const stream = client.streamEvents({
		retry: { maxAttempts: 1, initialDelay: 0, maxDelay: 0 },
	});
	await expect(stream[Symbol.asyncIterator]().next()).rejects.toMatchObject({
		code: 'UNAVAILABLE',
	});
	// The first attempt and one retry.
	expect(calls).toBe(2);
});
