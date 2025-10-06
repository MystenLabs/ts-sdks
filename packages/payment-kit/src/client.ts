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
import { PaymentKitTransactions } from './transactions.js';
import { PaymentKitCalls } from './calls.js';
import { getRegistryIdFromName } from './utils.js';

export class PaymentKitClient {
	#packageConfig: PaymentKitPackageConfig;
	#client: PaymentKitCompatibleClient;

	calls: PaymentKitCalls;
	tx: PaymentKitTransactions;

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

		this.calls = new PaymentKitCalls({ packageConfig: this.#packageConfig });
		this.tx = new PaymentKitTransactions({
			calls: this.calls,
		});
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

	/**
	 * Query for a payment record in a registry.
	 * Returns the payment record data if it exists, null otherwise.
	 *
	 * @usage
	 * ```ts
	 * const paymentRecord = await client.getPaymentRecord({ registry, nonce, amount, receiver, coinType });
	 * ```
	 */
	async getPaymentRecord(params: GetPaymentRecordParams): Promise<GetPaymentRecordResponse | null> {
		const { coinType, registryId, registryName, nonce, amount, receiver } = params;
		const normalizedCoinType = normalizeStructTag(coinType);
		const paymentKeyType =
			PaymentKey.name.replace('@mysten/payment-kit', this.#packageConfig.packageId) +
			`<${normalizedCoinType}>`;

		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);
		const result = await this.#client.core.getDynamicField({
			parentId: registryIdToUse,
			name: {
				type: paymentKeyType,
				bcs: PaymentKey.serialize({
					nonce,
					payment_amount: amount,
					receiver,
				}).toBytes(),
			},
		});

		if (!result?.dynamicField) {
			return null;
		}

		const decoded = PaymentRecord.parse(result.dynamicField.value.bcs);

		return {
			key: result.dynamicField.id,
			paymentTransactionDigest: result.dynamicField.previousTransaction,
			epochAtTimeOfRecord: decoded.epoch_at_time_of_record,
		};
	}
}
