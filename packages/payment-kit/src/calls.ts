// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { coinWithBalance } from '@mysten/sui/transactions';
import type {
	CreateRegistryOptions,
	DeletePaymentRecordOptions,
	PaymentKitPackageConfig,
	ProcessEphemeralPaymentOptions,
	ProcessRegistryPaymentOptions,
	SetEpochExpirationDurationOptions,
	SetRegistryManagedFundsOptions,
	WithdrawFromRegistryOptions,
} from './types.js';
import {
	createPaymentKey,
	createRegistry,
	deletePaymentRecord,
	processEphemeralPayment,
	processRegistryPayment,
	setConfigEpochExpirationDuration,
	setConfigRegistryManagedFunds,
	withdrawFromRegistry,
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
	 * tx.add(lient.paymentKit.call.processRegistryPayment({ nonce, coinType, sender, amount, receiver, registryName }));
	 * ```
	 */
	processRegistryPayment = (options: ProcessRegistryPaymentOptions) => {
		const { nonce, coinType, amount, receiver, registryName, registryId } = options;
		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);

		return processRegistryPayment({
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
	processEphemeralPayment = (options: ProcessEphemeralPaymentOptions) => {
		const { nonce, coinType, amount, receiver } = options;

		return processEphemeralPayment({
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

	/**
	 * Creates a `createRegistry` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(client.paymentKit.call.createRegistry(registryName));
	 * ```
	 */
	createRegistry = ({ registryName }: CreateRegistryOptions) => {
		return createRegistry({
			arguments: {
				namespace: this.#packageConfig.namespaceId,
				name: registryName,
			},
		});
	};

	/**
	 * Creates a `setConfigEpochExpirationDuration` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(client.paymentKit.call.setConfigEpochExpirationDuration({registryName, epochExpirationDuration, adminCapId}));
	 * ```
	 */
	setConfigEpochExpirationDuration = ({
		registryName,
		registryId,
		epochExpirationDuration,
		adminCapId,
	}: SetEpochExpirationDurationOptions) => {
		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);

		return setConfigEpochExpirationDuration({
			arguments: {
				registry: registryIdToUse,
				epochExpirationDuration,
				cap: adminCapId,
			},
		});
	};

	/**
	 * Creates a `setConfigRegistryManagedFunds` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(client.paymentKit.call.setConfigRegistryManagedFunds({registryName, registryManagedFunds, adminCapId}));
	 * ```
	 */
	setConfigRegistryManagedFunds = ({
		registryName,
		registryId,
		registryManagedFunds,
		adminCapId,
	}: SetRegistryManagedFundsOptions) => {
		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);

		return setConfigRegistryManagedFunds({
			arguments: {
				registry: registryIdToUse,
				registryManagedFunds,
				cap: adminCapId,
			},
		});
	};

	/**
	 * Creates a `withdrawFromRegistry` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(client.paymentKit.call.withdrawFromRegistry({coinType, registryName, adminCapId}));
	 * ```
	 */
	withdrawFromRegistry = ({
		coinType,
		registryName,
		registryId,
		adminCapId,
	}: WithdrawFromRegistryOptions) => {
		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);

		return withdrawFromRegistry({
			arguments: {
				registry: registryIdToUse,
				cap: adminCapId,
			},
			typeArguments: [coinType],
		});
	};

	/**
	 * Creates a `deletePaymentRecord` transaction
	 *
	 * @usage
	 * ```ts
	 * tx.add(client.paymentKit.call.deletePaymentRecord({coinType, nonce, amount, receiver, registryName}));
	 * ```
	 */
	deletePaymentRecord = ({
		coinType,
		nonce,
		amount,
		receiver,
		registryName,
		registryId,
	}: DeletePaymentRecordOptions) => {
		const registryIdToUse =
			registryId ?? getRegistryIdFromName(registryName, this.#packageConfig.namespaceId);

		return deletePaymentRecord({
			arguments: {
				registry: registryIdToUse,
				paymentKey: createPaymentKey({
					arguments: {
						nonce,
						paymentAmount: amount,
						receiver,
					},
					typeArguments: [coinType],
				}),
			},
			typeArguments: [coinType],
		});
	};
}
