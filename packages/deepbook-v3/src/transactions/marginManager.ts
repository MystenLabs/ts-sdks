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
