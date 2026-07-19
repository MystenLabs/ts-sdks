// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { useContext } from 'react';

import { SuiClientContext } from '../components/SuiClientProvider.js';

export function useSuiClientContext() {
	const suiClient = useContext(SuiClientContext);

	if (!suiClient) {
		throw new Error(
			'Could not find SuiClientContext. Ensure that you have set up the SuiClientProvider',
		);
	}

	return suiClient;
}

export function useSuiClient(): SuiJsonRpcClient {
	return useSuiClientContext().client;
}
