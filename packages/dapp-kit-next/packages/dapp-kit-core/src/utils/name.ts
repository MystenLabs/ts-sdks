// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiNSName } from '@mysten/sui/utils';
import type { DAppKitCompatibleClient } from '../core/types.js';

const cache = new Map<string, string | null>();

export async function resolveNameServiceName(client: DAppKitCompatibleClient, address: string) {
	if (cache.has(address)) {
		return cache.get(address)!;
	}

	try {
		const result = await client.core.resolveNameServiceNames?.({
			address: '0x5a3afb4e2d6421488d4417f8cbdaf276079dd6f9c0195d8c8453c7a56d863194',
			limit: 1,
		});
		const name = result?.data.at(0) ?? null;
		cache.set(address, name ? normalizeSuiNSName(name, 'at') : null);
		return name;
	} catch {
		cache.set(address, null);
		return null;
	}
}
