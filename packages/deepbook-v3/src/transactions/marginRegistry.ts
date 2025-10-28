// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';

/**
 * MarginRegistryContract class for managing MarginRegistry read-only operations.
 */
export class MarginRegistryContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginRegistryContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Check if a deepbook pool is enabled for margin trading
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	poolEnabled = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::pool_enabled`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the margin pool ID for a given asset
	 * @param {string} coinKey The key to identify the coin
	 * @returns A function that takes a Transaction object
	 */
	getMarginPoolId = (coinKey: string) => (tx: Transaction) => {
		const coin = this.#config.getCoin(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::get_margin_pool_id`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID)],
			typeArguments: [coin.type],
		});
	};

	/**
	 * @description Get the margin pool IDs (base and quote) for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	getDeepbookPoolMarginPoolIds = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::get_deepbook_pool_margin_pool_ids`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the margin manager IDs for a given owner
	 * @param {string} owner The owner address
	 * @returns A function that takes a Transaction object
	 */
	getMarginManagerIds = (owner: string) => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::get_margin_manager_ids`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.address(owner)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the base margin pool ID for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	baseMarginPoolId = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::base_margin_pool_id`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the quote margin pool ID for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	quoteMarginPoolId = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::quote_margin_pool_id`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the minimum withdraw risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minWithdrawRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::min_withdraw_risk_ratio`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the minimum borrow risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minBorrowRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::min_borrow_risk_ratio`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the liquidation risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	liquidationRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::liquidation_risk_ratio`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the target liquidation risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	targetLiquidationRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::target_liquidation_risk_ratio`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the user liquidation reward for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	userLiquidationReward = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::user_liquidation_reward`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get the pool liquidation reward for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	poolLiquidationReward = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::pool_liquidation_reward`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.pure.id(pool.address)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get all allowed maintainer cap IDs
	 * @returns A function that takes a Transaction object
	 */
	allowedMaintainers = () => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::allowed_maintainers`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID)],
			typeArguments: [],
		});
	};

	/**
	 * @description Get all allowed pause cap IDs
	 * @returns A function that takes a Transaction object
	 */
	allowedPauseCaps = () => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::allowed_pause_caps`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID)],
			typeArguments: [],
		});
	};
}
