// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { BalanceManagerContract } from '../transactions/balanceManager.js';
import type { BalanceManager, MarginManager, Coin, Pool, MarginPool } from '../types/index.js';
import type { CoinMap, PoolMap, MarginPoolMap, DeepbookPackageIds } from './constants.js';
import { ResourceNotFoundError, ConfigurationError, ErrorMessages } from './errors.js';
import {
	mainnetCoins,
	mainnetPackageIds,
	mainnetPools,
	testnetCoins,
	testnetPackageIds,
	testnetPools,
	mainnetMarginPools,
	testnetMarginPools,
	mainnetPythConfigs,
	testnetPythConfigs,
} from './constants.js';

// Constants for numerical precision and scaling
export const FLOAT_SCALAR = 1_000_000_000; // 10^9 - Used for floating point representation
export const DEEP_SCALAR = 1_000_000; // 10^6 - DEEP token decimal places

// Time-related constants
export const MAX_TIMESTAMP = 1_844_674_407_370_955_161n; // Maximum Unix timestamp (approximately year 2554)
export const PRICE_INFO_OBJECT_MAX_AGE_MS = 30_000; // 30 seconds in milliseconds

// Transaction and fee constants
export const GAS_BUDGET = 250_000_000; // 0.25 SUI (0.5 * 500M MIST)
export const POOL_CREATION_FEE_DEEP = 500_000_000; // 500 DEEP tokens (500 * 10^6)

export class DeepBookConfig {
	#coins: CoinMap;
	#pools: PoolMap;
	#marginPools: MarginPoolMap;
	network: SuiClientTypes.Network;
	balanceManagers: { [key: string]: BalanceManager };
	marginManagers: { [key: string]: MarginManager };
	address: string;
	pyth: {
		pythStateId: string;
		wormholeStateId: string;
	};

	DEEPBOOK_PACKAGE_ID: string;
	REGISTRY_ID: string;
	DEEP_TREASURY_ID: string;
	MARGIN_PACKAGE_ID: string;
	MARGIN_REGISTRY_ID: string;
	LIQUIDATION_PACKAGE_ID: string;
	adminCap?: string;
	marginAdminCap?: string;
	marginMaintainerCap?: string;

	balanceManager: BalanceManagerContract;

	constructor({
		network,
		address,
		adminCap,
		marginAdminCap,
		marginMaintainerCap,
		balanceManagers,
		marginManagers,
		coins,
		pools,
		marginPools,
		packageIds,
		pyth,
	}: {
		network: SuiClientTypes.Network;
		address: string;
		adminCap?: string;
		marginAdminCap?: string;
		marginMaintainerCap?: string;
		balanceManagers?: { [key: string]: BalanceManager };
		marginManagers?: { [key: string]: MarginManager };
		coins?: CoinMap;
		pools?: PoolMap;
		marginPools?: MarginPoolMap;
		packageIds?: DeepbookPackageIds;
		pyth?: { pythStateId: string; wormholeStateId: string };
	}) {
		this.network = network;
		this.address = normalizeSuiAddress(address);
		this.adminCap = adminCap;
		this.marginAdminCap = marginAdminCap;
		this.marginMaintainerCap = marginMaintainerCap;
		this.balanceManagers = balanceManagers || {};
		this.marginManagers = marginManagers || {};

		if (packageIds) {
			this.DEEPBOOK_PACKAGE_ID = packageIds.DEEPBOOK_PACKAGE_ID || '';
			this.REGISTRY_ID = packageIds.REGISTRY_ID || '';
			this.DEEP_TREASURY_ID = packageIds.DEEP_TREASURY_ID || '';
			this.MARGIN_PACKAGE_ID = packageIds.MARGIN_PACKAGE_ID || '';
			this.MARGIN_REGISTRY_ID = packageIds.MARGIN_REGISTRY_ID || '';
			this.LIQUIDATION_PACKAGE_ID = packageIds.LIQUIDATION_PACKAGE_ID || '';
			this.#coins = coins || {};
			this.#pools = pools || {};
			this.#marginPools = marginPools || {};
			this.pyth = pyth || { pythStateId: '', wormholeStateId: '' };
		} else if (network === 'mainnet') {
			this.#coins = coins || mainnetCoins;
			this.#pools = pools || mainnetPools;
			this.#marginPools = marginPools || mainnetMarginPools;
			this.DEEPBOOK_PACKAGE_ID = mainnetPackageIds.DEEPBOOK_PACKAGE_ID;
			this.REGISTRY_ID = mainnetPackageIds.REGISTRY_ID;
			this.DEEP_TREASURY_ID = mainnetPackageIds.DEEP_TREASURY_ID;
			this.MARGIN_PACKAGE_ID = mainnetPackageIds.MARGIN_PACKAGE_ID;
			this.MARGIN_REGISTRY_ID = mainnetPackageIds.MARGIN_REGISTRY_ID;
			this.LIQUIDATION_PACKAGE_ID = mainnetPackageIds.LIQUIDATION_PACKAGE_ID;
			this.pyth = mainnetPythConfigs;
		} else if (network === 'testnet') {
			this.#coins = coins || testnetCoins;
			this.#pools = pools || testnetPools;
			this.#marginPools = marginPools || testnetMarginPools;
			this.DEEPBOOK_PACKAGE_ID = testnetPackageIds.DEEPBOOK_PACKAGE_ID;
			this.REGISTRY_ID = testnetPackageIds.REGISTRY_ID;
			this.DEEP_TREASURY_ID = testnetPackageIds.DEEP_TREASURY_ID;
			this.MARGIN_PACKAGE_ID = testnetPackageIds.MARGIN_PACKAGE_ID;
			this.MARGIN_REGISTRY_ID = testnetPackageIds.MARGIN_REGISTRY_ID;
			this.LIQUIDATION_PACKAGE_ID = testnetPackageIds.LIQUIDATION_PACKAGE_ID;
			this.pyth = testnetPythConfigs;
		} else {
			throw new Error(
				`Network '${network}' is not supported by default. Provide custom 'packageIds' for non-standard networks.`,
			);
		}

		this.balanceManager = new BalanceManagerContract(this);
	}

	requirePyth() {
		if (!this.pyth.pythStateId || !this.pyth.wormholeStateId) {
			throw new ConfigurationError(
				"Pyth configuration is required for price feed operations. Provide 'pyth' when using custom packageIds.",
			);
		}
	}

	// Getters
	getCoin(key: string): Coin {
		const coin = this.#coins[key];
		if (!coin) {
			throw new ResourceNotFoundError('Coin', key);
		}

		return coin;
	}

	getPool(key: string): Pool {
		const pool = this.#pools[key];
		if (!pool) {
			throw new ResourceNotFoundError('Pool', key);
		}

		return pool;
	}

	getMarginPool(key: string): MarginPool {
		const pool = this.#marginPools[key];
		if (!pool) {
			throw new ResourceNotFoundError('Margin pool', key);
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
			throw new Error(ErrorMessages.BALANCE_MANAGER_NOT_FOUND(managerKey));
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
			throw new Error(ErrorMessages.MARGIN_MANAGER_NOT_FOUND(managerKey));
		}

		return this.marginManagers[managerKey];
	}
}
