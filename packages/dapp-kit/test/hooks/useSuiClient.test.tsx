// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { renderHook } from '@testing-library/react';

import { useSuiClient } from '../../src/index.js';
import { createSuiClientContextWrapper } from '../test-utils.js';

describe('useSuiClient', () => {
	test('throws without a SuiClientContext', () => {
		expect(() => renderHook(() => useSuiClient())).toThrowError(
			'Could not find SuiClientContext. Ensure that you have set up the SuiClientProvider',
		);
	});

	test('returns a SuiJsonRpcClient', () => {
		const suiClient = new SuiJsonRpcClient({
			url: getJsonRpcFullnodeUrl('localnet'),
			network: 'localnet',
		});
		const wrapper = createSuiClientContextWrapper(suiClient);
		const { result } = renderHook(() => useSuiClient(), { wrapper });

		expect(result.current).toBe(suiClient);
	});
});
