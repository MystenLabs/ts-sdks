// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type { TransactionArgument } from '@mysten/sui/transactions';
import type { MarginPoolConfigParams, InterestConfigParams } from '../types/index.js';
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
					tx.pure.u64(minBorrow * coin.scalar),
				],
			});
		};

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

	enableDeepbookPoolForLoan =
		(deepbookPoolKey: string, coinKey: string, marginPoolCap: string) => (tx: Transaction) => {
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

	disableDeepbookPoolForLoan =
		(deepbookPoolKey: string, coinKey: string, marginPoolCap: string) => (tx: Transaction) => {
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

	updateInterestParams =
		(coinKey: string, marginPoolCap: string, interestConfig: InterestConfigParams) =>
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

	updateMarginPoolConfig =
		(coinKey: string, marginPoolCap: string, marginPoolConfig: MarginPoolConfigParams) =>
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
