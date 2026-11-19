// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { SuiGrpcClient } from '../../../src/grpc/index.js';
import * as jsonRpc from '../../../src/jsonRpc/index.js';
import type {
	CoinStruct,
	PaginatedObjectsResponse,
	PaginationArguments,
	SuiObjectData,
	SuiObjectResponse,
	SuiTransactionBlockResponse,
	SuiTransactionBlockResponseOptions,
} from '../../../src/jsonRpc/index.js';

// Shapes found in published 2.x declarations; this file failing `tsc -p ./test` means they break.
interface ExtendedObjectData extends SuiObjectData {
	extra: string;
}
type GetTransactionArgs = Parameters<jsonRpc.SuiJsonRpcClient['getTransactionBlock']>;
type Page = PaginationArguments<string | null>;
type Used = [
	ExtendedObjectData,
	GetTransactionArgs,
	Page,
	CoinStruct,
	PaginatedObjectsResponse,
	SuiObjectResponse,
	SuiTransactionBlockResponse,
	SuiTransactionBlockResponseOptions,
];

function narrowsOnlyStubClients(client: SuiGrpcClient | jsonRpc.SuiJsonRpcClient) {
	if (!jsonRpc.isSuiJsonRpcClient(client)) {
		return client.core;
	}
	return client.getObject({ id: '0x1' });
}

function readsErrorFields(error: unknown) {
	if (error instanceof jsonRpc.JsonRpcError) {
		return [error.code, error.type];
	}
	if (error instanceof jsonRpc.SuiHTTPStatusError) {
		return [error.status, error.statusText];
	}
	return null;
}

const MESSAGE =
	'JSON-RPC is no longer supported by @mysten/sui. Use SuiGrpcClient or SuiGraphQLClient instead.';

describe('@mysten/sui/jsonRpc stub', () => {
	it('exports every 2.x runtime name', () => {
		expect(Object.keys(jsonRpc).sort()).toEqual([
			'JsonRpcError',
			'JsonRpcHTTPTransport',
			'SuiHTTPStatusError',
			'SuiHTTPTransportError',
			'SuiJsonRpcClient',
			'getJsonRpcFullnodeUrl',
			'isSuiJsonRpcClient',
		]);
	});

	it('throws when a client or transport is constructed', () => {
		expect(() => new jsonRpc.SuiJsonRpcClient({ url: 'https://example.com' })).toThrow(MESSAGE);
		expect(() => new jsonRpc.JsonRpcHTTPTransport({ url: 'https://example.com' })).toThrow(MESSAGE);
		expect(() => new jsonRpc.JsonRpcError('x', 1)).toThrow(MESSAGE);
	});

	it('throws when a function is called', () => {
		expect(() => jsonRpc.getJsonRpcFullnodeUrl('mainnet')).toThrow(MESSAGE);
	});

	it('reports that nothing is a JSON-RPC client', () => {
		expect(jsonRpc.isSuiJsonRpcClient({})).toBe(false);
		expect({} instanceof jsonRpc.SuiJsonRpcClient).toBe(false);
	});

	it('keeps 2.x type usages compiling', () => {
		expect(readsErrorFields(new Error('x'))).toBeNull();
		expectTypeOf<Used>().not.toBeNever();
		expectTypeOf(narrowsOnlyStubClients).toBeFunction();
	});
});
