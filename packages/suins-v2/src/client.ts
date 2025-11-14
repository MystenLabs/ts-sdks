// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientRegistration } from '@mysten/sui/src/experimental';
import { SuiNsCalls } from './calls.js';
import type { SuiNsObjectIds, SuiNsPackageIds } from './calls.js';

export interface SuiNsCompatibleClient extends ClientWithCoreApi {}

export interface SuiNsOptions<Name = 'suins'> {
	packageIds?: SuiNsPackageIds;
	objectIds: SuiNsObjectIds;
	name?: Name;
}

export interface SuiNsClientOptions extends SuiNsOptions {
	client: SuiNsCompatibleClient;
}

export function suins<Name extends string = 'suins'>({
	name = 'suins' as Name,
	...options
}: SuiNsOptions<Name>): SuiClientRegistration<SuiNsCompatibleClient, Name, SuiNsClient> {
	return {
		name,
		register: (client) => {
			return new SuiNsClient({ client, ...options });
		},
	};
}

export class SuiNsClient {
	#client: SuiNsCompatibleClient;
	calls: SuiNsCalls;

	constructor(options: SuiNsClientOptions) {
		this.#client = options.client;
		if (this.#client.network !== 'mainnet' && this.#client.network !== 'testnet') {
			if (this.#client.network === 'unknown') {
				throw new Error('network must be defined on SuiClient');
			}
			throw new Error('SuiNsClient only supports mainnet and testnet');
		}
		this.calls = new SuiNsCalls({
			packageIds: options.packageIds,
			objectIds: options.objectIds,
		});
	}
}
