// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { SUI_COIN_TYPE } from './constants.js';
import type {
	PaymentKitCompatibleClient,
	PaymentKitPackageConfig,
	ProcessEphemeralPaymentParams,
	ProcessRegistryPaymentParams,
} from './types.js';
import {
	processEphemeralPayment,
	processRegistryPayment,
} from './contracts/payment_kit/payment_kit.js';
import { getRegistryIdFromParams } from './utils.js';

export interface PaymentKitTransactionsOptions {
	packageConfig: PaymentKitPackageConfig;
	client: PaymentKitCompatibleClient;
}

export class PaymentKitTransactions {
	#client: PaymentKitCompatibleClient;
	#packageConfig: PaymentKitPackageConfig;

	constructor(options: PaymentKitTransactionsOptions) {
		this.#client = options.client;
		this.#packageConfig = options.packageConfig;
	}

	async #coinWithBalance(
		amount: number | bigint,
		coinType: string,
		sender: string,
		tx: Transaction,
	) {
		const coins = await this.#client.core.getCoins({
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
				throw new Error(`Requested Coin Object for ${coinType} not found`);
			}

			coin = tx.splitCoins(primaryCoinInput, [amount]);
		}

		return coin;
	}

	/**
	 * Creates a `processRegistryPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.processRegistryPaymentTransaction({ nonce, coinType, sender, amount, receiver, registry });
	 * ```
	 */
	async processRegistryPaymentTransaction(params: ProcessRegistryPaymentParams) {
		const { nonce, coinType, sender, amount, receiver, registry } = params;

		const tx = new Transaction();
		const coin = await this.#coinWithBalance(amount, coinType, sender, tx);
		const registryId = getRegistryIdFromParams(this.#packageConfig.namespaceId, registry);

		tx.add(
			processRegistryPayment({
				package: this.#packageConfig.packageId,
				arguments: {
					registry: registryId,
					nonce: nonce,
					paymentAmount: amount,
					coin,
					receiver,
				},
				typeArguments: [coinType],
			}),
		);

		return tx;
	}

	/**
	 * Creates a `processEphemeralPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.processEphemeralPaymentTransaction({ nonce, amount, coinType, receiver, sender });
	 * ```
	 */
	async processEphemeralPaymentTransaction(params: ProcessEphemeralPaymentParams) {
		const { nonce, amount, coinType, receiver, sender } = params;

		const tx = new Transaction();
		const coin = await this.#coinWithBalance(amount, coinType, sender, tx);

		tx.add(
			processEphemeralPayment({
				package: this.#packageConfig.packageId,
				arguments: {
					nonce: nonce,
					paymentAmount: amount,
					coin,
					receiver,
				},
				typeArguments: [coinType],
			}),
		);

		return tx;
	}
}
