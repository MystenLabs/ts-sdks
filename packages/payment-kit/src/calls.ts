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
import { getRegistryIdFromName } from './utils.js';

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
	 * tx.add(lient.paymentKit.call.processRegistryPayment({ nonce, coinType, sender, amount, receiver, registry }));
	 * ```
	 */
	processRegistryPayment = (params: ProcessRegistryPaymentParams) => {
		const { nonce, coinType, amount, receiver, registryName, registryId } = params;
		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);

		return processRegistryPayment({
			package: this.#packageConfig.packageId,
			arguments: {
				registry: registryIdToUse,
				nonce,
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
	 * tx.add(client.paymentKit.call.processEphemeralPayment({ nonce, coinType, sender, amount, receiver }));
	 * ```
	 */
	processEphemeralPayment = (params: ProcessEphemeralPaymentParams) => {
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
