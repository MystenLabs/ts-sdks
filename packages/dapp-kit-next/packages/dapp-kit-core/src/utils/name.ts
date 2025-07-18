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
			address,
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
