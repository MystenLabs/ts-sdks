// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PaymentKitClientError, RequestedCoinObjectNotFound } from './error.js';
import type { Transaction } from '@mysten/sui/transactions';
import {
	MAINNET_PAYMENT_KIT_PACKAGE_CONFIG,
	SUI_COIN_TYPE,
	TESTNET_PAYMENT_KIT_PACKAGE_CONFIG,
} from './constants.js';
import {
	processEphemeralPayment,
	processRegistryPayment,
	PaymentKey,
	PaymentRecord,
} from './contracts/payment_kit/payment_kit.js';
import type {
	PaymentKitClientConfig,
	PaymentKitCompatibleClient,
	PaymentKitPackageConfig,
	ProcessPaymentParams,
	GetPaymentRecordParams,
	GetPaymentRecordResponse,
} from './types.js';
import { normalizeStructTag } from '@mysten/sui/utils';

export class PaymentKitClient {
	#packageConfig: PaymentKitPackageConfig;
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

	/**
	 * Process a payment (either ephemeral or registry-based) in a transaction
	 * If registryId is provided, processes via registry; otherwise processes as ephemeral.
	 *
	 * @usage
	 * ```ts
	 * const tx = client.processPaymentTransaction({ amount, coinType, receiver, sender, registryId });
	 * ```
	 */
	processPaymentTransaction(params: ProcessPaymentParams) {
		const { paymentId, coinType, sender, amount, receiver, registryId } = params;

		return async (tx: Transaction) => {
			const coins = await this.#suiClient.core.getCoins({
				address: sender,
				coinType,
			});

			let coin;
			if (coinType === SUI_COIN_TYPE) {
				coin = tx.splitCoins(tx.gas, [amount]);
			} else {
				let primaryCoinInput: string | null = null;

				if (coins.objects.length > 0) {
					primaryCoinInput = coins.objects[0].id;

					if (coins.objects.length > 1) {
						tx.mergeCoins(
							coins.objects[0].id,
							coins.objects.slice(1).map((c) => c.id),
						);
					}
					tx.transferObjects([tx.gas, primaryCoinInput], sender);
				}

				if (!primaryCoinInput) {
					throw new RequestedCoinObjectNotFound(`Requested Coin Object for ${coinType} not found`);
				}

				coin = tx.splitCoins(primaryCoinInput, [amount]);
			}

			if (registryId) {
				processRegistryPayment({
					package: this.#packageConfig.packageId,
					arguments: {
						registry: registryId,
						nonce: paymentId,
						paymentAmount: amount,
						coin,
						receiver,
					},
					typeArguments: [coinType],
				})(tx);
			} else {
				processEphemeralPayment({
					package: this.#packageConfig.packageId,
					arguments: {
						nonce: paymentId,
						paymentAmount: amount,
						coin,
						receiver,
					},
					typeArguments: [coinType],
				})(tx);
			}
		};
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
		const { coinType } = params;
		const normalizedCoinType = normalizeStructTag(coinType);
		const paymentKeyType =
			PaymentKey.name.replace('@mysten/payment-kit', this.#packageConfig.packageId) +
			`<${normalizedCoinType}>`;

		const result = await this.#suiClient.core.getDynamicField({
			parentId: params.registryId,
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
		};
	}
}
