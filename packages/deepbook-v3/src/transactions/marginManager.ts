// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';

/**
 * MarginManagerContract class for managing MarginManager operations.
 */
export class MarginManagerContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginManagerContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Create a new margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	newMarginManager = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::new`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Create a new margin manager with an initializer
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	newMarginManagerWithInitializer = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const [manager, initializer] = tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::new_with_initializer`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
		return { manager, initializer };
	};

	/**
	 * @description Share a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {TransactionArgument} manager The margin manager to share
	 * @param {TransactionArgument} initializer The initializer for the manager
	 * @returns A function that takes a Transaction object
	 */
	shareMarginManager =
		(poolKey: string, manager: TransactionArgument, initializer: TransactionArgument) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::share`,
				arguments: [manager, initializer],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Deposit base into a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositBase = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const coin = coinWithBalance({
			type: baseCoin.type,
			balance: amount * baseCoin.scalar,
		});
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [tx.object(manager.address), tx.object(this.#config.MARGIN_REGISTRY_ID), coin],
			typeArguments: [baseCoin.type, quoteCoin.type, baseCoin.type],
		});
	};

	/**
	 * @description Deposit quote into a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositQuote = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const coin = coinWithBalance({
			type: quoteCoin.type,
			balance: amount * quoteCoin.scalar,
		});
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [tx.object(manager.address), tx.object(this.#config.MARGIN_REGISTRY_ID), coin],
			typeArguments: [baseCoin.type, quoteCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Deposit deep into a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositDeep = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const deepCoin = this.#config.getCoin('DEEP');
		const coin = coinWithBalance({
			type: deepCoin.type,
			balance: amount * deepCoin.scalar,
		});
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [tx.object(manager.address), tx.object(this.#config.MARGIN_REGISTRY_ID), coin],
			typeArguments: [baseCoin.type, quoteCoin.type, deepCoin.type],
		});
	};

	/**
	 * @description Withdraw base from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawBase = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::withdraw`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(amount * baseCoin.scalar),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, baseCoin.type],
		});
	};

	/**
	 * @description Withdraw quote from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawQuote = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::withdraw`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(amount * quoteCoin.scalar),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Withdraw deep from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawDeep = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const deepCoin = this.#config.getCoin('DEEP');
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::withdraw`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(amount * deepCoin.scalar),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, deepCoin.type],
		});
	};

	/**
	 * @description Borrow base from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowBase = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrow_base`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(amount * baseCoin.scalar),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Borrow quote from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowQuote = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrow_quote`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(amount * quoteCoin.scalar),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Repay base from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to repay
	 * @returns A function that takes a Transaction object
	 */
	repayBase = (managerKey: string, amount?: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::repay_base`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object.option({
					type: 'u64',
					value: amount ? tx.pure.u64(amount * baseCoin.scalar) : null,
				}),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Repay quote from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to repay
	 * @returns A function that takes a Transaction object
	 */
	repayQuote = (managerKey: string, amount?: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::repay_quote`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(quoteMarginPool.address),
				tx.object.option({
					type: 'u64',
					value: amount ? tx.pure.u64(amount * quoteCoin.scalar) : null,
				}),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Liquidate a margin manager
	 * @param {string} managerAddress The address of the manager to liquidate
	 * @param {string} poolKey The key to identify the pool
	 * @param {boolean} debtIsBase Whether the debt is in base
	 * @param {TransactionArgument} repayCoin The coin to repay
	 * @returns A function that takes a Transaction object
	 */
	liquidate =
		(
			managerAddress: string,
			poolKey: string,
			debtIsBase: boolean,
			repayCoin: TransactionArgument,
		) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
			const marginPool = debtIsBase ? baseMarginPool : quoteMarginPool;
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::liquidate`,
				arguments: [
					tx.object(managerAddress),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.object(baseCoin.priceInfoObjectId!),
					tx.object(quoteCoin.priceInfoObjectId!),
					tx.object(marginPool.address),
					tx.object(pool.address),
					repayCoin,
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};
}
