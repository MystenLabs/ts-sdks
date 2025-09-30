// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PaymentKitClientError } from './error.js';

import {
	MAINNET_PAYMENT_KIT_PACKAGE_CONFIG,
	TESTNET_PAYMENT_KIT_PACKAGE_CONFIG,
} from './constants.js';
import type {
	PaymentKitClientConfig,
	PaymentKitCompatibleClient,
	PaymentKitPackageConfig,
} from './types.js';

export class PaymentKitClient {
	#packageConfig: PaymentKitPackageConfig;
	// eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
	#suiClient: PaymentKitCompatibleClient;

	constructor(config: PaymentKitClientConfig) {
		if (config.suiClient) {
			this.#suiClient = config.suiClient;
		} else {
			throw new PaymentKitClientError('suiClient must be provided');
		}

		const network = config.suiClient.network;
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
	}

	get packageConfig() {
		return this.#packageConfig;
	}
}
