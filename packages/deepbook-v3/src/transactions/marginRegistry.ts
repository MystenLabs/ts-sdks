// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import * as marginRegistryMoveCalls from '../contracts/deepbook_margin/margin_registry.js';

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
		return tx.add(
			marginRegistryMoveCalls.poolEnabled({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the margin pool ID for a given asset
	 * @param {string} coinKey The key to identify the coin
	 * @returns A function that takes a Transaction object
	 */
	getMarginPoolId = (coinKey: string) => (tx: Transaction) => {
		const coin = this.#config.getCoin(coinKey);
		return tx.add(
			marginRegistryMoveCalls.getMarginPoolId({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID },
				typeArguments: [coin.type],
			}),
		);
	};

	/**
	 * @description Get the margin pool IDs (base and quote) for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	getDeepbookPoolMarginPoolIds = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.getDeepbookPoolMarginPoolIds({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the margin manager IDs for a given owner
	 * @param {string} owner The owner address
	 * @returns A function that takes a Transaction object
	 */
	getMarginManagerIds = (owner: string) => (tx: Transaction) => {
		return tx.add(
			marginRegistryMoveCalls.getMarginManagerIds({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, owner },
			}),
		);
	};

	/**
	 * @description Get the base margin pool ID for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	baseMarginPoolId = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.baseMarginPoolId({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the quote margin pool ID for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	quoteMarginPoolId = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.quoteMarginPoolId({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the minimum withdraw risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minWithdrawRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.minWithdrawRiskRatio({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the minimum borrow risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minBorrowRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.minBorrowRiskRatio({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the minimum risk ratio required to open a new position on
	 * a deepbook pool. Distinct from `minBorrowRiskRatio`, which gates borrowing.
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minOpenRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.minOpenRiskRatio({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the liquidation risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	liquidationRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.liquidationRiskRatio({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the target liquidation risk ratio for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	targetLiquidationRiskRatio = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.targetLiquidationRiskRatio({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the user liquidation reward for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	userLiquidationReward = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.userLiquidationReward({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get the pool liquidation reward for a deepbook pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	poolLiquidationReward = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		return tx.add(
			marginRegistryMoveCalls.poolLiquidationReward({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, deepbookPoolId: pool.address },
			}),
		);
	};

	/**
	 * @description Get all allowed maintainer cap IDs
	 * @returns A function that takes a Transaction object
	 */
	allowedMaintainers = () => (tx: Transaction) => {
		return tx.add(
			marginRegistryMoveCalls.allowedMaintainers({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID },
			}),
		);
	};

	/**
	 * @description Get all allowed pause cap IDs
	 * @returns A function that takes a Transaction object
	 */
	allowedPauseCaps = () => (tx: Transaction) => {
		return tx.add(
			marginRegistryMoveCalls.allowedPauseCaps({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID },
			}),
		);
	};
}
