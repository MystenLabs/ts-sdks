// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it, vi } from 'vitest';
import { GrpcTypes, SuiGrpcClient } from '../../../src/grpc/index.js';
import {
	httpStatusOf,
	isConnectionLost,
	isRequestFailed,
	toNetworkRpcError,
} from '../../../src/grpc/network-error.js';

async function read(fetch: typeof globalThis.fetch) {
	const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://localhost', fetch });
	const call = client.ledgerService.listEvents({});
	for await (const _ of call.responses) {
		/* Drain through status or decoder failure. */
	}
}

it('codes a failed stream fetch as UNAVAILABLE', async () => {
	await expect(
		read(async () => {
			throw new TypeError('fetch failed');
		}),
	).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'fetch failed' });
});

it('codes a failed unary fetch as UNAVAILABLE', async () => {
	const client = new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'http://localhost',
		fetch: async () => {
			throw new TypeError('fetch failed');
		},
	});
	await expect(client.ledgerService.getServiceInfo({}).response).rejects.toMatchObject({
		code: 'UNAVAILABLE',
		message: 'fetch failed',
	});
});

it('marks a failed fetch and a broken body apart from a server UNAVAILABLE', async () => {
	const failedFetch = await read(async () => {
		throw new TypeError('fetch failed');
	}).catch((error: unknown) => error);
	expect(isRequestFailed(failedFetch)).toBe(true);
	expect(isConnectionLost(failedFetch)).toBe(false);

	const brokenBody = await read(
		async () =>
			new Response(
				new ReadableStream({
					pull(controller) {
						controller.error(new TypeError('socket closed'));
					},
				}),
				{ headers: { 'content-type': 'application/grpc-web+proto' } },
			),
	).catch((error: unknown) => error);
	expect(isConnectionLost(brokenBody)).toBe(true);
	expect(isRequestFailed(brokenBody)).toBe(false);

	const server = new RpcError('overloaded', 'UNAVAILABLE');
	expect(isConnectionLost(server) || isRequestFailed(server)).toBe(false);
});

it('keeps the HTTP status of a proxy error on unary and streaming calls', async () => {
	const client = new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'http://localhost',
		fetch: async () => new Response('bad gateway', { status: 502, statusText: 'Bad Gateway' }),
	});
	const unary = await client.ledgerService
		.getServiceInfo({})
		.response.catch((error: unknown) => error);
	expect(unary).toMatchObject({ code: 'UNKNOWN' });
	expect(httpStatusOf(unary)).toBe(502);

	const stream = await read(async () => new Response('slow down', { status: 429 })).catch(
		(error: unknown) => error,
	);
	expect(stream).toMatchObject({ code: 'RESOURCE_EXHAUSTED' });
	expect(httpStatusOf(stream)).toBe(429);
});

/** A binary gRPC-web response whose body is `chunks`. */
function grpcWebResponse(chunks: Uint8Array[]) {
	return new Response(
		new ReadableStream({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
		}),
		{ headers: { 'content-type': 'application/grpc-web+proto' } },
	);
}

function frame(flags: number, payload: Uint8Array) {
	const bytes = new Uint8Array(5 + payload.length);
	bytes[0] = flags;
	new DataView(bytes.buffer).setUint32(1, payload.length);
	bytes.set(payload, 5);
	return bytes;
}

describe('a response body cut short', () => {
	// A message with a payload, then the trailer.
	const payload = GrpcTypes.ListEventsResponse.toBinary(
		GrpcTypes.ListEventsResponse.create({ watermark: { cursor: new Uint8Array([1, 2, 3]) } }),
	);
	const data = frame(0, payload);
	const trailer = frame(0x80, new TextEncoder().encode('grpc-status: 0\r\n'));
	const lost = async (fetch: typeof globalThis.fetch) => {
		const error = await read(fetch).catch((error: unknown) => error);
		expect(isConnectionLost(error)).toBe(true);
		return error;
	};

	it.each([
		['before its trailers', [data], 'missing trailers'],
		['inside a frame header', [data, trailer.subarray(0, 3)], 'premature EOF'],
		['inside a message payload', [data.subarray(0, data.length - 1)], 'premature EOF'],
		// Upstream would read a cut trailer as a status, by default OK.
		[
			'inside the trailer payload',
			[data, trailer.subarray(0, trailer.length - 3)],
			'premature EOF',
		],
	])('is a lost connection %s', async (_, chunks, message) => {
		const error = await lost(async () => grpcWebResponse(chunks));
		expect(error).toMatchObject({ code: 'UNAVAILABLE', message });
	});

	it('is a lost connection with no frame and no status in the headers', async () => {
		const error = await lost(async () => grpcWebResponse([]));
		expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'missing status' });
	});

	it('reads a complete body however it is split', async () => {
		await expect(read(async () => grpcWebResponse([data, trailer]))).resolves.toBeUndefined();
		// A header split across chunks, then several frames in one chunk.
		const body = new Uint8Array([...data, ...data, ...trailer]);
		await expect(
			read(async () => grpcWebResponse([body.subarray(0, 3), body.subarray(3)])),
		).resolves.toBeUndefined();
	});

	it('leaves a trailers-only response alone', async () => {
		const trailersOnly = (status: string) => async () =>
			new Response(new Uint8Array(), {
				headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': status },
			});
		await expect(read(trailersOnly('0'))).resolves.toBeUndefined();
		const error = await read(trailersOnly('5')).catch((error: unknown) => error);
		expect(error).toMatchObject({ code: 'NOT_FOUND' });
		expect(isConnectionLost(error)).toBe(false);
	});

	it('is a lost connection on a unary call too', async () => {
		const client = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'http://localhost',
			fetch: async () => grpcWebResponse([frame(0, new Uint8Array())]),
		});
		const error = await client.ledgerService
			.getServiceInfo({})
			.response.catch((error: unknown) => error);
		expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'missing trailers' });
		expect(isConnectionLost(error)).toBe(true);
	});

	it('leaves the opt-in text format to upstream', async () => {
		const text = new TextEncoder().encode(btoa(String.fromCharCode(...data)));
		const error = await read(
			async () => new Response(text, { headers: { 'content-type': 'application/grpc-web-text' } }),
		).catch((error: unknown) => error);
		expect(error).toMatchObject({ code: 'DATA_LOSS' });
		expect(isConnectionLost(error)).toBe(false);
	});

	it('codes a body an abort ends early from the abort', async () => {
		const controller = new AbortController();
		const client = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'http://localhost',
			// A fetch that ends the body cleanly when the call aborts.
			fetch: async () =>
				new Response(
					new ReadableStream({
						start(stream) {
							stream.enqueue(data);
							controller.signal.addEventListener('abort', () => stream.close());
						},
					}),
					{ headers: { 'content-type': 'application/grpc-web+proto' } },
				),
		});
		const call = client.ledgerService.listEvents({}, { abort: controller.signal });
		const error = await (async () => {
			for await (const _ of call.responses) controller.abort();
		})().catch((error: unknown) => error);
		expect(error).toMatchObject({ code: 'CANCELLED' });
		expect(isConnectionLost(error)).toBe(false);
	});
});

it('cancels the body of a non-2xx response', async () => {
	const cancel = vi.fn();
	await read(async () => {
		const response = new Response(new ReadableStream({ cancel }), { status: 503 });
		return response;
	}).catch(() => {});
	expect(cancel).toHaveBeenCalled();

	// A Node.js stream body is destroyed instead.
	const destroy = vi.fn();
	await read(
		async () =>
			({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				type: 'default',
				headers: new Headers(),
				body: { destroy, [Symbol.asyncIterator]: async function* () {} },
			}) as unknown as Response,
	).catch(() => {});
	expect(destroy).toHaveBeenCalled();
});

it('codes a failed response body read as UNAVAILABLE', async () => {
	const fetch = async () =>
		new Response(
			new ReadableStream({
				pull(controller) {
					controller.error(new TypeError('socket closed'));
				},
			}),
			{ headers: { 'content-type': 'application/grpc-web+proto' } },
		);
	await expect(read(fetch)).rejects.toMatchObject({
		code: 'UNAVAILABLE',
		message: 'socket closed',
	});
});

// A `node-fetch` style response: the body is a Node.js stream, read through async iteration.
function nodeStyleResponse(chunks: () => AsyncIterable<Uint8Array>) {
	return async () =>
		({
			ok: true,
			status: 200,
			statusText: 'OK',
			type: 'default',
			headers: new Headers({ 'content-type': 'application/grpc-web+proto' }),
			body: { [Symbol.asyncIterator]: () => chunks()[Symbol.asyncIterator]() },
		}) as unknown as Response;
}

const OK_TRAILER = new TextEncoder().encode('grpc-status: 0\r\n');
const EMPTY_MESSAGE = new Uint8Array([0, 0, 0, 0, 0]);
const TRAILER_FRAME = new Uint8Array([0x80, 0, 0, 0, OK_TRAILER.length, ...OK_TRAILER]);

it('reads async-iterable response bodies from Node.js-stream fetch implementations', async () => {
	const client = new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'http://localhost',
		fetch: nodeStyleResponse(async function* () {
			yield EMPTY_MESSAGE;
			yield TRAILER_FRAME;
		}),
	});
	const call = client.ledgerService.listEvents({});
	const messages = [];
	for await (const message of call.responses) messages.push(message);
	expect(messages).toHaveLength(1);
	await expect(call.status).resolves.toMatchObject({ code: 'OK' });
});

it('reads stream bodies without global ReadableStream or Response', async () => {
	vi.stubGlobal('ReadableStream', undefined);
	vi.stubGlobal('Response', undefined);
	try {
		const client = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'http://localhost',
			fetch: nodeStyleResponse(async function* () {
				yield EMPTY_MESSAGE;
				yield TRAILER_FRAME;
			}),
		});
		const call = client.ledgerService.listEvents({});
		const messages = [];
		for await (const message of call.responses) messages.push(message);
		expect(messages).toHaveLength(1);
		await expect(call.status).resolves.toMatchObject({ code: 'OK' });

		await expect(
			read(
				nodeStyleResponse(async function* () {
					yield EMPTY_MESSAGE;
					throw new Error('socket hang up');
				}),
			),
		).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'socket hang up' });
	} finally {
		vi.unstubAllGlobals();
	}
});

it('codes async-iterable body read failures as UNAVAILABLE', async () => {
	await expect(
		read(
			nodeStyleResponse(async function* () {
				yield EMPTY_MESSAGE;
				throw new Error('socket hang up');
			}),
		),
	).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'socket hang up' });
});

it('keeps an AbortError from a signal other than the call signal as CANCELLED', async () => {
	await expect(
		read(async () => {
			throw new DOMException('shutdown', 'AbortError');
		}),
	).rejects.toMatchObject({ code: 'CANCELLED' });
});

it('keeps a server INTERNAL status as INTERNAL', async () => {
	await expect(
		read(
			async () =>
				new Response(new Uint8Array(), {
					headers: {
						'content-type': 'application/grpc-web+proto',
						'grpc-status': '13',
						'grpc-message': 'server%20failure',
					},
				}),
		),
	).rejects.toMatchObject({ code: 'INTERNAL', message: 'server failure' });
});

it('codes protobuf decode errors as INTERNAL', async () => {
	await expect(
		read(
			async () =>
				new Response(new Uint8Array([0, 0, 0, 0, 1, 255]), {
					headers: { 'content-type': 'application/grpc-web+proto' },
				}),
		),
	).rejects.toMatchObject({ code: 'INTERNAL' });
});

describe('toNetworkRpcError', () => {
	it('codes fetch and body-read failures as UNAVAILABLE', () => {
		expect(toNetworkRpcError(new TypeError('fetch failed'), undefined, 'request')).toMatchObject({
			code: 'UNAVAILABLE',
			message: 'fetch failed',
		});
		expect(toNetworkRpcError('reset', undefined, 'request')).toMatchObject({
			code: 'UNAVAILABLE',
			message: 'Network stream failed',
		});
	});

	it('leaves RpcErrors and failures after an abort unchanged', () => {
		const status = new RpcError('server failure', 'INTERNAL');
		expect(toNetworkRpcError(status, undefined, 'request')).toBe(status);

		const controller = new AbortController();
		controller.abort();
		const aborted = new TypeError('aborted');
		expect(toNetworkRpcError(aborted, controller.signal, 'request')).toBe(aborted);

		const independentAbort = new DOMException('shutdown', 'AbortError');
		expect(toNetworkRpcError(independentAbort, new AbortController().signal, 'request')).toBe(
			independentAbort,
		);
	});
});
