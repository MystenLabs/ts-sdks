// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { CreatePoolAdminParams, SetEwmaParams } from '../types/index.js';
import type { DeepBookConfig } from '../utils/config.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import { convertQuantity, convertPrice, convertRate } from '../utils/conversion.js';
import * as poolMoveCalls from '../contracts/deepbook/pool.js';
import * as registryMoveCalls from '../contracts/deepbook/registry.js';

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

		const adjustedTickSize = convertPrice(tickSize, FLOAT_SCALAR, quoteScalar, baseScalar);
		const adjustedLotSize = convertQuantity(lotSize, baseScalar);
		const adjustedMinSize = convertQuantity(minSize, baseScalar);

		tx.add(
			poolMoveCalls.createPoolAdmin({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					registry: this.#config.REGISTRY_ID,
					tickSize: adjustedTickSize,
					lotSize: adjustedLotSize,
					minSize: adjustedMinSize,
					whitelistedPool: whitelisted,
					stablePool,
					Cap: this.#adminCap(),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolMoveCalls.unregisterPoolAdmin({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					registry: this.#config.REGISTRY_ID,
					Cap: this.#adminCap(),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolMoveCalls.updateAllowedVersions({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					registry: this.#config.REGISTRY_ID,
					Cap: this.#adminCap(),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Enable a specific version
	 * @param {number} version The version to be enabled
	 * @returns A function that takes a Transaction object
	 */
	enableVersion = (version: number) => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.enableVersion({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, version, Cap: this.#adminCap() },
			}),
		);
	};

	/**
	 * @description Disable a specific version
	 * @param {number} version The version to be disabled
	 * @returns A function that takes a Transaction object
	 */
	disableVersion = (version: number) => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.disableVersion({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, version, Cap: this.#adminCap() },
			}),
		);
	};

	/**
	 * @description Sets the treasury address where pool creation fees will be sent
	 * @param {string} treasuryAddress The treasury address
	 * @returns A function that takes a Transaction object
	 */
	setTreasuryAddress = (treasuryAddress: string) => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.setTreasuryAddress({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, treasuryAddress, Cap: this.#adminCap() },
			}),
		);
	};

	/**
	 * @description Add a coin to whitelist of stable coins
	 * @param {string} stableCoinKey The name of the stable coin to be added
	 * @returns A function that takes a Transaction object
	 */
	addStableCoin = (stableCoinKey: string) => (tx: Transaction) => {
		const stableCoinType = this.#config.getCoin(stableCoinKey).type;
		tx.add(
			registryMoveCalls.addStablecoin({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, Cap: this.#adminCap() },
				typeArguments: [stableCoinType],
			}),
		);
	};

	/**
	 * @description Remove a coin from whitelist of stable coins
	 * @param {string} stableCoinKey The name of the stable coin to be removed
	 * @returns A function that takes a Transaction object
	 */
	removeStableCoin = (stableCoinKey: string) => (tx: Transaction) => {
		const stableCoinType = this.#config.getCoin(stableCoinKey).type;
		tx.add(
			registryMoveCalls.removeStablecoin({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, Cap: this.#adminCap() },
				typeArguments: [stableCoinType],
			}),
		);
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

		const adjustedTickSize = convertPrice(newTickSize, FLOAT_SCALAR, quoteScalar, baseScalar);

		tx.add(
			poolMoveCalls.adjustTickSizeAdmin({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, newTickSize: adjustedTickSize, Cap: this.#adminCap() },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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

			const adjustedLotSize = convertQuantity(newLotSize, baseScalar);
			const adjustedMinSize = convertQuantity(newMinSize, baseScalar);

			tx.add(
				poolMoveCalls.adjustMinLotSizeAdmin({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						newLotSize: adjustedLotSize,
						newMinSize: adjustedMinSize,
						Cap: this.#adminCap(),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Initialize the balance manager map
	 * @returns A function that takes a Transaction object
	 */
	initBalanceManagerMap = () => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.initBalanceManagerMap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, Cap: this.#adminCap() },
			}),
		);
	};

	/**
	 * @description Set the EWMA parameters for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {SetEwmaParamsParams} params The parameters to set
	 * @returns A function that takes a Transaction object
	 */
	setEwmaParams = (poolKey: string, params: SetEwmaParams) => (tx: Transaction) => {
		const { alpha, zScoreThreshold, additionalTakerFee } = params;
		const adjustedAlpha = convertRate(alpha, FLOAT_SCALAR);
		const adjustedZScoreThreshold = convertRate(zScoreThreshold, FLOAT_SCALAR);
		const adjustedAdditionalTakerFee = convertRate(additionalTakerFee, FLOAT_SCALAR);
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.setEwmaParams({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					Cap: this.#adminCap(),
					alpha: adjustedAlpha,
					zScoreThreshold: adjustedZScoreThreshold,
					additionalTakerFee: adjustedAdditionalTakerFee,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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

		tx.add(
			poolMoveCalls.enableEwmaState({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, Cap: this.#adminCap(), enable },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Authorize the MarginApp to access protected features of DeepBook
	 * @returns A function that takes a Transaction object
	 */
	authorizeMarginApp = () => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.authorizeApp({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, AdminCap: this.#adminCap() },
				typeArguments: [`${this.#config.MARGIN_V1}::margin_manager::MarginApp`],
			}),
		);
	};

	/**
	 * @description Deauthorize the MarginApp by removing its authorization key
	 * @returns A function that takes a Transaction object and returns a bool
	 */
	deauthorizeMarginApp = () => (tx: Transaction) => {
		return tx.add(
			registryMoveCalls.deauthorizeApp({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, AdminCap: this.#adminCap() },
				typeArguments: [`${this.#config.MARGIN_V1}::margin_manager::MarginApp`],
			}),
		);
	};

	/**
	 * @description Mint a `DeepbookCorePauseCap`. The new cap's ID is recorded
	 * in the core registry so it can later disable any allowed package version
	 * via `disableVersionWithCorePauseCap`. Companion to the margin-side
	 * `MarginAdminContract.mintPauseCap`.
	 * @returns A function that takes a Transaction object and returns the new pause cap
	 */
	mintCorePauseCap = () => (tx: Transaction) => {
		return tx.add(
			registryMoveCalls.mintPauseCap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, Cap: this.#adminCap() },
			}),
		);
	};

	/**
	 * @description Revoke a previously minted `DeepbookCorePauseCap` by ID.
	 * @param {string} pauseCapId The ID of the core pause cap to revoke
	 * @returns A function that takes a Transaction object
	 */
	revokeCorePauseCap = (pauseCapId: string) => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.revokePauseCap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, Cap: this.#adminCap(), pauseCapId },
			}),
		);
	};

	/**
	 * @description Emergency kill switch — disable any allowed core package
	 * version (including the current one) using a held `DeepbookCorePauseCap`.
	 * Re-enable later via `enableVersion`.
	 * @param {number | bigint} version The version to disable
	 * @param {string} pauseCapId The ID of the core pause cap to authorize the disable
	 * @returns A function that takes a Transaction object
	 */
	disableVersionWithCorePauseCap =
		(version: number | bigint, pauseCapId: string) => (tx: Transaction) => {
			tx.add(
				registryMoveCalls.disableVersionPauseCap({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: this.#config.REGISTRY_ID, version, pauseCap: pauseCapId },
				}),
			);
		};

	/**
	 * @description Get the set of allowed `DeepbookCorePauseCap` IDs from the
	 * core registry.
	 * @returns A function that takes a Transaction object and returns a `VecSet<ID>`
	 */
	corePauseCaps = () => (tx: Transaction) => {
		return tx.add(
			registryMoveCalls.allowedPauseCaps({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID },
			}),
		);
	};
}
