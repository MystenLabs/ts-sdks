// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Transaction,
	TransactionArgument,
	TransactionObjectArgument,
} from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type { MarginPoolConfigParams, InterestConfigParams } from '../types/index.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import { convertQuantity, convertRate } from '../utils/conversion.js';
import * as marginPoolMoveCalls from '../contracts/deepbook_margin/margin_pool.js';
import * as protocolConfigMoveCalls from '../contracts/deepbook_margin/protocol_config.js';

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
		tx.add(
			marginPoolMoveCalls.createMarginPool({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					config: poolConfig,
					maintainerCap: this.#marginMaintainerCap(),
				},
				typeArguments: [coin.type],
			}),
		);
	};

	/**
	 * @description Create a new protocol config
	 * @param {string} coinKey The key to identify the coin
	 * @param {MarginPoolConfigParams} marginPoolConfig The configuration for the margin pool (with optional rate limit)
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
			const hasRateLimit =
				marginPoolConfig.rateLimitCapacity !== undefined &&
				marginPoolConfig.rateLimitRefillRatePerMs !== undefined &&
				marginPoolConfig.rateLimitEnabled !== undefined;
			const marginPoolConfigObject = hasRateLimit
				? this.newMarginPoolConfigWithRateLimit(coinKey, {
						...marginPoolConfig,
						rateLimitCapacity: marginPoolConfig.rateLimitCapacity!,
						rateLimitRefillRatePerMs: marginPoolConfig.rateLimitRefillRatePerMs!,
						rateLimitEnabled: marginPoolConfig.rateLimitEnabled!,
					})(tx)
				: this.newMarginPoolConfig(coinKey, marginPoolConfig)(tx);
			const interestConfigObject = this.newInterestConfig(interestConfig)(tx);
			return tx.add(
				protocolConfigMoveCalls.newProtocolConfig({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						marginPoolConfig: marginPoolConfigObject,
						interestConfig: interestConfigObject,
					},
				}),
			);
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
			const { supplyCap, maxUtilizationRate, protocolSpread, minBorrow } = marginPoolConfig;
			return tx.add(
				protocolConfigMoveCalls.newMarginPoolConfig({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						supplyCap: convertQuantity(supplyCap, coin.scalar),
						maxUtilizationRate: convertRate(maxUtilizationRate, FLOAT_SCALAR),
						protocolSpread: convertRate(protocolSpread, FLOAT_SCALAR),
						minBorrow: convertQuantity(minBorrow, coin.scalar),
					},
				}),
			);
		};

	/**
	 * @description Create a new margin pool config with rate limit
	 * @param {string} coinKey The key to identify the coin
	 * @param {MarginPoolConfigParams} marginPoolConfig The configuration for the margin pool with rate limit
	 * @returns A function that takes a Transaction object
	 */
	newMarginPoolConfigWithRateLimit =
		(
			coinKey: string,
			marginPoolConfig: Required<
				Pick<
					MarginPoolConfigParams,
					'rateLimitCapacity' | 'rateLimitRefillRatePerMs' | 'rateLimitEnabled'
				>
			> &
				MarginPoolConfigParams,
		) =>
		(tx: Transaction) => {
			const coin = this.#config.getCoin(coinKey);
			const {
				supplyCap,
				maxUtilizationRate,
				protocolSpread,
				minBorrow,
				rateLimitCapacity,
				rateLimitRefillRatePerMs,
				rateLimitEnabled,
			} = marginPoolConfig;
			return tx.add(
				protocolConfigMoveCalls.newMarginPoolConfigWithRateLimit({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						supplyCap: convertQuantity(supplyCap, coin.scalar),
						maxUtilizationRate: convertRate(maxUtilizationRate, FLOAT_SCALAR),
						protocolSpread: convertRate(protocolSpread, FLOAT_SCALAR),
						minBorrow: convertQuantity(minBorrow, coin.scalar),
						rateLimitCapacity: convertQuantity(rateLimitCapacity, coin.scalar),
						rateLimitRefillRatePerMs: convertQuantity(rateLimitRefillRatePerMs, coin.scalar),
						rateLimitEnabled,
					},
				}),
			);
		};

	/**
	 * @description Create a new interest config
	 * @param {InterestConfigParams} interestConfig The configuration for the interest
	 * @returns A function that takes a Transaction object
	 */
	newInterestConfig = (interestConfig: InterestConfigParams) => (tx: Transaction) => {
		const { baseRate, baseSlope, optimalUtilization, excessSlope } = interestConfig;
		return tx.add(
			protocolConfigMoveCalls.newInterestConfig({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					baseRate: convertRate(baseRate, FLOAT_SCALAR),
					baseSlope: convertRate(baseSlope, FLOAT_SCALAR),
					optimalUtilization: convertRate(optimalUtilization, FLOAT_SCALAR),
					excessSlope: convertRate(excessSlope, FLOAT_SCALAR),
				},
			}),
		);
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
			tx.add(
				marginPoolMoveCalls.enableDeepbookPoolForLoan({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginPool.address,
						registry: this.#config.MARGIN_REGISTRY_ID,
						deepbookPoolId: deepbookPool.address,
						marginPoolCap,
					},
					typeArguments: [marginPool.type],
				}),
			);
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
			tx.add(
				marginPoolMoveCalls.disableDeepbookPoolForLoan({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginPool.address,
						registry: this.#config.MARGIN_REGISTRY_ID,
						deepbookPoolId: deepbookPool.address,
						marginPoolCap,
					},
					typeArguments: [marginPool.type],
				}),
			);
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
			tx.add(
				marginPoolMoveCalls.updateInterestParams({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginPool.address,
						registry: this.#config.MARGIN_REGISTRY_ID,
						interestConfig: interestConfigObject,
						marginPoolCap,
					},
					typeArguments: [marginPool.type],
				}),
			);
		};

	/**
	 * @description Update the margin pool config
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {TransactionObjectArgument} marginPoolCap The margin pool cap
	 * @param {MarginPoolConfigParams} marginPoolConfig The configuration for the margin pool (with optional rate limit)
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
			const hasRateLimit =
				marginPoolConfig.rateLimitCapacity !== undefined &&
				marginPoolConfig.rateLimitRefillRatePerMs !== undefined &&
				marginPoolConfig.rateLimitEnabled !== undefined;
			const marginPoolConfigObject = hasRateLimit
				? this.newMarginPoolConfigWithRateLimit(coinKey, {
						...marginPoolConfig,
						rateLimitCapacity: marginPoolConfig.rateLimitCapacity!,
						rateLimitRefillRatePerMs: marginPoolConfig.rateLimitRefillRatePerMs!,
						rateLimitEnabled: marginPoolConfig.rateLimitEnabled!,
					})(tx)
				: this.newMarginPoolConfig(coinKey, marginPoolConfig)(tx);
			tx.add(
				marginPoolMoveCalls.updateMarginPoolConfig({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginPool.address,
						registry: this.#config.MARGIN_REGISTRY_ID,
						marginPoolConfig: marginPoolConfigObject,
						marginPoolCap,
					},
					typeArguments: [marginPool.type],
				}),
			);
		};
}
