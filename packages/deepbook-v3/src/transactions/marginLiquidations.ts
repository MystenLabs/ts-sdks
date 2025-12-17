// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';

/**
 * MarginLiquidationsContract class for managing LiquidationVault operations.
 */
export class MarginLiquidationsContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginLiquidationsContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Create a new liquidation vault
	 * @param {string} liquidationAdminCap The liquidation admin cap object ID
	 * @returns A function that takes a Transaction object
	 */
	createLiquidationVault = (liquidationAdminCap: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.LIQUIDATION_PACKAGE_ID}::liquidation_vault::create_liquidation_vault`,
			arguments: [tx.object(liquidationAdminCap)],
		});
	};

	/**
	 * @description Deposit coins into a liquidation vault
	 * @param {string} vaultId The liquidation vault object ID
	 * @param {string} liquidationAdminCap The liquidation admin cap object ID
	 * @param {string} coinKey The key to identify the coin type
	 * @param {number} amount The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	deposit =
		(vaultId: string, liquidationAdminCap: string, coinKey: string, amount: number) =>
		(tx: Transaction) => {
			const coin = this.#config.getCoin(coinKey);
			const depositCoin = coinWithBalance({
				type: coin.type,
				balance: amount * coin.scalar,
			});
			tx.moveCall({
				target: `${this.#config.LIQUIDATION_PACKAGE_ID}::liquidation_vault::deposit`,
				arguments: [tx.object(vaultId), tx.object(liquidationAdminCap), depositCoin],
				typeArguments: [coin.type],
			});
		};

	/**
	 * @description Withdraw coins from a liquidation vault
	 * @param {string} vaultId The liquidation vault object ID
	 * @param {string} liquidationAdminCap The liquidation admin cap object ID
	 * @param {string} coinKey The key to identify the coin type
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object and returns the withdrawn coin
	 */
	withdraw =
		(vaultId: string, liquidationAdminCap: string, coinKey: string, amount: number) =>
		(tx: Transaction) => {
			const coin = this.#config.getCoin(coinKey);
			return tx.moveCall({
				target: `${this.#config.LIQUIDATION_PACKAGE_ID}::liquidation_vault::withdraw`,
				arguments: [
					tx.object(vaultId),
					tx.object(liquidationAdminCap),
					tx.pure.u64(amount * coin.scalar),
				],
				typeArguments: [coin.type],
			});
		};

	/**
	 * @description Liquidate a margin manager by repaying base debt
	 * @param {string} vaultId The liquidation vault object ID
	 * @param {string} managerAddress The margin manager address to liquidate
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} [repayAmount] The amount to repay (in base asset units), or undefined for full liquidation
	 * @returns A function that takes a Transaction object
	 */
	liquidateBase =
		(vaultId: string, managerAddress: string, poolKey: string, repayAmount?: number) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);

			const repayAmountArg =
				repayAmount !== undefined
					? tx.pure.option('u64', BigInt(Math.floor(repayAmount * baseCoin.scalar)))
					: tx.pure.option('u64', null);

			tx.moveCall({
				target: `${this.#config.LIQUIDATION_PACKAGE_ID}::liquidation_vault::liquidate_base`,
				arguments: [
					tx.object(vaultId),
					tx.object(managerAddress),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.object(baseCoin.priceInfoObjectId!),
					tx.object(quoteCoin.priceInfoObjectId!),
					tx.object(baseMarginPool.address),
					tx.object(quoteMarginPool.address),
					tx.object(pool.address),
					repayAmountArg,
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Liquidate a margin manager by repaying quote debt
	 * @param {string} vaultId The liquidation vault object ID
	 * @param {string} managerAddress The margin manager address to liquidate
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} [repayAmount] The amount to repay (in quote asset units), or undefined for full liquidation
	 * @returns A function that takes a Transaction object
	 */
	liquidateQuote =
		(vaultId: string, managerAddress: string, poolKey: string, repayAmount?: number) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);

			const repayAmountArg =
				repayAmount !== undefined
					? tx.pure.option('u64', BigInt(Math.floor(repayAmount * quoteCoin.scalar)))
					: tx.pure.option('u64', null);

			tx.moveCall({
				target: `${this.#config.LIQUIDATION_PACKAGE_ID}::liquidation_vault::liquidate_quote`,
				arguments: [
					tx.object(vaultId),
					tx.object(managerAddress),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.object(baseCoin.priceInfoObjectId!),
					tx.object(quoteCoin.priceInfoObjectId!),
					tx.object(baseMarginPool.address),
					tx.object(quoteMarginPool.address),
					tx.object(pool.address),
					repayAmountArg,
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	// === Read-Only Functions ===

	/**
	 * @description Get the balance of a specific coin type in the liquidation vault
	 * @param {string} vaultId The liquidation vault object ID
	 * @param {string} coinKey The key to identify the coin type
	 * @returns A function that takes a Transaction object
	 */
	balance = (vaultId: string, coinKey: string) => (tx: Transaction) => {
		const coin = this.#config.getCoin(coinKey);
		return tx.moveCall({
			target: `${this.#config.LIQUIDATION_PACKAGE_ID}::liquidation_vault::balance`,
			arguments: [tx.object(vaultId)],
			typeArguments: [coin.type],
		});
	};
}
