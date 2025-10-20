// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

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

	/**
	 * @description Mint a supplier cap for margin pool
	 * @returns A function that takes a Transaction object
	 */
	mintSupplierCap = () => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::mint_supplier_cap`,
		});
	};

	/**
	 * @description Supply to a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @param {TransactionObjectArgument} supplierCap The supplier cap object
	 * @param {number} amountToDeposit The amount to deposit
	 * @param {string} referralId The ID of the referral
	 * @returns A function that takes a Transaction object
	 */
	supplyToMarginPool =
		(
			coinKey: string,
			supplierCap: TransactionObjectArgument,
			amountToDeposit: number,
			referralId?: string,
		) =>
		(tx: Transaction) => {
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
					supplierCap,
					supply,
					tx.pure.option('address', referralId),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Withdraw from a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @param {TransactionObjectArgument} supplierCap The supplier cap object
	 * @param {number} amountToWithdraw The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawFromMarginPool =
		(coinKey: string, supplierCap: TransactionObjectArgument, amountToWithdraw?: number) =>
		(tx: Transaction) => {
			const marginPool = this.#config.getMarginPool(coinKey);
			const coin = this.#config.getCoin(coinKey);
			const withdrawInput = amountToWithdraw
				? tx.pure.u64(Math.round(amountToWithdraw * coin.scalar))
				: null;
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::withdraw`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					supplierCap,
					tx.object.option({ type: 'u64', value: withdrawInput }),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Mint a referral for a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	mintReferral = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::mint_supply_referral`,
			arguments: [tx.object(marginPool.address), tx.object(this.#config.MARGIN_REGISTRY_ID)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Withdraw referral fees from a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @param {string} referralId The ID of the referral
	 * @returns A function that takes a Transaction object
	 */
	withdrawReferralFees = (coinKey: string, referralId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::withdraw_referral_fees`,
			arguments: [tx.object(marginPool.address), tx.object(referralId), tx.object.clock()],
			typeArguments: [marginPool.type],
		});
	};
}
