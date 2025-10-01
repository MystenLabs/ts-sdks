// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { BalanceManagerContract } from '../transactions/balanceManager.js';
import type { BalanceManager, Environment, MarginManager } from '../types/index.js';
import type { CoinMap, PoolMap, MarginPoolMap } from './constants.js';
import {
	mainnetCoins,
	mainnetPackageIds,
	mainnetPools,
	testnetCoins,
	testnetPackageIds,
	testnetPools,
	mainnetMarginPools,
	testnetMarginPools,
} from './constants.js';

export const FLOAT_SCALAR = 1000000000;
export const MAX_TIMESTAMP = 1844674407370955161n;
export const GAS_BUDGET = 0.5 * 500000000; // Adjust based on benchmarking
export const DEEP_SCALAR = 1000000;
export const POOL_CREATION_FEE = 500 * 1_000_000; // 500 DEEP

export class DeepBookConfig {
	#coins: CoinMap;
	#pools: PoolMap;
	#marginPools: MarginPoolMap;
	balanceManagers: { [key: string]: BalanceManager };
	marginManagers: { [key: string]: MarginManager };
	address: string;

	DEEPBOOK_PACKAGE_ID: string;
	REGISTRY_ID: string;
	DEEP_TREASURY_ID: string;
	MARGIN_PACKAGE_ID: string;
	MARGIN_REGISTRY_ID: string;
	adminCap?: string;
	marginAdminCap?: string;
	marginMaintainerCap?: string;

	balanceManager: BalanceManagerContract;

	constructor({
		env,
		address,
		adminCap,
		marginAdminCap,
		marginMaintainerCap,
		balanceManagers,
		marginManagers,
		coins,
		pools,
		marginPools,
	}: {
		env: Environment;
		address: string;
		adminCap?: string;
		marginAdminCap?: string;
		marginMaintainerCap?: string;
		balanceManagers?: { [key: string]: BalanceManager };
		marginManagers?: { [key: string]: MarginManager };
		coins?: CoinMap;
		pools?: PoolMap;
		marginPools?: MarginPoolMap;
	}) {
		this.address = normalizeSuiAddress(address);
		this.adminCap = adminCap;
		this.marginAdminCap = marginAdminCap;
		this.marginMaintainerCap = marginMaintainerCap;
		this.balanceManagers = balanceManagers || {};
		this.marginManagers = marginManagers || {};

		if (env === 'mainnet') {
			this.#coins = coins || mainnetCoins;
			this.#pools = pools || mainnetPools;
			this.#marginPools = marginPools || mainnetMarginPools;
			this.DEEPBOOK_PACKAGE_ID = mainnetPackageIds.DEEPBOOK_PACKAGE_ID;
			this.REGISTRY_ID = mainnetPackageIds.REGISTRY_ID;
			this.DEEP_TREASURY_ID = mainnetPackageIds.DEEP_TREASURY_ID;
			this.MARGIN_PACKAGE_ID = mainnetPackageIds.MARGIN_PACKAGE_ID;
			this.MARGIN_REGISTRY_ID = mainnetPackageIds.MARGIN_REGISTRY_ID;
		} else {
			this.#coins = coins || testnetCoins;
			this.#pools = pools || testnetPools;
			this.#marginPools = marginPools || testnetMarginPools;
			this.DEEPBOOK_PACKAGE_ID = testnetPackageIds.DEEPBOOK_PACKAGE_ID;
			this.REGISTRY_ID = testnetPackageIds.REGISTRY_ID;
			this.DEEP_TREASURY_ID = testnetPackageIds.DEEP_TREASURY_ID;
			this.MARGIN_PACKAGE_ID = testnetPackageIds.MARGIN_PACKAGE_ID;
			this.MARGIN_REGISTRY_ID = testnetPackageIds.MARGIN_REGISTRY_ID;
		}

		this.balanceManager = new BalanceManagerContract(this);
	}

	// Getters
	getCoin(key: string) {
		const coin = this.#coins[key];
		if (!coin) {
			throw new Error(`Coin not found for key: ${key}`);
		}

		return coin;
	}

	getPool(key: string) {
		const pool = this.#pools[key];
		if (!pool) {
			throw new Error(`Pool not found for key: ${key}`);
		}

		return pool;
	}

	getMarginPool(key: string) {
		const pool = this.#marginPools[key];
		if (!pool) {
			throw new Error(`Margin pool not found for key: ${key}`);
		}

		return pool;
	}

	/**
	 * @description Get the balance manager by key
	 * @param managerKey Key of the balance manager
	 * @returns The BalanceManager object
	 */
	getBalanceManager(managerKey: string): BalanceManager {
		if (!Object.hasOwn(this.balanceManagers, managerKey)) {
			throw new Error(`Balance manager with key ${managerKey} not found.`);
		}

		return this.balanceManagers[managerKey];
	}

	/**
	 * @description Get the margin manager by key
	 * @param managerKey Key of the margin manager
	 * @returns The MarginManager object
	 */
	getMarginManager(managerKey: string): MarginManager {
		if (!Object.hasOwn(this.marginManagers, managerKey)) {
			throw new Error(`Margin manager with key ${managerKey} not found.`);
		}

		return this.marginManagers[managerKey];
	}
}
