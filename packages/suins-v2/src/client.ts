// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientRegistration } from '@mysten/sui/src/experimental';
import { SuiNsCalls } from './calls.js';
import type { SuiNsObjectIds, SuiNsPackageIds } from './calls.js';

export interface SuiNsCompatibleClient extends ClientWithCoreApi {}

export interface SuiNsClientExtensionOptions {
	packageIds?: SuiNsPackageIds;
	objectIds: SuiNsObjectIds;
}

export interface SuiNsClientOptions extends SuiNsClientExtensionOptions {
	client: SuiNsCompatibleClient;
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

	static asClientExtension(
		options: SuiNsClientExtensionOptions,
	): SuiClientRegistration<SuiNsCompatibleClient, 'suins', SuiNsClient> {
		return {
			name: 'suins',
			register: (client) => {
				return new SuiNsClient({ client, ...options });
			},
		};
	}
}
