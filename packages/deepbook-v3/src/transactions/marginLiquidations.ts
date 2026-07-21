// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import { convertQuantity } from '../utils/conversion.js';
import * as liquidationVaultMoveCalls from '../contracts/margin_liquidation/liquidation_vault.js';

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
		tx.add(
			liquidationVaultMoveCalls.createLiquidationVault({
				package: this.#config.LIQUIDATION_PACKAGE_ID,
				arguments: { LiquidationCap: liquidationAdminCap },
			}),
		);
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
				balance: convertQuantity(amount, coin.scalar),
			});
			tx.add(
				liquidationVaultMoveCalls.deposit({
					package: this.#config.LIQUIDATION_PACKAGE_ID,
					arguments: { self: vaultId, LiquidationCap: liquidationAdminCap, coin: depositCoin },
					typeArguments: [coin.type],
				}),
			);
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
			return tx.add(
				liquidationVaultMoveCalls.withdraw({
					package: this.#config.LIQUIDATION_PACKAGE_ID,
					arguments: {
						self: vaultId,
						LiquidationCap: liquidationAdminCap,
						amount: convertQuantity(amount, coin.scalar),
					},
					typeArguments: [coin.type],
				}),
			);
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

			// Build the Option arg first so its pure input registers ahead of the
			// object inputs (matches the original positional ordering — byte-identical).
			const repayAmountArg =
				repayAmount !== undefined
					? tx.pure.option('u64', convertQuantity(repayAmount, baseCoin.scalar))
					: tx.pure.option('u64', null);

			tx.add(
				liquidationVaultMoveCalls.liquidateBase({
					package: this.#config.LIQUIDATION_PACKAGE_ID,
					arguments: {
						self: vaultId,
						marginManager: managerAddress,
						registry: this.#config.MARGIN_REGISTRY_ID,
						baseOracle: baseCoin.priceInfoObjectId!,
						quoteOracle: quoteCoin.priceInfoObjectId!,
						baseMarginPool: baseMarginPool.address,
						quoteMarginPool: quoteMarginPool.address,
						pool: pool.address,
						repayAmount: repayAmountArg,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
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

			// Build the Option arg first so its pure input registers ahead of the
			// object inputs (matches the original positional ordering — byte-identical).
			const repayAmountArg =
				repayAmount !== undefined
					? tx.pure.option('u64', convertQuantity(repayAmount, quoteCoin.scalar))
					: tx.pure.option('u64', null);

			tx.add(
				liquidationVaultMoveCalls.liquidateQuote({
					package: this.#config.LIQUIDATION_PACKAGE_ID,
					arguments: {
						self: vaultId,
						marginManager: managerAddress,
						registry: this.#config.MARGIN_REGISTRY_ID,
						baseOracle: baseCoin.priceInfoObjectId!,
						quoteOracle: quoteCoin.priceInfoObjectId!,
						baseMarginPool: baseMarginPool.address,
						quoteMarginPool: quoteMarginPool.address,
						pool: pool.address,
						repayAmount: repayAmountArg,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
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
		return tx.add(
			liquidationVaultMoveCalls.balance({
				package: this.#config.LIQUIDATION_PACKAGE_ID,
				arguments: { self: vaultId },
				typeArguments: [coin.type],
			}),
		);
	};
}
