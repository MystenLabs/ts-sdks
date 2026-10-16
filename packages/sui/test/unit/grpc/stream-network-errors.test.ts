// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it, vi } from 'vitest';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import { toNetworkRpcError } from '../../../src/grpc/network-error.js';

async function read(fetch: typeof globalThis.fetch) {
	const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://localhost', fetch });
	const call = client.ledgerService.listEvents({});
	for await (const _ of call.responses) {
		/* Drain through status or decoder failure. */
	}
}

it('preserves transport failure evidence when dispatching a stream', async () => {
	await expect(
		read(async () => {
			throw new TypeError('fetch failed');
		}),
	).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'fetch failed' });
});

it('preserves response-body network failures for reconnect classification', async () => {
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

it('keeps server INTERNAL statuses terminal', async () => {
	await expect(
		read(
			async () =>
				new Response(null, {
					headers: {
						'content-type': 'application/grpc-web+proto',
						'grpc-status': '13',
						'grpc-message': 'server%20failure',
					},
				}),
		),
	).rejects.toMatchObject({ code: 'INTERNAL', message: 'server failure' });
});

it('keeps protobuf decoding errors separate from transport failures', async () => {
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
		expect(toNetworkRpcError(new TypeError('fetch failed'), undefined)).toMatchObject({
			code: 'UNAVAILABLE',
			message: 'fetch failed',
		});
		expect(toNetworkRpcError('reset', undefined)).toMatchObject({
			code: 'UNAVAILABLE',
			message: 'Network stream failed',
		});
	});

	it('leaves RpcErrors and failures after an abort unchanged', () => {
		const status = new RpcError('server failure', 'INTERNAL');
		expect(toNetworkRpcError(status, undefined)).toBe(status);

		const controller = new AbortController();
		controller.abort();
		const aborted = new TypeError('aborted');
		expect(toNetworkRpcError(aborted, controller.signal)).toBe(aborted);

		const independentAbort = new DOMException('shutdown', 'AbortError');
		expect(toNetworkRpcError(independentAbort, new AbortController().signal)).toBe(
			independentAbort,
		);
	});
});
