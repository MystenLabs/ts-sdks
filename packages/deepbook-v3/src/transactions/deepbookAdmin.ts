// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { CreatePoolAdminParams, SetEwmaParamsParams } from '../types/index.js';
import type { DeepBookConfig } from '../utils/config.js';
import { FLOAT_SCALAR } from '../utils/config.js';

/**
 * DeepBookAdminContract class for managing admin actions.
 */
export class DeepBookAdminContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for DeepBookAdminContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @returns The admin capability required for admin operations
	 * @throws Error if the admin capability is not set
	 */
	#adminCap() {
		const adminCap = this.#config.adminCap;
		if (!adminCap) {
			throw new Error('ADMIN_CAP environment variable not set');
		}
		return adminCap;
	}

	/**
	 * @description Create a new pool as admin
	 * @param {CreatePoolAdminParams} params Parameters for creating pool as admin
	 * @returns A function that takes a Transaction object
	 */
	createPoolAdmin = (params: CreatePoolAdminParams) => (tx: Transaction) => {
		tx.setSenderIfNotSet(this.#config.address);
		const { baseCoinKey, quoteCoinKey, tickSize, lotSize, minSize, whitelisted, stablePool } =
			params;
		const baseCoin = this.#config.getCoin(baseCoinKey);
		const quoteCoin = this.#config.getCoin(quoteCoinKey);

		const baseScalar = baseCoin.scalar;
		const quoteScalar = quoteCoin.scalar;

		const adjustedTickSize = Math.round((tickSize * FLOAT_SCALAR * quoteScalar) / baseScalar);
		const adjustedLotSize = Math.round(lotSize * baseScalar);
		const adjustedMinSize = Math.round(minSize * baseScalar);

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::create_pool_admin`,
			arguments: [
				tx.object(this.#config.REGISTRY_ID), // registry_id
				tx.pure.u64(adjustedTickSize), // adjusted tick_size
				tx.pure.u64(adjustedLotSize), // adjusted lot_size
				tx.pure.u64(adjustedMinSize), // adjusted min_size
				tx.pure.bool(whitelisted),
				tx.pure.bool(stablePool),
				tx.object(this.#adminCap()),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Unregister a pool as admin
	 * @param {string} poolKey The key of the pool to be unregistered by admin
	 * @returns A function that takes a Transaction object
	 */
	unregisterPoolAdmin = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::unregister_pool_admin`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#config.REGISTRY_ID),
				tx.object(this.#adminCap()),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Update the allowed versions for a pool
	 * @param {string} poolKey The key of the pool to be updated
	 * @returns A function that takes a Transaction object
	 */
	updateAllowedVersions = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::update_allowed_versions`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#config.REGISTRY_ID),
				tx.object(this.#adminCap()),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Enable a specific version
	 * @param {number} version The version to be enabled
	 * @returns A function that takes a Transaction object
	 */
	enableVersion = (version: number) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::enable_version`,
			arguments: [
				tx.object(this.#config.REGISTRY_ID),
				tx.pure.u64(version),
				tx.object(this.#adminCap()),
			],
		});
	};

	/**
	 * @description Disable a specific version
	 * @param {number} version The version to be disabled
	 * @returns A function that takes a Transaction object
	 */
	disableVersion = (version: number) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::disable_version`,
			arguments: [
				tx.object(this.#config.REGISTRY_ID),
				tx.pure.u64(version),
				tx.object(this.#adminCap()),
			],
		});
	};

	/**
	 * @description Sets the treasury address where pool creation fees will be sent
	 * @param {string} treasuryAddress The treasury address
	 * @returns A function that takes a Transaction object
	 */
	setTreasuryAddress = (treasuryAddress: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::set_treasury_address`,
			arguments: [
				tx.object(this.#config.REGISTRY_ID),
				tx.pure.address(treasuryAddress),
				tx.object(this.#adminCap()),
			],
		});
	};

	/**
	 * @description Add a coin to whitelist of stable coins
	 * @param {string} stableCoinKey The name of the stable coin to be added
	 * @returns A function that takes a Transaction object
	 */
	addStableCoin = (stableCoinKey: string) => (tx: Transaction) => {
		const stableCoinType = this.#config.getCoin(stableCoinKey).type;
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::add_stablecoin`,
			arguments: [tx.object(this.#config.REGISTRY_ID), tx.object(this.#adminCap())],
			typeArguments: [stableCoinType],
		});
	};

	/**
	 * @description Remove a coin from whitelist of stable coins
	 * @param {string} stableCoinKey The name of the stable coin to be removed
	 * @returns A function that takes a Transaction object
	 */
	removeStableCoin = (stableCoinKey: string) => (tx: Transaction) => {
		const stableCoinType = this.#config.getCoin(stableCoinKey).type;
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::remove_stablecoin`,
			arguments: [tx.object(this.#config.REGISTRY_ID), tx.object(this.#adminCap())],
			typeArguments: [stableCoinType],
		});
	};

	/**
	 * @description Adjust the tick size of a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} newTickSize The new tick size
	 * @returns A function that takes a Transaction object
	 */
	adjustTickSize = (poolKey: string, newTickSize: number) => (tx: Transaction) => {
		tx.setSenderIfNotSet(this.#config.address);
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		const baseScalar = baseCoin.scalar;
		const quoteScalar = quoteCoin.scalar;

		const adjustedTickSize = (newTickSize * FLOAT_SCALAR * quoteScalar) / baseScalar;

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::adjust_tick_size_admin`,
			arguments: [
				tx.object(pool.address), // pool address
				tx.pure.u64(adjustedTickSize), // adjusted tick_size
				tx.object(this.#adminCap()),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Adjust the lot size and min size of a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} newLotSize The new lot size
	 * @param {number} newMinSize The new min size
	 * @returns A function that takes a Transaction object
	 */
	adjustMinLotSize =
		(poolKey: string, newLotSize: number, newMinSize: number) => (tx: Transaction) => {
			tx.setSenderIfNotSet(this.#config.address);
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			const baseScalar = baseCoin.scalar;

			const adjustedLotSize = newLotSize * baseScalar;
			const adjustedMinSize = newMinSize * baseScalar;

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::adjust_min_lot_size_admin`,
				arguments: [
					tx.object(pool.address), // pool address
					tx.pure.u64(adjustedLotSize),
					tx.pure.u64(adjustedMinSize),
					tx.object(this.#adminCap()),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Initialize the balance manager map
	 * @returns A function that takes a Transaction object
	 */
	initBalanceManagerMap = () => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::init_balance_manager_map`,
			arguments: [tx.object(this.#config.REGISTRY_ID), tx.object(this.#adminCap())],
		});
	};

	/**
	 * @description Set the EWMA parameters for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {SetEwmaParamsParams} params The parameters to set
	 * @returns A function that takes a Transaction object
	 */
	setEwmaParams = (poolKey: string, params: SetEwmaParamsParams) => (tx: Transaction) => {
		const { alpha, zScoreThreshold, additionalTakerFee } = params;
		const adjustedAlpha = Math.round(alpha * FLOAT_SCALAR);
		const adjustedZScoreThreshold = Math.round(zScoreThreshold * FLOAT_SCALAR);
		const adjustedAdditionalTakerFee = Math.round(additionalTakerFee * FLOAT_SCALAR);
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::set_ewma_params`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#adminCap()),
				tx.pure.u64(adjustedAlpha),
				tx.pure.u64(adjustedZScoreThreshold),
				tx.pure.u64(adjustedAdditionalTakerFee),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Enable or disable the EWMA state for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {boolean} enable Whether to enable or disable the EWMA state
	 * @returns A function that takes a Transaction object
	 */
	enableEwmaState = (poolKey: string, enable: boolean) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::enable_ewma_state`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#adminCap()),
				tx.pure.bool(enable),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};
}
