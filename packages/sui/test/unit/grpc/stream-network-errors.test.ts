// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from 'vitest';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import type { GrpcStreamCheckpointsOptions } from '../../../src/grpc/index.js';

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

function countingFetch(respond: () => Response) {
	const paths: string[] = [];
	const fetch = (async (url: string) => {
		paths.push(new URL(url).pathname.split('/').pop()!);
		return respond();
	}) as unknown as typeof globalThis.fetch;
	return { fetch, paths };
}

async function stream(fetch: typeof globalThis.fetch, options: GrpcStreamCheckpointsOptions) {
	const client = new SuiGrpcClient({
		network: 'testnet',
		baseUrl: 'http://localhost',
		fetch,
		maxResponseMessageBytes: 1024,
	});
	client.getChainIdentifier = async () => ({ chainIdentifier: 'chain' });
	for await (const _ of client.streamCheckpoints({
		retry: { initialDelay: 0, jitter: 0 },
		...options,
	})) {
		/* Drain until the stream fails. */
	}
}

it('surfaces an oversized message once instead of retrying it', async () => {
	const { fetch, paths } = countingFetch(
		() =>
			// A data frame declaring 1 MiB.
			new Response(new Uint8Array([0, 0, 0x10, 0, 0]), {
				headers: { 'content-type': 'application/grpc-web+proto' },
			}),
	);
	await expect(stream(fetch, {})).rejects.toMatchObject({ code: 'RESOURCE_EXHAUSTED' });
	expect(paths).toEqual(['SubscribeCheckpoints']);
});

it('surfaces a request that cannot be serialized once, without sending it', async () => {
	const { fetch, paths } = countingFetch(() => {
		throw new Error('unexpected request');
	});
	await expect(
		stream(fetch, { start: { checkpoint: '1' }, end: { checkpoint: '2' }, pageSize: -1 }),
	).rejects.toMatchObject({ code: 'INTERNAL' });
	expect(paths).toEqual([]);
});
