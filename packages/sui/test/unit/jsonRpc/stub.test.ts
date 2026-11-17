// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import * as jsonRpc from '../../../src/jsonRpc/index.js';

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
});
