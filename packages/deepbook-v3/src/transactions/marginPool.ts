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
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.object.clock()],
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
					tx.object.option({
						type: '0x2::object::ID',
						value: referralId ? tx.pure.id(referralId) : null,
					}),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Withdraw from a margin pool. If amountToWithdraw is not provided, withdraws all.
	 * @param {string} coinKey The key to identify the pool
	 * @param {TransactionObjectArgument} supplierCap The supplier cap object
	 * @param {number} [amountToWithdraw] The amount to withdraw. If omitted, withdraws all.
	 * @returns A function that takes a Transaction object
	 */
	withdrawFromMarginPool =
		(coinKey: string, supplierCap: TransactionObjectArgument, amountToWithdraw?: number) =>
		(tx: Transaction) => {
			const marginPool = this.#config.getMarginPool(coinKey);
			const coin = this.#config.getCoin(coinKey);
			const withdrawInput =
				amountToWithdraw !== undefined ? Math.round(amountToWithdraw * coin.scalar) : null;
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::withdraw`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					supplierCap,
					tx.pure.option('u64', withdrawInput),
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
	mintSupplyReferral = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::mint_supply_referral`,
			arguments: [
				tx.object(marginPool.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object.clock(),
			],
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::withdraw_referral_fees`,
			arguments: [
				tx.object(marginPool.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(referralId),
			],
			typeArguments: [marginPool.type],
		});
	};

	// === Read-only/View Functions ===

	/**
	 * @description Get the margin pool ID
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	getId = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::id`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Check if a deepbook pool is allowed for borrowing
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {string} deepbookPoolId The ID of the deepbook pool
	 * @returns A function that takes a Transaction object
	 */
	deepbookPoolAllowed = (coinKey: string, deepbookPoolId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::deepbook_pool_allowed`,
			arguments: [tx.object(marginPool.address), tx.pure.id(deepbookPoolId)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the total supply amount
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	totalSupply = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::total_supply`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the total supply shares
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	supplyShares = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::supply_shares`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the total borrow amount
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	totalBorrow = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::total_borrow`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the total borrow shares
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	borrowShares = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::borrow_shares`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the last update timestamp
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	lastUpdateTimestamp = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::last_update_timestamp`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the supply cap
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	supplyCap = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::supply_cap`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the max utilization rate
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	maxUtilizationRate = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::max_utilization_rate`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the protocol spread
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	protocolSpread = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::protocol_spread`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the minimum borrow amount
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minBorrow = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::min_borrow`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get the current interest rate
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	interestRate = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::interest_rate`,
			arguments: [tx.object(marginPool.address)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get user supply shares for a supplier cap
	 * @param {string} coinKey The key to identify the pool
	 * @param {string} supplierCapId The ID of the supplier cap
	 * @returns A function that takes a Transaction object
	 */
	userSupplyShares = (coinKey: string, supplierCapId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::user_supply_shares`,
			arguments: [tx.object(marginPool.address), tx.pure.id(supplierCapId)],
			typeArguments: [marginPool.type],
		});
	};

	/**
	 * @description Get user supply amount for a supplier cap
	 * @param {string} coinKey The key to identify the pool
	 * @param {string} supplierCapId The ID of the supplier cap
	 * @returns A function that takes a Transaction object
	 */
	userSupplyAmount = (coinKey: string, supplierCapId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::user_supply_amount`,
			arguments: [tx.object(marginPool.address), tx.pure.id(supplierCapId), tx.object.clock()],
			typeArguments: [marginPool.type],
		});
	};
}
