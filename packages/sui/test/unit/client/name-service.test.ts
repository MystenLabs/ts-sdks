// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it, vi } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import type {
	JsonRpcTransport,
	JsonRpcTransportRequestOptions,
} from '../../../src/jsonRpc/index.js';
import { SuiJsonRpcClient } from '../../../src/jsonRpc/index.js';

const name = '@mysten';
const address = '0x123';

describe('resolveNameServiceAddress', () => {
	it('maps the gRPC name record target address', async () => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'mainnet' });
		const signal = AbortSignal.timeout(1_000);
		const lookupName = vi.fn(() =>
			Promise.resolve({ response: { record: { targetAddress: address } } }),
		);
		client.nameService.lookupName = lookupName as never;

		await expect(client.resolveNameServiceAddress({ name, signal })).resolves.toEqual({ address });
		expect(lookupName).toHaveBeenCalledWith({ name }, { abort: signal });
	});

	// The encoded form still has to match: a caller-supplied transport is used as given, so
	// `grpc-message` reaches this layer in its wire form.
	it.each([
		new RpcError('not found', 'NOT_FOUND'),
		new RpcError('name has expired', 'RESOURCE_EXHAUSTED'),
		new RpcError('name%20has%20expired', 'RESOURCE_EXHAUSTED'),
	])('maps absent gRPC names to null ($code)', async (error) => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'mainnet' });
		client.nameService.lookupName = (() => Promise.reject(error)) as never;

		await expect(client.core.resolveNameServiceAddress({ name })).resolves.toEqual({
			address: null,
		});
	});

	it.each([
		new RpcError('invalid domain', 'INVALID_ARGUMENT'),
		new RpcError('quota exceeded', 'RESOURCE_EXHAUSTED'),
		new RpcError('%invalid-encoding', 'RESOURCE_EXHAUSTED'),
	])('preserves other gRPC errors ($code)', async (error) => {
		const client = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'mainnet' });
		client.nameService.lookupName = (() => Promise.reject(error)) as never;

		await expect(client.core.resolveNameServiceAddress({ name })).rejects.toBe(error);
	});

	it.each([address, null])('maps GraphQL address results (%s)', async (resolvedAddress) => {
		let requestInit: RequestInit | undefined;
		const fetch: typeof globalThis.fetch = async (_input, init) => {
			requestInit = init;
			return Response.json({
				data: {
					address: resolvedAddress ? { address: resolvedAddress } : null,
				},
			});
		};
		const client = new SuiGraphQLClient({
			url: 'http://localhost/graphql',
			network: 'mainnet',
			fetch,
		});

		await expect(client.resolveNameServiceAddress({ name })).resolves.toEqual({
			address: resolvedAddress,
		});
		expect(JSON.parse(String(requestInit?.body))).toMatchObject({
			variables: { name },
		});
	});

	it.each([address, null])('maps JSON-RPC address results (%s)', async (resolvedAddress) => {
		let requestInput: JsonRpcTransportRequestOptions | undefined;
		const transport: JsonRpcTransport = {
			async request<T>(input: JsonRpcTransportRequestOptions) {
				requestInput = input;
				return resolvedAddress as T;
			},
		};
		const client = new SuiJsonRpcClient({ network: 'mainnet', transport });

		await expect(client.core.resolveNameServiceAddress({ name })).resolves.toEqual({
			address: resolvedAddress,
		});
		expect(requestInput).toEqual({
			method: 'suix_resolveNameServiceAddress',
			params: [name],
			signal: undefined,
		});
	});
});
