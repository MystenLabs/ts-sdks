// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import type {
	CreateRegistryOptions,
	DeletePaymentRecordOptions,
	ProcessEphemeralPaymentOptions,
	ProcessRegistryPaymentOptions,
	SetEpochExpirationDurationOptions,
	SetRegistryManagedFundsOptions,
	WithdrawFromRegistryOptions,
} from './types.js';
import type { PaymentKitCalls } from './calls.js';

export interface PaymentKitTransactionsOptions {
	calls: PaymentKitCalls;
}

export class PaymentKitTransactions {
	#calls: PaymentKitCalls;

	constructor(options: PaymentKitTransactionsOptions) {
		this.#calls = options.calls;
	}

	/**
	 * Creates a `processRegistryPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.processRegistryPayment({ nonce, coinType, sender, amount, receiver, registryName });
	 * ```
	 */
	processRegistryPayment(options: ProcessRegistryPaymentOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.processRegistryPayment(options));

		return tx;
	}

	/**
	 * Creates a `processEphemeralPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.processEphemeralPayment({ nonce, coinType, sender, amount, receiver });
	 * ```
	 */
	processEphemeralPayment(options: ProcessEphemeralPaymentOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.processEphemeralPayment(options));

		return tx;
	}

	/**
	 * Creates a `createRegistry` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.createRegistry({ registryName });
	 * ```
	 */
	createRegistry(options: CreateRegistryOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.createRegistry(options));

		return tx;
	}

	/**
	 * Creates a `setConfigEpochExpirationDuration` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.setConfigEpochExpirationDuration({ registryName, epochExpirationDuration, adminCapId });
	 * ```
	 */
	setConfigEpochExpirationDuration(options: SetEpochExpirationDurationOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.setConfigEpochExpirationDuration(options));

		return tx;
	}

	/**
	 * Creates a `setConfigRegistryManagedFunds` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.setConfigRegistryManagedFunds({ registryName, registryManagedFunds, adminCapId });
	 * ```
	 */
	setConfigRegistryManagedFunds(options: SetRegistryManagedFundsOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.setConfigRegistryManagedFunds(options));

		return tx;
	}

	/**
	 * Creates a `withdrawFromRegistry` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.withdrawFromRegistry({ coinType, registryName, adminCapId });
	 * ```
	 */
	withdrawFromRegistry(options: WithdrawFromRegistryOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.withdrawFromRegistry(options));

		return tx;
	}

	/**
	 * Creates a `deletePaymentRecord` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.deletePaymentRecord({ coinType, nonce, amount, receiver, registryName });
	 * ```
	 */
	deletePaymentRecord(options: DeletePaymentRecordOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.deletePaymentRecord(options));

		return tx;
	}
}
