// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type { TransactionArgument } from '@mysten/sui/transactions';
import type { PoolConfigParams } from '../types/index.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import { convertRate } from '../utils/conversion.js';
import { hexToBytes } from '@noble/hashes/utils.js';
import * as marginRegistryMoveCalls from '../contracts/deepbook_margin/margin_registry.js';
import * as marginPoolMoveCalls from '../contracts/deepbook_margin/margin_pool.js';
import * as oracleMoveCalls from '../contracts/deepbook_margin/oracle.js';

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
		return tx.add(
			marginRegistryMoveCalls.mintMaintainerCap({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, AdminCap: this.#marginAdminCap() },
			}),
		);
	};

	/**
	 * @description Revoke a maintainer cap
	 * @returns A function that takes a Transaction object
	 */
	revokeMaintainerCap = (maintainerCapId: string) => (tx: Transaction) => {
		// NOTE: left as a positional moveCall (not codegen). The original passes
		// `maintainerCapId` as an object reference (`tx.object`), whereas the
		// generated binding encodes it as a pure `ID` value — migrating would change
		// the emitted PTB. Kept verbatim to stay byte-identical.
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
			tx.add(
				marginRegistryMoveCalls.registerDeepbookPool({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: this.#config.MARGIN_REGISTRY_ID,
						AdminCap: this.#marginAdminCap(),
						pool: pool.address,
						poolConfig,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
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
		tx.add(
			marginRegistryMoveCalls.enableDeepbookPool({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pool: pool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			marginRegistryMoveCalls.disableDeepbookPool({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pool: pool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			marginRegistryMoveCalls.updateRiskParams({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pool: pool.address,
					poolConfig,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Set the price deviation tolerance for a pool. `tolerance` is
	 * in 9-decimal float scaling (1.0 = `FLOAT_SCALAR`); the SDK applies the
	 * scaling, so callers pass a human-readable fraction (e.g. `0.1` for 10%).
	 * Requires the pool's current price to have been initialized via
	 * `PoolProxyContract.updateCurrentPrice` first.
	 * @param {string} poolKey The key of the pool to update
	 * @param {number | bigint} tolerance Tolerance as a fraction (e.g. 0.1 for 10%)
	 * @returns A function that takes a Transaction object
	 */
	setPriceTolerance = (poolKey: string, tolerance: number | bigint) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginRegistryMoveCalls.setPriceTolerance({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pool: pool.address,
					tolerance: convertRate(tolerance, FLOAT_SCALAR),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Set the maximum acceptable Pyth price age (in milliseconds)
	 * for a pool. Requires the pool's current price to have been initialized
	 * via `PoolProxyContract.updateCurrentPrice` first.
	 * @param {string} poolKey The key of the pool to update
	 * @param {number | bigint} maxAgeMs Max age in milliseconds (raw u64)
	 * @returns A function that takes a Transaction object
	 */
	setMaxPriceAge = (poolKey: string, maxAgeMs: number | bigint) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginRegistryMoveCalls.setMaxPriceAge({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pool: pool.address,
					maxAgeMs,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Set the maximum lifetime (in milliseconds) of margin limit
	 * orders for a pool. `pool_proxy::place_limit_order_v2` and
	 * `place_reduce_only_limit_order_v2` clamp the user-supplied
	 * `expire_timestamp` to at most `now + max_order_ttl_ms`, bounding margin
	 * orders' exposure to stale-price exploitation.
	 * @param {string} poolKey The key of the pool to update
	 * @param {number | bigint} maxOrderTtlMs Max order TTL in milliseconds (raw u64)
	 * @returns A function that takes a Transaction object
	 */
	setMaxOrderTtl = (poolKey: string, maxOrderTtlMs: number | bigint) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginRegistryMoveCalls.setMaxOrderTtl({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pool: pool.address,
					maxOrderTtlMs,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Set the minimum risk ratio required to open a new position on
	 * a pool. Distinct from the borrow floor: this gates position opening, not
	 * borrowing. Stored in 9-decimal float scaling (1.0 = `FLOAT_SCALAR`); the SDK
	 * applies the scaling, so callers pass a human-readable ratio (e.g. `1.25`).
	 * @param {string} poolKey The key of the pool to update
	 * @param {number | bigint} minOpenRiskRatio Minimum open risk ratio (e.g. 1.25)
	 * @returns A function that takes a Transaction object
	 */
	setMinOpenRiskRatio =
		(poolKey: string, minOpenRiskRatio: number | bigint) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			tx.add(
				marginRegistryMoveCalls.setMinOpenRiskRatio({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: this.#config.MARGIN_REGISTRY_ID,
						AdminCap: this.#marginAdminCap(),
						pool: pool.address,
						minOpenRiskRatio: convertRate(minOpenRiskRatio, FLOAT_SCALAR),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Add the PythConfig to the margin registry
	 * @param {Transaction} tx The transaction object
	 * @param {TransactionArgument} config The config to be added
	 * @returns A function that takes a Transaction object
	 */
	addConfig = (config: TransactionArgument) => (tx: Transaction) => {
		tx.add(
			marginRegistryMoveCalls.addConfig({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					config,
				},
				typeArguments: [`${this.#config.MARGIN_PACKAGE_ID}::oracle::PythConfig`],
			}),
		);
	};

	/**
	 * @description Remove the PythConfig from the margin registry
	 * @param {Transaction} tx The transaction object
	 * @returns A function that takes a Transaction object
	 */
	removeConfig = () => (tx: Transaction) => {
		tx.add(
			marginRegistryMoveCalls.removeConfig({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, AdminCap: this.#marginAdminCap() },
				typeArguments: [`${this.#config.MARGIN_PACKAGE_ID}::oracle::PythConfig`],
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
			marginRegistryMoveCalls.enableVersion({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					version,
					AdminCap: this.#marginAdminCap(),
				},
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
			marginRegistryMoveCalls.disableVersion({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					version,
					AdminCap: this.#marginAdminCap(),
				},
			}),
		);
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
		return tx.add(
			marginRegistryMoveCalls.newPoolConfig({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					minWithdrawRiskRatio: convertRate(minWithdrawRiskRatio, FLOAT_SCALAR),
					minBorrowRiskRatio: convertRate(minBorrowRiskRatio, FLOAT_SCALAR),
					liquidationRiskRatio: convertRate(liquidationRiskRatio, FLOAT_SCALAR),
					targetLiquidationRiskRatio: convertRate(targetLiquidationRiskRatio, FLOAT_SCALAR),
					userLiquidationReward: convertRate(userLiquidationReward, FLOAT_SCALAR),
					poolLiquidationReward: convertRate(poolLiquidationReward, FLOAT_SCALAR),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			marginRegistryMoveCalls.newPoolConfigWithLeverage({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					leverage: convertRate(leverage, FLOAT_SCALAR),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
			return tx.add(
				oracleMoveCalls.newCoinTypeDataFromCurrency({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						currency: coin.currencyId!,
						priceFeedId: Array.from(priceFeedInput),
						maxConfBps,
						maxEwmaDifferenceBps,
					},
					typeArguments: [coin.type],
				}),
			);
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
			return tx.add(
				oracleMoveCalls.newPythConfig({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						setups: tx.makeMoveVec({
							elements: coinTypeDataList,
							type: `${this.#config.MARGIN_PACKAGE_ID}::oracle::CoinTypeData`,
						}),
						maxAgeSecs: maxAgeSeconds,
					},
				}),
			);
		};

	/**
	 * @description Mint a pause cap
	 * @returns A function that takes a Transaction object
	 */
	mintPauseCap = () => (tx: Transaction) => {
		return tx.add(
			marginRegistryMoveCalls.mintPauseCap({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: this.#config.MARGIN_REGISTRY_ID, AdminCap: this.#marginAdminCap() },
			}),
		);
	};

	/**
	 * @description Revoke a pause cap
	 * @param {string} pauseCapId The ID of the pause cap to revoke
	 * @returns A function that takes a Transaction object
	 */
	revokePauseCap = (pauseCapId: string) => (tx: Transaction) => {
		tx.add(
			marginRegistryMoveCalls.revokePauseCap({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
					pauseCapId,
				},
			}),
		);
	};

	/**
	 * @description Disable a version using pause cap
	 * @param {number} version The version to disable
	 * @param {string} pauseCapId The ID of the pause cap
	 * @returns A function that takes a Transaction object
	 */
	disableVersionPauseCap = (version: number, pauseCapId: string) => (tx: Transaction) => {
		tx.add(
			marginRegistryMoveCalls.disableVersionPauseCap({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: this.#config.MARGIN_REGISTRY_ID,
					version,
					pauseCap: pauseCapId,
				},
			}),
		);
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
		return tx.add(
			marginPoolMoveCalls.adminWithdrawDefaultReferralFees({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: marginPool.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					AdminCap: this.#marginAdminCap(),
				},
				typeArguments: [coin.type],
			}),
		);
	};
}
