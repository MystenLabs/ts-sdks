// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import type { ProcessEphemeralPaymentOptions, ProcessRegistryPaymentOptions } from './types.js';
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
	 * const tx = client.paymentKit.tx.const({ nonce, coinType, sender, amount, receiver });
	 * ```
	 */
	processEphemeralPayment(options: ProcessEphemeralPaymentOptions) {
		const tx = new Transaction();
		tx.add(this.#calls.processEphemeralPayment(options));

		return tx;
	}
}
