// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import type { ProcessEphemeralPaymentParams, ProcessRegistryPaymentParams } from './types.js';
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
	 * const tx = client.paymentKit.tx.processRegistryPaymentTransaction({ nonce, coinType, sender, amount, receiver, registryName });
	 * ```
	 */
	processRegistryPaymentTransaction(params: ProcessRegistryPaymentParams) {
		const tx = new Transaction();
		tx.add(this.#calls.processRegistryPayment(params));

		return tx;
	}

	/**
	 * Creates a `processEphemeralPayment` transaction
	 *
	 * @usage
	 * ```ts
	 * const tx = client.paymentKit.tx.processEphemeralPaymentTransaction({ nonce, coinType, sender, amount, receiver });
	 * ```
	 */
	processEphemeralPaymentTransaction(params: ProcessEphemeralPaymentParams) {
		const tx = new Transaction();
		tx.add(this.#calls.processEphemeralPayment(params));

		return tx;
	}
}
