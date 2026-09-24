// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChannelCredentials, Server, ServerCredentials } from '@grpc/grpc-js';
import type { Metadata, ServerUnaryCall, ServerWritableStream, sendUnaryData } from '@grpc/grpc-js';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';

import { SuiGrpcClient } from '../../../src/grpc/index.js';
import {
	CLIENT_PROTOCOL_VERSION_HEADER,
	MAX_PROTOCOL_VERSION,
} from '../../../src/client/protocol-version.js';

async function sentHeaders(meta?: Record<string, string>) {
	let headers: Headers | undefined;
	const client = new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		fetch: (async (_input: unknown, init: RequestInit) => {
			headers = new Headers(init.headers);

			return new Response(null, {
				status: 200,
				headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': '5' },
			});
		}) as unknown as typeof globalThis.fetch,
		meta,
	});

	await client.ledgerService.getServiceInfo({}).response.catch(() => {});

	return headers!;
}

describe('client protocol version header', () => {
	it('sends the max protocol version', async () => {
		const headers = await sentHeaders();

		expect(headers.get(CLIENT_PROTOCOL_VERSION_HEADER)).toBe(String(MAX_PROTOCOL_VERSION));
	});

	it('lets caller-supplied meta override it', async () => {
		const headers = await sentHeaders({ [CLIENT_PROTOCOL_VERSION_HEADER]: '7' });

		expect(headers.get(CLIENT_PROTOCOL_VERSION_HEADER)).toBe('7');
	});
});

describe('native gRPC client protocol version header', () => {
	const server = new Server();
	let host: string;
	let receivedMetadata: Metadata;

	beforeAll(async () => {
		const encoding = {
			requestStream: false,
			requestSerialize: (value: Buffer) => value,
			requestDeserialize: (value: Buffer) => value,
			responseSerialize: (value: Buffer) => value,
			responseDeserialize: (value: Buffer) => value,
		};
		server.addService(
			{
				getServiceInfo: {
					...encoding,
					path: '/sui.rpc.v2.LedgerService/GetServiceInfo',
					responseStream: false,
				},
				subscribeCheckpoints: {
					...encoding,
					path: '/sui.rpc.v2.SubscriptionService/SubscribeCheckpoints',
					responseStream: true,
				},
			},
			{
				getServiceInfo(call: ServerUnaryCall<Buffer, Buffer>, callback: sendUnaryData<Buffer>) {
					receivedMetadata = call.metadata;
					callback(null, Buffer.alloc(0));
				},
				subscribeCheckpoints(call: ServerWritableStream<Buffer, Buffer>) {
					receivedMetadata = call.metadata;
					call.write(Buffer.alloc(0));
					call.end();
				},
			},
		);
		const port = await new Promise<number>((resolve, reject) => {
			server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, port) => {
				if (error) reject(error);
				else resolve(port);
			});
		});
		host = `127.0.0.1:${port}`;
	});

	afterAll(() => server.forceShutdown());

	it.each([
		{ transportVersion: undefined, callVersion: undefined, expected: String(MAX_PROTOCOL_VERSION) },
		{ transportVersion: '7', callVersion: undefined, expected: '7' },
		{ transportVersion: '7', callVersion: '8', expected: '8' },
	])(
		'sends $expected for unary and streaming calls ($transportVersion, $callVersion)',
		async ({ transportVersion, callVersion, expected }) => {
			const transport = new GrpcTransport({
				host,
				channelCredentials: ChannelCredentials.createInsecure(),
				meta: {
					authorization: 'Bearer token',
					...(transportVersion ? { [CLIENT_PROTOCOL_VERSION_HEADER]: transportVersion } : {}),
				},
			});
			const originalOptions = transport.mergeOptions();
			const client = new SuiGrpcClient({ network: 'testnet', transport });
			const options: RpcOptions = {
				meta: callVersion ? { [CLIENT_PROTOCOL_VERSION_HEADER]: callVersion } : {},
				timeout: 2000,
			};
			try {
				await client.ledgerService.getServiceInfo({}, options);
				expect(receivedMetadata.get(CLIENT_PROTOCOL_VERSION_HEADER)).toEqual([expected]);
				expect(receivedMetadata.get('authorization')).toEqual(['Bearer token']);

				const stream = client.subscriptionService.subscribeCheckpoints({}, options);
				for await (const _response of stream.responses) {
					// Drain the stream before checking the received metadata.
				}
				await stream;
				expect(receivedMetadata.get(CLIENT_PROTOCOL_VERSION_HEADER)).toEqual([expected]);
				expect(receivedMetadata.get('authorization')).toEqual(['Bearer token']);
				expect(transport.mergeOptions()).toEqual(originalOptions);
			} finally {
				transport.close();
			}
		},
	);
});
