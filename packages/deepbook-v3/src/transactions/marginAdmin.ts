// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type { TransactionArgument } from '@mysten/sui/transactions';
import type { PoolConfigParams } from '../types/index.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import { hexToBytes } from '@noble/hashes/utils.js';

/**
 * MarginAdminContract class for managing admin actions.
 */
export class MarginAdminContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginAdminContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @returns The admin capability required for admin operations
	 * @throws Error if the admin capability is not set
	 */
	#marginAdminCap() {
		const marginAdminCap = this.#config.marginAdminCap;
		if (!marginAdminCap) {
			throw new Error('MARGIN_ADMIN_CAP environment variable not set');
		}
		return marginAdminCap;
	}

	/**
	 * @description Mint a maintainer cap
	 * @returns A function that takes a Transaction object
	 */
	mintMaintainerCap = () => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::mint_maintainer_cap`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object.clock(),
			],
		});
	};

	/**
	 * @description Revoke a maintainer cap
	 * @returns A function that takes a Transaction object
	 */
	revokeMaintainerCap = (maintainerCapId: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::revoke_maintainer_cap`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object(maintainerCapId),
				tx.object.clock(),
			],
		});
	};

	/**
	 * @description Register a deepbook pool
	 * @param {string} poolKey The key of the pool to be registered
	 * @param {TransactionArgument} poolConfig The configuration of the pool
	 * @returns A function that takes a Transaction object
	 */
	registerDeepbookPool =
		(poolKey: string, poolConfig: TransactionArgument) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::register_deepbook_pool`,
				arguments: [
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.object(this.#marginAdminCap()),
					tx.object(pool.address),
					poolConfig,
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Enable a deepbook pool for margin trading
	 * @param {string} poolKey The key of the pool to be enabled
	 * @returns A function that takes a Transaction object
	 */
	enableDeepbookPool = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::enable_deepbook_pool`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object(pool.address),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Disable a deepbook pool from margin trading
	 * @param {string} poolKey The key of the pool to be disabled
	 * @returns A function that takes a Transaction object
	 */
	disableDeepbookPool = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::disable_deepbook_pool`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object(pool.address),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Update the risk parameters for a margin
	 * @param {string} poolKey The key of the pool to be updated
	 * @param {TransactionArgument} poolConfig The configuration of the pool
	 * @returns A function that takes a Transaction object
	 */
	updateRiskParams = (poolKey: string, poolConfig: TransactionArgument) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::update_risk_params`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object(pool.address),
				poolConfig,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Add the PythConfig to the margin registry
	 * @param {Transaction} tx The transaction object
	 * @param {TransactionArgument} config The config to be added
	 * @returns A function that takes a Transaction object
	 */
	addConfig = (config: TransactionArgument) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::add_config`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				config,
			],
			typeArguments: [`${this.#config.MARGIN_PACKAGE_ID}::oracle::PythConfig`],
		});
	};

	/**
	 * @description Remove the PythConfig from the margin registry
	 * @param {Transaction} tx The transaction object
	 * @returns A function that takes a Transaction object
	 */
	removeConfig = () => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::remove_config`,
			arguments: [tx.object(this.#config.MARGIN_REGISTRY_ID), tx.object(this.#marginAdminCap())],
			typeArguments: [`${this.#config.MARGIN_PACKAGE_ID}::oracle::PythConfig`],
		});
	};

	/**
	 * @description Enable a specific version
	 * @param {number} version The version to be enabled
	 * @returns A function that takes a Transaction object
	 */
	enableVersion = (version: number) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::enable_version`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.pure.u64(version),
				tx.object(this.#marginAdminCap()),
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
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::disable_version`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.pure.u64(version),
				tx.object(this.#marginAdminCap()),
			],
		});
	};

	/**
	 * @description Create a new pool config
	 * @param {string} poolKey The key to identify the pool
	 * @param {PoolConfigParams} poolConfigParams The parameters for the pool config
	 * @returns A function that takes a Transaction object
	 */
	newPoolConfig = (poolKey: string, poolConfigParams: PoolConfigParams) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const {
			minWithdrawRiskRatio,
			minBorrowRiskRatio,
			liquidationRiskRatio,
			targetLiquidationRiskRatio,
			userLiquidationReward,
			poolLiquidationReward,
		} = poolConfigParams;
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::new_pool_config`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.pure.u64(Math.round(minWithdrawRiskRatio * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(minBorrowRiskRatio * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(liquidationRiskRatio * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(targetLiquidationRiskRatio * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(userLiquidationReward * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(poolLiquidationReward * FLOAT_SCALAR)),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Create a new pool config with leverage
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} leverage The leverage for the pool
	 * @returns A function that takes a Transaction object
	 */
	newPoolConfigWithLeverage = (poolKey: string, leverage: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::new_pool_config_with_leverage`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.pure.u64(Math.round(leverage * FLOAT_SCALAR)),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Create a new coin type data
	 * @param {string} coinKey The key to identify the coin
	 * @param {number} maxConfBps The maximum confidence interval in basis points
	 * @param {number} maxEwmaDifferenceBps The maximum EWMA difference in basis points
	 * @returns A function that takes a Transaction object
	 */
	newCoinTypeData =
		(coinKey: string, maxConfBps: number, maxEwmaDifferenceBps: number) => (tx: Transaction) => {
			const coin = this.#config.getCoin(coinKey);
			if (!coin.feed) {
				throw new Error('Coin feed not found');
			}
			const priceFeedInput = new Uint8Array(
				hexToBytes(coin['feed']!.startsWith('0x') ? coin.feed!.slice(2) : coin['feed']),
			);
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::oracle::new_coin_type_data_from_currency`,
				arguments: [
					tx.object(coin.currencyId!),
					tx.pure.vector('u8', priceFeedInput),
					tx.pure.u64(maxConfBps),
					tx.pure.u64(maxEwmaDifferenceBps),
				],
				typeArguments: [coin.type],
			});
		};

	/**
	 * @description Create a new Pyth config
	 * @param {Array<{coinKey: string, maxConfBps: number, maxEwmaDifferenceBps: number}>} coinSetups The coins with their oracle config to be added to the Pyth config
	 * @param {number} maxAgeSeconds The max age in seconds for the Pyth config
	 * @returns A function that takes a Transaction object
	 */
	newPythConfig =
		(
			coinSetups: Array<{ coinKey: string; maxConfBps: number; maxEwmaDifferenceBps: number }>,
			maxAgeSeconds: number,
		) =>
		(tx: Transaction) => {
			const coinTypeDataList = [];
			for (const setup of coinSetups) {
				coinTypeDataList.push(
					this.newCoinTypeData(setup.coinKey, setup.maxConfBps, setup.maxEwmaDifferenceBps)(tx),
				);
			}
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::oracle::new_pyth_config`,
				arguments: [
					tx.makeMoveVec({
						elements: coinTypeDataList,
						type: `${this.#config.MARGIN_PACKAGE_ID}::oracle::CoinTypeData`,
					}),
					tx.pure.u64(maxAgeSeconds),
				],
			});
		};

	/**
	 * @description Mint a pause cap
	 * @returns A function that takes a Transaction object
	 */
	mintPauseCap = () => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::mint_pause_cap`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object.clock(),
			],
		});
	};

	/**
	 * @description Revoke a pause cap
	 * @param {string} pauseCapId The ID of the pause cap to revoke
	 * @returns A function that takes a Transaction object
	 */
	revokePauseCap = (pauseCapId: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::revoke_pause_cap`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
				tx.object.clock(),
				tx.pure.id(pauseCapId),
			],
		});
	};

	/**
	 * @description Disable a version using pause cap
	 * @param {number} version The version to disable
	 * @param {string} pauseCapId The ID of the pause cap
	 * @returns A function that takes a Transaction object
	 */
	disableVersionPauseCap = (version: number, pauseCapId: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_registry::disable_version_pause_cap`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.pure.u64(version),
				tx.object(pauseCapId),
			],
		});
	};

	/**
	 * @description Withdraw the default referral fees (admin only)
	 * The default referral at 0x0 doesn't have a SupplyReferral object
	 * @param {string} coinKey The key to identify the margin pool
	 * @returns A function that takes a Transaction object and returns a Coin<Asset>
	 */
	adminWithdrawDefaultReferralFees = (coinKey: string) => (tx: Transaction) => {
		const coin = this.#config.getCoin(coinKey);
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::admin_withdraw_default_referral_fees`,
			arguments: [
				tx.object(marginPool.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(this.#marginAdminCap()),
			],
			typeArguments: [coin.type],
		});
	};
}
