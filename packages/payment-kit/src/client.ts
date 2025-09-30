// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClient } from '@mysten/sui/client';
import type { ClientWithExtensions } from '@mysten/sui/experimental';
import { PaymentKitClientError } from './error.js';

import {
	MAINNET_PAYMENT_KIT_PACKAGE_CONFIG,
	TESTNET_PAYMENT_KIT_PACKAGE_CONFIG,
} from './constants.js';
import type { PaymentKitClientConfig, PaymentKitPackageConfig } from './types.js';

export class PaymentKitClient {
	#packageConfig: PaymentKitPackageConfig;
	#suiClient: ClientWithExtensions<{
		jsonRpc: SuiClient;
	}>;

	constructor(config: PaymentKitClientConfig) {
		if ('network' in config && !config.packageConfig) {
			const network = config.network;
			switch (network) {
				case 'testnet':
					this.#packageConfig = TESTNET_PAYMENT_KIT_PACKAGE_CONFIG;
					break;
				case 'mainnet':
					this.#packageConfig = MAINNET_PAYMENT_KIT_PACKAGE_CONFIG;
					break;
				default:
					throw new PaymentKitClientError(`Unsupported network: ${network}`);
			}
		} else if ('packageConfig' in config && config.packageConfig) {
			this.#packageConfig = config.packageConfig;
		} else {
			throw new PaymentKitClientError('Either network or packageConfig must be provided');
		}

		if (config.suiClient) {
			this.#suiClient = config.suiClient;
		} else if (config.suiRpcUrl) {
			this.#suiClient = new SuiClient({
				url: config.suiRpcUrl,
			});
		} else {
			throw new PaymentKitClientError('Either suiClient or suiRpcUrl must be provided');
		}
	}

	get suiClient() {
		return this.#suiClient;
	}

	get packageConfig() {
		return this.#packageConfig;
	}
}
