// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { coinWithBalance } from '@mysten/sui/transactions';
import type {
	PaymentKitPackageConfig,
	ProcessEphemeralPaymentParams,
	ProcessRegistryPaymentParams,
} from './types.js';
import {
	processEphemeralPayment,
	processRegistryPayment,
} from './contracts/payment_kit/payment_kit.js';
import { getRegistryIdFromParams } from './utils.js';

export interface PaymentKitCallOptions {
	packageConfig: PaymentKitPackageConfig;
}

export class PaymentKitCalls {
	#packageConfig: PaymentKitPackageConfig;

	constructor(options: PaymentKitCallOptions) {
		this.#packageConfig = options.packageConfig;
	}

	/**
	 * Creates a `processRegistryPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(lient.paymentKit.call.processRegistryPaymentTransaction({ nonce, coinType, sender, amount, receiver, registry }));
	 * ```
	 */
	processRegistryPaymentTransaction = (params: ProcessRegistryPaymentParams) => {
		const { nonce, coinType, amount, receiver, registry } = params;
		const registryId = getRegistryIdFromParams(this.#packageConfig.namespaceId, registry);

		return processRegistryPayment({
			package: this.#packageConfig.packageId,
			arguments: {
				registry: registryId,
				nonce: nonce,
				paymentAmount: amount,
				coin: coinWithBalance({
					type: coinType,
					balance: amount,
				}),
				receiver,
			},
			typeArguments: [coinType],
		});
	};

	/**
	 * Creates a `processRegistryPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(client.paymentKit.call.processEphemeralPaymentTransaction({ nonce, coinType, sender, amount, receiver }));
	 * ```
	 */
	processEphemeralPaymentTransaction = (params: ProcessEphemeralPaymentParams) => {
		const { nonce, coinType, amount, receiver } = params;

		return processEphemeralPayment({
			package: this.#packageConfig.packageId,
			arguments: {
				nonce: nonce,
				paymentAmount: amount,
				coin: coinWithBalance({
					type: coinType,
					balance: amount,
				}),
				receiver,
			},
			typeArguments: [coinType],
		});
	};
}
