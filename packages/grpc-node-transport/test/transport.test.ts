// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError, SuiGrpcClient } from '@mysten/sui/grpc';
import { isConnectionLost, PULL_SERVER_STREAMING } from '@mysten/sui/grpc/pull-transport';
import type { PullServerStreamingTransport } from '@mysten/sui/grpc/pull-transport';
import { constants } from 'node:http2';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GrpcNodeTransport } from '../src/index.js';
import {
	startCompressedServer,
	startHttpErrorServer,
	startResettingServer,
	startServer,
} from './server.js';

const server = await startServer();

function listCheckpoints(client: SuiGrpcClient) {
	return client.ledgerService.methods.find((method) => method.name === 'ListCheckpoints')!;
}

async function drain<T>(responses: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const message of responses) out.push(message);
	return out;
}

// A transport that sends unary calls through `unary` and pull calls through `pull`, recording each
// pulled method, so a ledger stream gets past its unary setup to the pull path under test.
function splitTransport(
	unary: GrpcNodeTransport,
	pull: GrpcNodeTransport,
	pulls: string[],
	meta: Record<string, string> = {},
): PullServerStreamingTransport {
	return {
		mergeOptions: (options) => pull.mergeOptions(options),
		unary: (method, input, options) => unary.unary(method, input, options),
		serverStreaming: () => {
			throw new Error('unexpected push-based call');
		},
		clientStreaming: (method) => pull.clientStreaming(method),
		duplex: (method) => pull.duplex(method),
		[PULL_SERVER_STREAMING]: (method, input, options) => {
			pulls.push(method.name);
			return pull[PULL_SERVER_STREAMING](method, input, {
				...options,
				meta: { ...options?.meta, ...meta },
			});
		},
	};
}

describe('GrpcNodeTransport', () => {
	let transport: GrpcNodeTransport;
	let client: SuiGrpcClient;

	beforeAll(() => {
		transport = new GrpcNodeTransport({
			baseUrl: server.baseUrl,
			meta: { 'x-custom': 'yes' },
		});
		client = new SuiGrpcClient({ network: 'localnet', transport });
	});

	afterEach(() => server.reset());

	afterAll(() => {
		transport.close();
		server.stop();
	});

	describe('options', () => {
		it('accepts http and https URLs without a path', () => {
			for (const baseUrl of [
				'https://fullnode.testnet.sui.io',
				'https://fullnode.testnet.sui.io:443/',
				'http://[::1]:9000',
			]) {
				new GrpcNodeTransport({ baseUrl }).close();
			}
		});

		it('rejects other schemes, paths and invalid prefetch values', () => {
			expect(() => new GrpcNodeTransport({ baseUrl: 'dns:///localhost:9000' })).toThrow(TypeError);
			expect(() => new GrpcNodeTransport({ baseUrl: 'https://example.com/rpc' })).toThrow(
				TypeError,
			);
			expect(() => new GrpcNodeTransport({ baseUrl: server.baseUrl, prefetch: 0 })).toThrow(
				RangeError,
			);
		});
	});

	describe('unary', () => {
		it('round-trips request metadata, headers and binary trailers', async () => {
			const call = client.ledgerService.getServiceInfo(
				{},
				{ meta: { 'x-blob-bin': Buffer.from([4, 5]).toString('base64') } },
			);

			expect((await call.response).chainId).toBe('test-chain');
			expect(await call.headers).toMatchObject({ 'x-header': 'hello' });
			expect(await call.status).toEqual({ code: 'OK', detail: 'OK' });
			expect(await call.trailers).toMatchObject({ 'x-trailer': 'bye', 'x-blob-bin': 'AQID' });

			const sent = server.stats.metadata!;
			expect(sent.get('x-custom')).toEqual(['yes']);
			expect(sent.get('x-blob-bin')).toEqual([Buffer.from([4, 5])]);
		});

		it('sends the client protocol version header through SuiGrpcClient', async () => {
			await client.ledgerService.getServiceInfo({}).response;

			expect(server.stats.metadata!.get('x-sui-client-protocol-version')).toEqual([
				expect.stringMatching(/^\d+$/),
			]);
		});

		it('serves the core API', async () => {
			expect(await client.core.getChainIdentifier()).toEqual({ chainIdentifier: 'test-chain' });
		});

		it('rejects every promise of a failed call with one decoded RpcError', async () => {
			const call = client.ledgerService.getServiceInfo({}, { meta: { 'x-fail': '1' } });
			const error = await call.response.catch((reason: unknown) => reason);

			expect(error).toBeInstanceOf(RpcError);
			expect(error).toMatchObject({
				code: 'NOT_FOUND',
				message: 'no such thing: 50% off, a/b?',
				methodName: 'GetServiceInfo',
				serviceName: 'sui.rpc.v2.LedgerService',
			});
			await expect(call.status).rejects.toBe(error);
			await expect(call.trailers).rejects.toBe(error);
		});

		it('percent-decodes status text once, like the gRPC-web transport', async () => {
			for (const raw of ['bad input, see a/b?c=1#x@y: 50%25 %E2%9C%93', 'literal%20%252F']) {
				const call = client.ledgerService.getServiceInfo({}, { meta: { 'x-raw-message': raw } });
				const error = (await call.response.catch((reason: unknown) => reason)) as RpcError;

				expect(error.code).toBe('INVALID_ARGUMENT');
				expect(error.message).toBe(decodeURIComponent(raw));
			}
		});

		it('codes an abort from its reason', async () => {
			const before = client.ledgerService.getServiceInfo({}, { abort: AbortSignal.abort() });
			await expect(before.response).rejects.toMatchObject({ code: 'CANCELLED' });

			const controller = new AbortController();
			const during = client.ledgerService.getServiceInfo(
				{},
				{ abort: controller.signal, meta: { 'x-fail': '1' } },
			);
			controller.abort(new DOMException('slow', 'TimeoutError'));
			const error = (await during.response.catch((reason: unknown) => reason)) as RpcError;
			expect(error).toMatchObject({ code: 'DEADLINE_EXCEEDED', message: 'slow' });
		});

		it('fails a message that decompresses past maxResponseMessageBytes', async () => {
			const compressed = await startCompressedServer(64 * 1024);
			const small = new GrpcNodeTransport({
				baseUrl: compressed.baseUrl,
				maxResponseMessageBytes: 1024,
			});
			try {
				const error = (await new SuiGrpcClient({
					network: 'localnet',
					transport: small,
				}).ledgerService
					.getServiceInfo({})
					.response.catch((reason: unknown) => reason)) as RpcError;

				expect(error).toMatchObject({
					code: 'RESOURCE_EXHAUSTED',
					message: 'Received message that decompresses to a size larger than 1024',
				});
			} finally {
				small.close();
				await compressed.stop();
			}
		});

		it('fails calls after close() with UNAVAILABLE', async () => {
			const closed = new GrpcNodeTransport({ baseUrl: server.baseUrl });
			closed.close();
			const offline = new SuiGrpcClient({ network: 'localnet', transport: closed });

			await expect(offline.ledgerService.getServiceInfo({}).response).rejects.toMatchObject({
				code: 'UNAVAILABLE',
			});
			const call = closed[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				closed.mergeOptions(),
			);
			await expect(call.responses.next()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
		});

		it('keeps a unary call reset before its status INTERNAL', async () => {
			const resetting = await startResettingServer(constants.NGHTTP2_INTERNAL_ERROR);
			const lossy = new GrpcNodeTransport({ baseUrl: resetting.baseUrl });
			const client = new SuiGrpcClient({ network: 'localnet', transport: lossy });
			try {
				const error = await client.ledgerService
					.getServiceInfo({})
					.response.catch((error: unknown) => error);
				expect(error).toMatchObject({
					code: 'INTERNAL',
					message: expect.stringContaining('RST_STREAM'),
				});
				expect(isConnectionLost(error)).toBe(false);
			} finally {
				lossy.close();
				await resetting.stop();
			}
		});

		it('reports an unreachable node as UNAVAILABLE', async () => {
			const unreachable = new GrpcNodeTransport({ baseUrl: 'http://127.0.0.1:1' });
			const offline = new SuiGrpcClient({ network: 'localnet', transport: unreachable });
			try {
				await expect(offline.ledgerService.getServiceInfo({}).response).rejects.toMatchObject({
					code: 'UNAVAILABLE',
				});
			} finally {
				unreachable.close();
			}
		});
	});

	describe('on-demand server streaming', () => {
		it('reads a stream with headers, status and trailers', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{ startCheckpoint: 5n },
				transport.mergeOptions(),
			);

			expect(await call.headers).toMatchObject({ 'x-header': 'hello' });
			const sequence = (await drain(call.responses)).map((m) => m.checkpoint!.sequenceNumber);
			expect(sequence).toEqual(Array.from({ length: 50 }, (_, i) => BigInt(i + 5)));
			expect(await call.status).toEqual({ code: 'OK', detail: 'OK' });
			expect(await call.trailers).toEqual({});
			expect(await call.responses.next()).toEqual({ done: true, value: undefined });
		});

		it('delivers the messages before a failure, then throws it', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ meta: { 'x-fail-at': '20' } }),
			);
			let received = 0;
			const error = await (async () => {
				for await (const _ of call.responses) received++;
			})().catch((reason: unknown) => reason);

			expect(received).toBe(20);
			expect(error).toMatchObject({
				code: 'RESOURCE_EXHAUSTED',
				message: 'stop at 50%',
				methodName: 'ListCheckpoints',
			});
			await expect(call.status).rejects.toBe(error);
			await expect(call.responses.next()).rejects.toBe(error);
		});

		it('cancels the call on the server when the consumer leaves', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ meta: { 'x-hang': '1', 'x-count': '1000000' } }),
			);
			for await (const _ of call.responses) break;

			await expect(call.status).rejects.toMatchObject({
				code: 'CANCELLED',
				message: 'stream cancelled by consumer',
			});
			expect(await call.responses.next()).toEqual({ done: true, value: undefined });
			await expect.poll(() => server.stats.cancelled).toBe(1);
		});

		it('ends a pending read when the consumer returns', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ meta: { 'x-hang': '1', 'x-count': '0' } }),
			);
			const pending = call.responses.next();
			await call.headers;
			await call.responses.return!();

			expect(await pending).toEqual({ done: true, value: undefined });
		});

		it('codes an abort from its reason, before and during the call', async () => {
			const before = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ abort: AbortSignal.abort() }),
			);
			await expect(before.responses.next()).rejects.toMatchObject({ code: 'CANCELLED' });

			const controller = new AbortController();
			const during = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ abort: controller.signal, meta: { 'x-hang': '1' } }),
			);
			await during.responses.next();
			controller.abort(new DOMException('slow', 'TimeoutError'));
			const error = (await during.responses.next().catch((reason: unknown) => reason)) as RpcError;

			expect(error).toMatchObject({ code: 'DEADLINE_EXCEEDED', message: 'slow' });
			await expect(during.status).rejects.toBe(error);
			await expect.poll(() => server.stats.cancelled).toBe(1);
		});

		it('ends the call on abort after the status arrives with messages still buffered', async () => {
			const controller = new AbortController();
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ abort: controller.signal, meta: { 'x-count': '2' } }),
			);
			expect((await call.responses.next()).done).toBe(false);
			await expect.poll(() => server.stats.completed).toBe(1);
			await sleep(100);
			controller.abort();

			await expect(call.responses.next()).rejects.toMatchObject({ code: 'CANCELLED' });
			await expect(call.status).rejects.toMatchObject({ code: 'CANCELLED' });
		});

		it('maps a deadline to DEADLINE_EXCEEDED', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				transport.mergeOptions({ timeout: 100, meta: { 'x-hang': '1', 'x-count': '1' } }),
			);

			await expect(drain(call.responses)).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED' });
		});

		it('fails a message over maxResponseMessageBytes with RESOURCE_EXHAUSTED', async () => {
			const small = new GrpcNodeTransport({
				baseUrl: server.baseUrl,
				maxResponseMessageBytes: 1024,
			});
			try {
				const call = small[PULL_SERVER_STREAMING](
					listCheckpoints(client),
					{},
					small.mergeOptions({ meta: { 'x-payload': '4096', 'x-count': '1' } }),
				);
				const error = await drain(call.responses).catch((reason: unknown) => reason);
				expect(error).toMatchObject({ code: 'RESOURCE_EXHAUSTED' });
			} finally {
				small.close();
			}
		});

		it.each([
			['NO_ERROR', constants.NGHTTP2_NO_ERROR],
			['INTERNAL_ERROR', constants.NGHTTP2_INTERNAL_ERROR],
		])('reports a stream reset with %s before its status as UNAVAILABLE', async (_, code) => {
			const resetting = await startResettingServer(code);
			const lossy = new GrpcNodeTransport({ baseUrl: resetting.baseUrl });
			const client = new SuiGrpcClient({ network: 'localnet', transport: lossy });
			try {
				const call = lossy[PULL_SERVER_STREAMING](listCheckpoints(client), {});
				const first = await call.responses.next();
				expect(first.value).toMatchObject({ checkpoint: { sequenceNumber: 1n } });
				const error = await call.responses.next().catch((error: unknown) => error);
				expect(error).toMatchObject({
					code: 'UNAVAILABLE',
					message: expect.stringContaining('RST_STREAM'),
				});
				// Streams report a marked reset as Disconnected, not as an unavailable server.
				expect(isConnectionLost(error)).toBe(true);
			} finally {
				lossy.close();
				await resetting.stop();
			}
		});

		it('reports a dropped connection as a lost connection', async () => {
			const dropping = await startResettingServer('drop');
			const lossy = new GrpcNodeTransport({ baseUrl: dropping.baseUrl });
			const client = new SuiGrpcClient({ network: 'localnet', transport: lossy });
			try {
				const call = lossy[PULL_SERVER_STREAMING](listCheckpoints(client), {});
				const first = await call.responses.next();
				expect(first.value).toMatchObject({ checkpoint: { sequenceNumber: 1n } });
				const error = await call.responses.next().catch((error: unknown) => error);
				expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'Connection dropped' });
				expect(isConnectionLost(error)).toBe(true);
			} finally {
				lossy.close();
				await dropping.stop();
			}
		});

		it('keeps a server UNAVAILABLE status unmarked', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				{ meta: { 'x-fail-unavailable': 'overloaded' } },
			);
			const error = await drain(call.responses).catch((error: unknown) => error);

			expect(error).toMatchObject({ code: 'UNAVAILABLE', message: 'overloaded' });
			expect(isConnectionLost(error)).toBe(false);
		});

		it('keeps a server INTERNAL status INTERNAL whatever its text', async () => {
			const call = transport[PULL_SERVER_STREAMING](
				listCheckpoints(client),
				{},
				{
					meta: {
						'x-fail-internal': 'upstream: Received RST_STREAM with code 2 (Internal server error)',
					},
				},
			);
			const error = await drain(call.responses).catch((error: unknown) => error);

			expect(error).toMatchObject({ code: 'INTERNAL' });
			expect(isConnectionLost(error)).toBe(false);
		});
	});

	describe('generated clients', () => {
		it('serves push-based server streaming', async () => {
			const call = client.ledgerService.listCheckpoints({});
			const messages = await drain(call.responses);

			expect(messages).toHaveLength(50);
			expect((await call.status).code).toBe('OK');
		});

		it('throws UNIMPLEMENTED for client streaming and duplex calls', () => {
			const method = listCheckpoints(client);

			expect(() => transport.clientStreaming(method)).toThrow(
				expect.objectContaining({ code: 'UNIMPLEMENTED' }),
			);
			expect(() => transport.duplex(method)).toThrow(
				expect.objectContaining({ code: 'UNIMPLEMENTED' }),
			);
		});
	});

	describe('ledger streams', () => {
		it('reads streamCheckpoints on demand', async () => {
			const pulls: string[] = [];
			const streams = new SuiGrpcClient({
				network: 'localnet',
				transport: splitTransport(transport, transport, pulls),
			});
			const frames = await drain(
				streams.streamCheckpoints({
					start: { checkpoint: '10' },
					end: { checkpoint: '15' },
					frames: { completion: true },
				}),
			);

			expect(pulls).toEqual(['ListCheckpoints']);
			expect(server.stats.metadata!.get('x-sui-client-protocol-version')).toEqual([
				expect.stringMatching(/^\d+$/),
			]);
			expect(
				frames.filter((frame) => frame.$kind === 'Checkpoint').map((f) => f.checkpoint),
			).toEqual(
				[10, 11, 12, 13, 14].map((sequence) => ({
					sequenceNumber: String(sequence),
					digest: 'xxxxxxxx',
					epoch: '1',
					timestampMs: sequence * 1000,
				})),
			);
			expect(frames.at(-1)?.$kind).toBe('Complete');
		});

		it('surfaces a message over maxResponseMessageBytes without retrying', async () => {
			const small = new GrpcNodeTransport({
				baseUrl: server.baseUrl,
				maxResponseMessageBytes: 1024,
			});
			const pulls: string[] = [];
			try {
				const streams = new SuiGrpcClient({
					network: 'localnet',
					transport: splitTransport(small, small, pulls, { 'x-payload': '4096' }),
				});
				const error = await drain(
					streams.streamCheckpoints({ start: { checkpoint: '10' }, end: { checkpoint: '15' } }),
				).catch((reason: unknown) => reason);

				expect(error).toMatchObject({ code: 'RESOURCE_EXHAUSTED' });
				expect(pulls).toEqual(['ListCheckpoints']);
			} finally {
				small.close();
			}
		});

		it('surfaces a message that decompresses past maxResponseMessageBytes without retrying', async () => {
			const compressed = await startCompressedServer(64 * 1024);
			const small = new GrpcNodeTransport({
				baseUrl: compressed.baseUrl,
				maxResponseMessageBytes: 1024,
			});
			const pulls: string[] = [];
			try {
				const streams = new SuiGrpcClient({
					network: 'localnet',
					transport: splitTransport(transport, small, pulls),
				});
				const error = await drain(
					streams.streamCheckpoints({ start: { checkpoint: '10' }, end: { checkpoint: '15' } }),
				).catch((reason: unknown) => reason);

				expect(error).toMatchObject({ code: 'RESOURCE_EXHAUSTED' });
				expect(pulls).toEqual(['ListCheckpoints']);
				expect(compressed.stats.requests).toBe(1);
			} finally {
				small.close();
				await compressed.stop();
			}
		});

		it('surfaces a stream started after close() once, without retry timers', async () => {
			const closed = new GrpcNodeTransport({ baseUrl: server.baseUrl });
			closed.close();
			const timers = () =>
				process.getActiveResourcesInfo().filter((resource) => resource === 'Timeout').length;
			const before = timers();
			const pulls: string[] = [];
			const streams = new SuiGrpcClient({
				network: 'localnet',
				transport: splitTransport(transport, closed, pulls),
			});
			const error = await drain(
				streams.streamCheckpoints({ start: { checkpoint: '10' }, end: { checkpoint: '15' } }),
			).catch((reason: unknown) => reason);

			expect(error).toMatchObject({ code: 'UNAVAILABLE' });
			expect(pulls).toEqual(['ListCheckpoints']);
			expect(timers()).toBeLessThanOrEqual(before);
		});

		it('surfaces a request over grpc.max_send_message_length without retrying', async () => {
			const small = new GrpcNodeTransport({
				baseUrl: server.baseUrl,
				clientOptions: { 'grpc.max_send_message_length': 1 },
			});
			const pulls: string[] = [];
			try {
				const streams = new SuiGrpcClient({
					network: 'localnet',
					transport: splitTransport(transport, small, pulls),
				});
				const error = await drain(
					streams.streamCheckpoints({ start: { checkpoint: '10' }, end: { checkpoint: '15' } }),
				).catch((reason: unknown) => reason);

				expect(error).toMatchObject({
					code: 'RESOURCE_EXHAUSTED',
					message: expect.stringContaining('Attempted to send message'),
				});
				expect(pulls).toEqual(['ListCheckpoints']);
			} finally {
				small.close();
			}
		});

		it.each([
			[405, 'fatal', []],
			[413, 'fatal', []],
			[429, 'retry', ['RateLimited', 'RateLimited', 'RateLimited']],
			[503, 'retry', ['Unavailable', 'Unavailable', 'Unavailable']],
		])('treats a proxy HTTP %i as %s', async (status, _, expected) => {
			const proxy = await startHttpErrorServer(status);
			const rejecting = new GrpcNodeTransport({ baseUrl: proxy.baseUrl });
			const reasons: string[] = [];
			try {
				const streams = new SuiGrpcClient({
					network: 'localnet',
					transport: splitTransport(transport, rejecting, []),
				});
				const error = await drain(
					streams.streamCheckpoints({
						start: { checkpoint: '10' },
						end: { checkpoint: '15' },
						retry: { initialDelay: 0, maxDelay: 0, jitter: 0, maxAttempts: 3 },
						onStatus: (s) => s.$kind === 'Retrying' && reasons.push(s.reason),
					}),
				).catch((reason: unknown) => reason);

				expect(error).toMatchObject({
					message: expect.stringContaining(`Received HTTP status code ${status}`),
				});
				expect(reasons).toEqual(expected);
				expect(proxy.stats.requests).toBe(expected.length + 1);
			} finally {
				rejecting.close();
				await proxy.stop();
			}
		});
	});
});
