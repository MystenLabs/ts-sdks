// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PaymentKitClientError } from './error.js';
import {
	MAINNET_PAYMENT_KIT_PACKAGE_CONFIG,
	TESTNET_PAYMENT_KIT_PACKAGE_CONFIG,
} from './constants.js';
import { PaymentKey, PaymentRecord } from './contracts/payment_kit/payment_kit.js';
import type {
	PaymentKitCompatibleClient,
	PaymentKitPackageConfig,
	PaymentKitClientOptions,
	GetPaymentRecordParams,
	GetPaymentRecordResponse,
} from './types.js';
import type { SuiClientRegistration } from '@mysten/sui/experimental';
import { normalizeStructTag } from '@mysten/sui/dist/cjs/utils/sui-types.js';
import { getRegistryIdFromParams } from './utils.js';

export class PaymentKitClient {
	#packageConfig: PaymentKitPackageConfig;
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

	/**
	 * Query for a payment record in a registry.
	 * Returns the payment record data if it exists, null otherwise.
	 *
	 * @usage
	 * ```ts
	 * const paymentRecord = await client.getPaymentRecord({ registryId, paymentId, amount, receiver, coinType });
	 * ```
	 */
	async getPaymentRecord(params: GetPaymentRecordParams): Promise<GetPaymentRecordResponse | null> {
		const { coinType, registry } = params;
		const normalizedCoinType = normalizeStructTag(coinType);
		const paymentKeyType =
			PaymentKey.name.replace('@mysten/payment-kit', this.#packageConfig.packageId) +
			`<${normalizedCoinType}>`;

		const registryId = getRegistryIdFromParams(registry);
		const result = await this.#client.core.getDynamicField({
			parentId: registryId,
			name: {
				type: paymentKeyType,
				bcs: PaymentKey.serialize({
					nonce: params.paymentId,
					payment_amount: params.amount,
					receiver: params.receiver,
				}).toBytes(),
			},
		});

		if (!result?.dynamicField) {
			return null;
		}

		const decoded = PaymentRecord.parse(result.dynamicField.value.bcs);

		return {
			paymentRecord: { epochAtTimeOfRecord: decoded.epoch_at_time_of_record },
			digestWhenCreated: '', // TODO - Get from previousTransaction
		};
	}
}
