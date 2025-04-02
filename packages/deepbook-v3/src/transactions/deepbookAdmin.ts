// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { CreatePoolAdminParams, Environment } from '../types/index.js';
import { mainnetPackageIds, testnetPackageIds } from '../utils/constants.js';

/**
 * DeepBookAdminContract class for managing admin actions.
 */
export class DeepBookAdminContract {
	#deepbookPackageId: string;
	#adminCap: string;
	#registryId: string;

	/**
	 * @param {Environment} env Environment for DeepBookAdminContract
	 * @param {string} adminCap Admin capability for DeepBookAdminContract
	 */
	constructor(env: Environment, adminCap?: string) {
		this.#deepbookPackageId =
			env === 'mainnet'
				? mainnetPackageIds.DEEPBOOK_PACKAGE_ID
				: testnetPackageIds.DEEPBOOK_PACKAGE_ID;
		this.#adminCap = adminCap ?? '';
		this.#registryId =
			env === 'mainnet' ? mainnetPackageIds.REGISTRY_ID : testnetPackageIds.REGISTRY_ID;
	}

	/**
	 * @description Create a new pool as admin
	 * @param {CreatePoolAdminParams} params Parameters for creating pool as admin
	 * @returns A function that takes a Transaction object
	 */
	createPoolAdmin = (params: CreatePoolAdminParams) => (tx: Transaction) => {
		const { baseCoinType, quoteCoinType, tickSize, lotSize, minSize, whitelisted, stablePool } =
			params;

		// TODO: make metadata call to get adjusted tick size, lot size, and min size
		const adjustedTickSize = tickSize;
		const adjustedLotSize = lotSize;
		const adjustedMinSize = minSize;

		tx.moveCall({
			target: `${this.#deepbookPackageId}::pool::create_pool_admin`,
			arguments: [
				tx.object(this.#registryId), // registry_id
				tx.pure.u64(adjustedTickSize), // adjusted tick_size
				tx.pure.u64(adjustedLotSize), // adjusted lot_size
				tx.pure.u64(adjustedMinSize), // adjusted min_size
				tx.pure.bool(whitelisted),
				tx.pure.bool(stablePool),
				tx.object(this.#adminCap),
			],
			typeArguments: [baseCoinType, quoteCoinType],
		});
	};

	/**
	 * @description Unregister a pool as admin
	 * @param {string} poolAddress The address of the pool to be unregistered by admin
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @returns A function that takes a Transaction object
	 */
	unregisterPoolAdmin =
		(poolAddress: string, baseCoinType: string, quoteCoinType: string) => (tx: Transaction) => {
			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::unregister_pool_admin`,
				arguments: [tx.object(poolAddress), tx.object(this.#registryId), tx.object(this.#adminCap)],
				typeArguments: [baseCoinType, quoteCoinType],
			});
		};

	/**
	 * @description Update the allowed versions for a pool
	 * @param {string} poolAddress The address of the pool to be updated
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @returns A function that takes a Transaction object
	 */
	updateAllowedVersions =
		(poolAddress: string, baseCoinType: string, quoteCoinType: string) => (tx: Transaction) => {
			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::update_allowed_versions`,
				arguments: [tx.object(poolAddress), tx.object(this.#registryId), tx.object(this.#adminCap)],
				typeArguments: [baseCoinType, quoteCoinType],
			});
		};

	/**
	 * @description Enable a specific version
	 * @param {number} version The version to be enabled
	 * @returns A function that takes a Transaction object
	 */
	enableVersion = (version: number) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::registry::enable_version`,
			arguments: [tx.object(this.#registryId), tx.pure.u64(version), tx.object(this.#adminCap)],
		});
	};

	/**
	 * @description Disable a specific version
	 * @param {number} version The version to be disabled
	 * @returns A function that takes a Transaction object
	 */
	disableVersion = (version: number) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::registry::disable_version`,
			arguments: [tx.object(this.#registryId), tx.pure.u64(version), tx.object(this.#adminCap)],
		});
	};

	/**
	 * @description Sets the treasury address where pool creation fees will be sent
	 * @param {string} treasuryAddress The treasury address
	 * @returns A function that takes a Transaction object
	 */
	setTreasuryAddress = (treasuryAddress: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::registry::set_treasury_address`,
			arguments: [
				tx.object(this.#registryId),
				tx.pure.address(treasuryAddress),
				tx.object(this.#adminCap),
			],
		});
	};

	/**
	 * @description Add a coin to whitelist of stable coins
	 * @param {string} stableCoinType The type of the stable coin to be added
	 * @returns A function that takes a Transaction object
	 */
	addStableCoin = (stableCoinType: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::registry::add_stablecoin`,
			arguments: [tx.object(this.#registryId), tx.object(this.#adminCap)],
			typeArguments: [stableCoinType],
		});
	};

	/**
	 * @description Remove a coin from whitelist of stable coins
	 * @param {string} stableCoinType The type of the stable coin to be removed
	 * @returns A function that takes a Transaction object
	 */
	removeStableCoin = (stableCoinType: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::registry::remove_stablecoin`,
			arguments: [tx.object(this.#registryId), tx.object(this.#adminCap)],
			typeArguments: [stableCoinType],
		});
	};
}
