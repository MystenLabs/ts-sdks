// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';

/**
 * MarginPoolContract class for managing MarginPool operations.
 */
export class MarginPoolContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginPoolContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	supplyMarginPool =
		(coinKey: string, amountToDeposit: number, referralId?: string) => (tx: Transaction) => {
			tx.setSenderIfNotSet(this.#config.address);
			const marginPool = this.#config.getMarginPool(coinKey);
			const coin = this.#config.getCoin(coinKey);
			const depositInput = Math.round(amountToDeposit * coin.scalar);
			const supply = coinWithBalance({
				type: coin.type,
				balance: depositInput,
			});

			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::supply`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					supply,
					tx.object.option({ type: 'address', value: referralId ? tx.object(referralId) : null }),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	mintReferral = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::mint_referral`,
			arguments: [tx.object(marginPool.address), tx.object.clock()],
			typeArguments: [marginPool.type],
		});
	};

	withdrawReferralFees = (coinKey: string, referralId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::withdraw_referral_fees`,
			arguments: [tx.object(marginPool.address), tx.object(referralId), tx.object.clock()],
			typeArguments: [marginPool.type],
		});
	};
}
