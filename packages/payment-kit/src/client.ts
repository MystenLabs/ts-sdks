// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PaymentKitClientError } from './error.js';

import {
	MAINNET_PAYMENT_KIT_PACKAGE_CONFIG,
	TESTNET_PAYMENT_KIT_PACKAGE_CONFIG,
} from './constants.js';
import type {
	PaymentKitCompatibleClient,
	PaymentKitPackageConfig,
	PaymentKitClientOptions,
} from './types.js';
import type { SuiClientRegistration } from '@mysten/sui/experimental';

export class PaymentKitClient {
	#packageConfig: PaymentKitPackageConfig;
	// @ts-expect-error - suiClient will be used in a later PR
	#client: PaymentKitCompatibleClient;

	private constructor(options: PaymentKitClientOptions) {
		if (options.client) {
			this.#client = options.client;
		} else {
			throw new PaymentKitClientError('suiClient must be provided');
		}

		const network = options.client.network;
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

	static asClientExtension(): SuiClientRegistration<
		PaymentKitCompatibleClient,
		'paymentKit',
		PaymentKitClient
	> {
		return {
			name: 'paymentKit' as const,
			register: (client) => {
				return new PaymentKitClient({ client });
			},
		};
	}

	get packageConfig() {
		return this.#packageConfig;
	}
}
