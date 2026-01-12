// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Transaction,
	TransactionArgument,
	TransactionObjectArgument,
} from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type {
	MarginPoolConfigParams,
	MarginPoolConfigWithRateLimitParams,
	InterestConfigParams,
} from '../types/index.js';
import { FLOAT_SCALAR } from '../utils/config.js';

/**
 * DeepBookMaintainerContract class for managing maintainer actions.
 */
export class MarginMaintainerContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginMaintainerContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @returns The admin capability required for admin operations
	 * @throws Error if the admin capability is not set
	 */
	#marginMaintainerCap() {
		const marginMaintainerCap = this.#config.marginMaintainerCap;
		if (!marginMaintainerCap) {
			throw new Error('MARGIN_ADMIN_CAP environment variable not set');
		}
		return marginMaintainerCap;
	}

	/**
	 * @description Create a new margin pool
	 * @param {string} coinKey The key to identify the coin
	 * @param {TransactionArgument} poolConfig The configuration for the pool
	 * @returns A function that takes a Transaction object
	 */
	createMarginPool = (coinKey: string, poolConfig: TransactionArgument) => (tx: Transaction) => {
		const coin = this.#config.getCoin(coinKey);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::create_margin_pool`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				poolConfig,
				tx.object(this.#marginMaintainerCap()),
				tx.object.clock(),
			],
			typeArguments: [coin.type],
		});
	};

	/**
	 * @description Create a new protocol config
	 * @param {string} coinKey The key to identify the coin
	 * @param {MarginPoolConfigParams} marginPoolConfig The configuration for the margin pool
	 * @param {InterestConfigParams} interestConfig The configuration for the interest
	 * @returns A function that takes a Transaction object
	 */
	newProtocolConfig =
		(
			coinKey: string,
			marginPoolConfig: MarginPoolConfigParams,
			interestConfig: InterestConfigParams,
		) =>
		(tx: Transaction) => {
			const marginPoolConfigObject = this.newMarginPoolConfig(coinKey, marginPoolConfig)(tx);
			const interestConfigObject = this.newInterestConfig(interestConfig)(tx);
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::protocol_config::new_protocol_config`,
				arguments: [marginPoolConfigObject, interestConfigObject],
			});
		};

	/**
	 * @description Create a new margin pool config
	 * @param {string} coinKey The key to identify the coin
	 * @param {MarginPoolConfigParams} marginPoolConfig The configuration for the margin pool
	 * @returns A function that takes a Transaction object
	 */
	newMarginPoolConfig =
		(coinKey: string, marginPoolConfig: MarginPoolConfigParams) => (tx: Transaction) => {
			const coin = this.#config.getCoin(coinKey);
			const { supplyCap, maxUtilizationRate, referralSpread, minBorrow } = marginPoolConfig;
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::protocol_config::new_margin_pool_config`,
				arguments: [
					tx.pure.u64(supplyCap * coin.scalar),
					tx.pure.u64(maxUtilizationRate * FLOAT_SCALAR),
					tx.pure.u64(referralSpread * FLOAT_SCALAR),
					tx.pure.u64(Math.round(minBorrow * coin.scalar)),
				],
			});
		};

	/**
	 * @description Create a new margin pool config with rate limit
	 * @param {string} coinKey The key to identify the coin
	 * @param {MarginPoolConfigWithRateLimitParams} marginPoolConfig The configuration for the margin pool with rate limit
	 * @returns A function that takes a Transaction object
	 */
	newMarginPoolConfigWithRateLimit =
		(coinKey: string, marginPoolConfig: MarginPoolConfigWithRateLimitParams) =>
		(tx: Transaction) => {
			const coin = this.#config.getCoin(coinKey);
			const {
				supplyCap,
				maxUtilizationRate,
				referralSpread,
				minBorrow,
				rateLimitCapacity,
				rateLimitRefillRatePerMs,
				rateLimitEnabled,
			} = marginPoolConfig;
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::protocol_config::new_margin_pool_config_with_rate_limit`,
				arguments: [
					tx.pure.u64(supplyCap * coin.scalar),
					tx.pure.u64(maxUtilizationRate * FLOAT_SCALAR),
					tx.pure.u64(referralSpread * FLOAT_SCALAR),
					tx.pure.u64(Math.round(minBorrow * coin.scalar)),
					tx.pure.u64(Math.round(rateLimitCapacity * coin.scalar)),
					tx.pure.u64(Math.round(rateLimitRefillRatePerMs * coin.scalar)),
					tx.pure.bool(rateLimitEnabled),
				],
			});
		};

	/**
	 * @description Create a new interest config
	 * @param {InterestConfigParams} interestConfig The configuration for the interest
	 * @returns A function that takes a Transaction object
	 */
	newInterestConfig = (interestConfig: InterestConfigParams) => (tx: Transaction) => {
		const { baseRate, baseSlope, optimalUtilization, excessSlope } = interestConfig;
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::protocol_config::new_interest_config`,
			arguments: [
				tx.pure.u64(baseRate * FLOAT_SCALAR),
				tx.pure.u64(baseSlope * FLOAT_SCALAR),
				tx.pure.u64(optimalUtilization * FLOAT_SCALAR),
				tx.pure.u64(excessSlope * FLOAT_SCALAR),
			],
		});
	};

	/**
	 * @description Enable a deepbook pool for loan
	 * @param {string} deepbookPoolKey The key to identify the deepbook pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {TransactionObjectArgument} marginPoolCap The margin pool cap
	 * @returns A function that takes a Transaction object
	 */
	enableDeepbookPoolForLoan =
		(deepbookPoolKey: string, coinKey: string, marginPoolCap: TransactionObjectArgument) =>
		(tx: Transaction) => {
			const deepbookPool = this.#config.getPool(deepbookPoolKey);
			const marginPool = this.#config.getMarginPool(coinKey);
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::enable_deepbook_pool_for_loan`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.pure.id(deepbookPool.address),
					tx.object(marginPoolCap),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Disable a deepbook pool for loan
	 * @param {string} deepbookPoolKey The key to identify the deepbook pool
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {TransactionObjectArgument} marginPoolCap The margin pool cap
	 * @returns A function that takes a Transaction object
	 */
	disableDeepbookPoolForLoan =
		(deepbookPoolKey: string, coinKey: string, marginPoolCap: TransactionObjectArgument) =>
		(tx: Transaction) => {
			const deepbookPool = this.#config.getPool(deepbookPoolKey);
			const marginPool = this.#config.getMarginPool(coinKey);
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::disable_deepbook_pool_for_loan`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.pure.id(deepbookPool.address),
					tx.object(marginPoolCap),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Update the interest params
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {TransactionObjectArgument} marginPoolCap The margin pool cap
	 * @param {InterestConfigParams} interestConfig The configuration for the interest
	 * @returns A function that takes a Transaction object
	 */
	updateInterestParams =
		(
			coinKey: string,
			marginPoolCap: TransactionObjectArgument,
			interestConfig: InterestConfigParams,
		) =>
		(tx: Transaction) => {
			const marginPool = this.#config.getMarginPool(coinKey);
			const interestConfigObject = this.newInterestConfig(interestConfig)(tx);
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::update_interest_params`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					interestConfigObject,
					tx.object(marginPoolCap),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Update the margin pool config
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {TransactionObjectArgument} marginPoolCap The margin pool cap
	 * @param {MarginPoolConfigParams} marginPoolConfig The configuration for the margin pool
	 * @returns A function that takes a Transaction object
	 */
	updateMarginPoolConfig =
		(
			coinKey: string,
			marginPoolCap: TransactionObjectArgument,
			marginPoolConfig: MarginPoolConfigParams,
		) =>
		(tx: Transaction) => {
			const marginPool = this.#config.getMarginPool(coinKey);
			const marginPoolConfigObject = this.newMarginPoolConfig(coinKey, marginPoolConfig)(tx);
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::update_margin_pool_config`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					marginPoolConfigObject,
					tx.object(marginPoolCap),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};
}
