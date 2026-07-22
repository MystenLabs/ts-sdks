// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction } from '@mysten/sui/transactions';

import { OrderType, SelfMatchingOptions } from '../types/index.js';
import type {
	CanPlaceLimitOrderParams,
	CanPlaceMarketOrderParams,
	CreatePermissionlessPoolParams,
	PlaceLimitOrderParams,
	PlaceMarketOrderParams,
	SwapParams,
	SwapWithManagerParams,
} from '../types/index.js';
import type { DeepBookConfig } from '../utils/config.js';
import {
	DEEP_SCALAR,
	FLOAT_SCALAR,
	GAS_BUDGET,
	MAX_TIMESTAMP,
	POOL_CREATION_FEE_DEEP,
} from '../utils/config.js';
import { convertQuantity, convertPrice, convertRate } from '../utils/conversion.js';
import * as poolMoveCalls from '../contracts/deepbook/pool.js';
import * as registryMoveCalls from '../contracts/deepbook/registry.js';

/**
 * DeepBookContract class for managing DeepBook operations.
 */
export class DeepBookContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for DeepBookContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Place a limit order
	 * @param {PlaceLimitOrderParams} params Parameters for placing a limit order
	 * @returns A function that takes a Transaction object
	 */
	placeLimitOrder = (params: PlaceLimitOrderParams) => (tx: Transaction) => {
		const {
			poolKey,
			balanceManagerKey,
			clientOrderId,
			price,
			quantity,
			isBid,
			expiration = MAX_TIMESTAMP,
			orderType = OrderType.NO_RESTRICTION,
			selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			payWithDeep = true,
		} = params;

		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);

		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

		tx.add(
			poolMoveCalls.placeLimitOrder({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeProof,
					clientOrderId: BigInt(clientOrderId),
					orderType,
					selfMatchingOption,
					price: inputPrice,
					quantity: inputQuantity,
					isBid,
					payWithDeep,
					expireTimestamp: expiration,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Place a market order
	 * @param {PlaceMarketOrderParams} params Parameters for placing a market order
	 * @returns A function that takes a Transaction object
	 */
	placeMarketOrder = (params: PlaceMarketOrderParams) => (tx: Transaction) => {
		const {
			poolKey,
			balanceManagerKey,
			clientOrderId,
			quantity,
			isBid,
			selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			payWithDeep = true,
		} = params;

		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);

		tx.add(
			poolMoveCalls.placeMarketOrder({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeProof,
					clientOrderId: BigInt(clientOrderId),
					selfMatchingOption,
					quantity: inputQuantity,
					isBid,
					payWithDeep,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Modify an existing order
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string} orderId Order ID to modify
	 * @param {number} newQuantity New quantity for the order
	 * @returns A function that takes a Transaction object
	 */
	modifyOrder =
		(poolKey: string, balanceManagerKey: string, orderId: string, newQuantity: number) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));
			const inputQuantity = convertQuantity(newQuantity, baseCoin.scalar);

			tx.add(
				poolMoveCalls.modifyOrder({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeProof,
						orderId: BigInt(orderId),
						newQuantity: inputQuantity,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Cancel an existing order
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string} orderId Order ID to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelOrder =
		(poolKey: string, balanceManagerKey: string, orderId: string) => (tx: Transaction) => {
			tx.setGasBudgetIfNotSet(GAS_BUDGET);
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

			tx.add(
				poolMoveCalls.cancelOrder({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeProof,
						orderId: BigInt(orderId),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Cancel multiple orders
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string[]} orderIds Array of order IDs to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelOrders =
		(poolKey: string, balanceManagerKey: string, orderIds: string[]) => (tx: Transaction) => {
			tx.setGasBudgetIfNotSet(GAS_BUDGET);
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

			tx.add(
				poolMoveCalls.cancelOrders({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeProof,
						orderIds: orderIds.map(BigInt),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Cancel an existing order, no-op if the order is not currently in the
	 * balance manager's open orders (e.g. already filled, cancelled, expired-and-swept,
	 * or not owned by this balance manager). Unlike `cancelOrder`, this will not abort
	 * on unknown order ids.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string} orderId Order ID to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelLiveOrder =
		(poolKey: string, balanceManagerKey: string, orderId: string) => (tx: Transaction) => {
			tx.setGasBudgetIfNotSet(GAS_BUDGET);
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

			tx.add(
				poolMoveCalls.cancelLiveOrder({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeProof,
						orderId: BigInt(orderId),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Cancel multiple orders, skipping any order_id that is not currently in
	 * the balance manager's open orders (e.g. already filled, cancelled, expired-and-swept,
	 * or not owned by this balance manager). Duplicate ids in the input vector are handled
	 * gracefully. Unlike `cancelOrders`, this will not abort on unknown order ids.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string[]} orderIds Array of order IDs to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelLiveOrders =
		(poolKey: string, balanceManagerKey: string, orderIds: string[]) => (tx: Transaction) => {
			tx.setGasBudgetIfNotSet(GAS_BUDGET);
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

			tx.add(
				poolMoveCalls.cancelLiveOrders({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeProof,
						orderIds: orderIds.map(BigInt),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Cancel all open orders for a balance manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	cancelAllOrders = (poolKey: string, balanceManagerKey: string) => (tx: Transaction) => {
		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

		tx.add(
			poolMoveCalls.cancelAllOrders({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: balanceManager.address, tradeProof },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Withdraw settled amounts for a balance manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	withdrawSettledAmounts = (poolKey: string, balanceManagerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

		tx.add(
			poolMoveCalls.withdrawSettledAmounts({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: balanceManager.address, tradeProof },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Withdraw settled amounts permissionlessly for a balance manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	withdrawSettledAmountsPermissionless =
		(poolKey: string, balanceManagerKey: string) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			tx.add(
				poolMoveCalls.withdrawSettledAmountsPermissionless({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: pool.address, balanceManager: balanceManager.address },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Withdraw settled amounts permissionlessly for a balance manager by ID
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerId The object ID of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	withdrawSettledAmountsManagerID =
		(poolKey: string, balanceManagerId: string) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			tx.add(
				poolMoveCalls.withdrawSettledAmountsPermissionless({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: pool.address, balanceManager: balanceManagerId },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Add a deep price point for a target pool using a reference pool
	 * @param {string} targetPoolKey The key to identify the target pool
	 * @param {string} referencePoolKey The key to identify the reference pool
	 * @returns A function that takes a Transaction object
	 */
	addDeepPricePoint = (targetPoolKey: string, referencePoolKey: string) => (tx: Transaction) => {
		const targetPool = this.#config.getPool(targetPoolKey);
		const referencePool = this.#config.getPool(referencePoolKey);
		const targetBaseCoin = this.#config.getCoin(targetPool.baseCoin);
		const targetQuoteCoin = this.#config.getCoin(targetPool.quoteCoin);
		const referenceBaseCoin = this.#config.getCoin(referencePool.baseCoin);
		const referenceQuoteCoin = this.#config.getCoin(referencePool.quoteCoin);
		tx.add(
			poolMoveCalls.addDeepPricePoint({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { targetPool: targetPool.address, referencePool: referencePool.address },
				typeArguments: [
					targetBaseCoin.type,
					targetQuoteCoin.type,
					referenceBaseCoin.type,
					referenceQuoteCoin.type,
				],
			}),
		);
	};

	/**
	 * @description Claim rebates for a balance manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	claimRebates = (poolKey: string, balanceManagerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

		tx.add(
			poolMoveCalls.claimRebates({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: balanceManager.address, tradeProof },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Mint a referral for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} multiplier The multiplier for the referral
	 * @returns A function that takes a Transaction object
	 */
	mintReferral = (poolKey: string, multiplier: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const adjustedNumber = convertRate(multiplier, FLOAT_SCALAR);

		tx.add(
			poolMoveCalls.mintReferral({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, multiplier: adjustedNumber },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Update the referral multiplier for a pool (DeepBookPoolReferral)
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} referral The referral (DeepBookPoolReferral) to update
	 * @param {number} multiplier The multiplier for the referral
	 * @returns A function that takes a Transaction object
	 */
	updatePoolReferralMultiplier =
		(poolKey: string, referral: string, multiplier: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const adjustedNumber = convertRate(multiplier, FLOAT_SCALAR);

			tx.add(
				poolMoveCalls.updatePoolReferralMultiplier({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: pool.address, referral, multiplier: adjustedNumber },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Claim the rewards for a referral (DeepBookPoolReferral)
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} referral The referral (DeepBookPoolReferral) to claim the rewards for
	 * @returns A function that takes a Transaction object
	 */
	claimPoolReferralRewards = (poolKey: string, referral: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		const [baseRewards, quoteRewards, deepRewards] = tx.add(
			poolMoveCalls.claimPoolReferralRewards({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, referral },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);

		return { baseRewards, quoteRewards, deepRewards };
	};

	/**
	 * @description Update the allowed versions for a pool
	 * @param {string} poolKey The key of the pool to be updated
	 * @returns A function that takes a Transaction object
	 */
	updatePoolAllowedVersions = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			poolMoveCalls.updatePoolAllowedVersions({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, registry: this.#config.REGISTRY_ID },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Gets an order
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} orderId Order ID to get
	 * @returns A function that takes a Transaction object
	 */
	getOrder = (poolKey: string, orderId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.getOrder({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, orderId: BigInt(orderId) },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Prepares a transaction to retrieve multiple orders from a specified pool.
	 * @param {string} poolKey - The identifier key for the pool to retrieve orders from.
	 * @param {string[]} orderIds - Array of order IDs to retrieve.
	 * @returns {Function} A function that takes a Transaction object
	 */
	getOrders = (poolKey: string, orderIds: string[]) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.getOrders({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, orderIds: orderIds.map(BigInt) },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Burn DEEP tokens from the pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	burnDeep = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			poolMoveCalls.burnDeep({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, treasuryCap: this.#config.DEEP_TREASURY_ID },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the mid price for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	midPrice = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.midPrice({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if a pool is whitelisted
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	whitelisted = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			poolMoveCalls.whitelisted({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the quote quantity out for a given base quantity in
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuoteQuantityOut = (poolKey: string, baseQuantity: number | bigint) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.getQuoteQuantityOut({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					baseQuantity: convertQuantity(baseQuantity, baseCoin.scalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the base quantity out for a given quote quantity in
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getBaseQuantityOut = (poolKey: string, quoteQuantity: number | bigint) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const quoteScalar = quoteCoin.scalar;

		tx.add(
			poolMoveCalls.getBaseQuantityOut({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					quoteQuantity: convertQuantity(quoteQuantity, quoteScalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the quantity out for a given base or quote quantity
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuantityOut =
		(poolKey: string, baseQuantity: number | bigint, quoteQuantity: number | bigint) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const quoteScalar = quoteCoin.scalar;

			tx.add(
				poolMoveCalls.getQuantityOut({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						baseQuantity: convertQuantity(baseQuantity, baseCoin.scalar),
						quoteQuantity: convertQuantity(quoteQuantity, quoteScalar),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get open orders for a balance manager in a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} managerKey Key of the balance manager
	 * @returns A function that takes a Transaction object
	 */
	accountOpenOrders = (poolKey: string, managerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getBalanceManager(managerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.accountOpenOrders({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: manager.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get level 2 order book specifying range of price
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} priceLow Lower bound of the price range
	 * @param {number} priceHigh Upper bound of the price range
	 * @param {boolean} isBid Whether to get bid or ask orders
	 * @returns A function that takes a Transaction object
	 */
	getLevel2Range =
		(poolKey: string, priceLow: number | bigint, priceHigh: number | bigint, isBid: boolean) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			tx.add(
				poolMoveCalls.getLevel2Range({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						priceLow: convertPrice(priceLow, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar),
						priceHigh: convertPrice(priceHigh, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar),
						isBid,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get level 2 order book ticks from mid-price for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} tickFromMid Number of ticks from mid-price
	 * @returns A function that takes a Transaction object
	 */
	getLevel2TicksFromMid = (poolKey: string, tickFromMid: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.getLevel2TicksFromMid({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, ticks: tickFromMid },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the vault balances for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	vaultBalances = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.vaultBalances({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the pool ID by asset types
	 * @param {string} baseType Type of the base asset
	 * @param {string} quoteType Type of the quote asset
	 * @returns A function that takes a Transaction object
	 */
	getPoolIdByAssets = (baseType: string, quoteType: string) => (tx: Transaction) => {
		tx.add(
			poolMoveCalls.getPoolIdByAsset({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { registry: this.#config.REGISTRY_ID },
				typeArguments: [baseType, quoteType],
			}),
		);
	};

	/**
	 * @description Swap exact base amount for quote amount
	 * @param {SwapParams} params Parameters for the swap
	 * @returns A function that takes a Transaction object
	 */
	swapExactBaseForQuote = (params: SwapParams) => (tx: Transaction) => {
		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		tx.setSenderIfNotSet(this.#config.address);

		if (params.quoteCoin) {
			throw new Error('quoteCoin is not accepted for swapping base asset');
		}
		const { poolKey, amount: baseAmount, deepAmount, minOut: minQuote } = params;

		const pool = this.#config.getPool(poolKey);
		const deepCoinType = this.#config.getCoin('DEEP').type;
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		const baseCoinInput =
			params.baseCoin ??
			coinWithBalance({
				type: baseCoin.type,
				balance: convertQuantity(baseAmount, baseCoin.scalar),
			});

		const deepCoin =
			params.deepCoin ??
			coinWithBalance({ type: deepCoinType, balance: convertQuantity(deepAmount, DEEP_SCALAR) });

		const minQuoteInput = convertQuantity(minQuote, quoteCoin.scalar);

		const [baseCoinResult, quoteCoinResult, deepCoinResult] = tx.add(
			poolMoveCalls.swapExactBaseForQuote({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					baseIn: baseCoinInput,
					deepIn: deepCoin,
					minQuoteOut: minQuoteInput,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);

		return [baseCoinResult, quoteCoinResult, deepCoinResult] as const;
	};

	/**
	 * @description Swap exact quote amount for base amount
	 * @param {SwapParams} params Parameters for the swap
	 * @returns A function that takes a Transaction object
	 */
	swapExactQuoteForBase = (params: SwapParams) => (tx: Transaction) => {
		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		tx.setSenderIfNotSet(this.#config.address);

		if (params.baseCoin) {
			throw new Error('baseCoin is not accepted for swapping quote asset');
		}
		const { poolKey, amount: quoteAmount, deepAmount, minOut: minBase } = params;

		const pool = this.#config.getPool(poolKey);
		const deepCoinType = this.#config.getCoin('DEEP').type;
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		const quoteCoinInput =
			params.quoteCoin ??
			coinWithBalance({
				type: quoteCoin.type,
				balance: convertQuantity(quoteAmount, quoteCoin.scalar),
			});

		const deepCoin =
			params.deepCoin ??
			coinWithBalance({ type: deepCoinType, balance: convertQuantity(deepAmount, DEEP_SCALAR) });

		const minBaseInput = convertQuantity(minBase, baseCoin.scalar);

		const [baseCoinResult, quoteCoinResult, deepCoinResult] = tx.add(
			poolMoveCalls.swapExactQuoteForBase({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					quoteIn: quoteCoinInput,
					deepIn: deepCoin,
					minBaseOut: minBaseInput,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);

		return [baseCoinResult, quoteCoinResult, deepCoinResult] as const;
	};

	/**
	 * @description Swap exact quantity without a balance manager
	 * @param {SwapParams & {isBaseToCoin: boolean}} params Parameters for the swap
	 * @returns A function that takes a Transaction object
	 */
	swapExactQuantity = (params: SwapParams & { isBaseToCoin: boolean }) => (tx: Transaction) => {
		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		tx.setSenderIfNotSet(this.#config.address);

		const { poolKey, amount, deepAmount, minOut, baseCoin, quoteCoin, deepCoin, isBaseToCoin } =
			params;

		const pool = this.#config.getPool(poolKey);
		const deepCoinType = this.#config.getCoin('DEEP').type;
		const baseCoinType = this.#config.getCoin(pool.baseCoin);
		const quoteCoinType = this.#config.getCoin(pool.quoteCoin);

		const baseCoinInput = isBaseToCoin
			? (baseCoin ??
				coinWithBalance({
					type: baseCoinType.type,
					balance: convertQuantity(amount, baseCoinType.scalar),
				}))
			: coinWithBalance({ type: baseCoinType.type, balance: 0 });

		const quoteCoinInput = isBaseToCoin
			? coinWithBalance({ type: quoteCoinType.type, balance: 0 })
			: (quoteCoin ??
				coinWithBalance({
					type: quoteCoinType.type,
					balance: convertQuantity(amount, quoteCoinType.scalar),
				}));

		const deepCoinInput =
			deepCoin ??
			coinWithBalance({ type: deepCoinType, balance: convertQuantity(deepAmount, DEEP_SCALAR) });

		const minOutInput = convertQuantity(
			minOut,
			isBaseToCoin ? quoteCoinType.scalar : baseCoinType.scalar,
		);

		const [baseCoinResult, quoteCoinResult, deepCoinResult] = tx.add(
			poolMoveCalls.swapExactQuantity({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					baseIn: baseCoinInput,
					quoteIn: quoteCoinInput,
					deepIn: deepCoinInput,
					minOut: minOutInput,
				},
				typeArguments: [baseCoinType.type, quoteCoinType.type],
			}),
		);

		return [baseCoinResult, quoteCoinResult, deepCoinResult] as const;
	};

	/**
	 * @description Swap exact base for quote with a balance manager
	 * @param {SwapWithManagerParams} params Parameters for the swap
	 * @returns A function that takes a Transaction object
	 */
	swapExactBaseForQuoteWithManager = (params: SwapWithManagerParams) => (tx: Transaction) => {
		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		const {
			poolKey,
			balanceManagerKey,
			tradeCap,
			depositCap,
			withdrawCap,
			amount: baseAmount,
			minOut: minQuote,
			baseCoin,
		} = params;

		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoinType = this.#config.getCoin(pool.baseCoin);
		const quoteCoinType = this.#config.getCoin(pool.quoteCoin);

		const baseCoinInput =
			baseCoin ??
			coinWithBalance({
				type: baseCoinType.type,
				balance: convertQuantity(baseAmount, baseCoinType.scalar),
			});
		const minQuoteInput = convertQuantity(minQuote, quoteCoinType.scalar);

		const [baseCoinResult, quoteCoinResult] = tx.add(
			poolMoveCalls.swapExactBaseForQuoteWithManager({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeCap,
					depositCap,
					withdrawCap,
					baseIn: baseCoinInput,
					minQuoteOut: minQuoteInput,
				},
				typeArguments: [baseCoinType.type, quoteCoinType.type],
			}),
		);

		return [baseCoinResult, quoteCoinResult] as const;
	};

	/**
	 * @description Swap exact quote for base with a balance manager
	 * @param {SwapWithManagerParams} params Parameters for the swap
	 * @returns A function that takes a Transaction object
	 */
	swapExactQuoteForBaseWithManager = (params: SwapWithManagerParams) => (tx: Transaction) => {
		tx.setGasBudgetIfNotSet(GAS_BUDGET);
		const {
			poolKey,
			balanceManagerKey,
			tradeCap,
			depositCap,
			withdrawCap,
			amount: quoteAmount,
			minOut: minBase,
			quoteCoin,
		} = params;

		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoinType = this.#config.getCoin(pool.baseCoin);
		const quoteCoinType = this.#config.getCoin(pool.quoteCoin);

		const quoteCoinInput =
			quoteCoin ??
			coinWithBalance({
				type: quoteCoinType.type,
				balance: convertQuantity(quoteAmount, quoteCoinType.scalar),
			});
		const minBaseInput = convertQuantity(minBase, baseCoinType.scalar);

		const [baseCoinResult, quoteCoinResult] = tx.add(
			poolMoveCalls.swapExactQuoteForBaseWithManager({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeCap,
					depositCap,
					withdrawCap,
					quoteIn: quoteCoinInput,
					minBaseOut: minBaseInput,
				},
				typeArguments: [baseCoinType.type, quoteCoinType.type],
			}),
		);

		return [baseCoinResult, quoteCoinResult] as const;
	};

	/**
	 * @description Swap exact quantity (base or quote) with a balance manager
	 * @param {SwapWithManagerParams & {isBaseToCoin: boolean}} params Parameters for the swap
	 * @returns A function that takes a Transaction object
	 */
	swapExactQuantityWithManager =
		(params: SwapWithManagerParams & { isBaseToCoin: boolean }) => (tx: Transaction) => {
			tx.setGasBudgetIfNotSet(GAS_BUDGET);
			const {
				poolKey,
				balanceManagerKey,
				tradeCap,
				depositCap,
				withdrawCap,
				amount,
				minOut,
				baseCoin,
				quoteCoin,
				isBaseToCoin,
			} = params;

			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const baseCoinType = this.#config.getCoin(pool.baseCoin);
			const quoteCoinType = this.#config.getCoin(pool.quoteCoin);

			const baseCoinInput = isBaseToCoin
				? (baseCoin ??
					coinWithBalance({
						type: baseCoinType.type,
						balance: convertQuantity(amount, baseCoinType.scalar),
					}))
				: coinWithBalance({ type: baseCoinType.type, balance: 0 });

			const quoteCoinInput = isBaseToCoin
				? coinWithBalance({ type: quoteCoinType.type, balance: 0 })
				: (quoteCoin ??
					coinWithBalance({
						type: quoteCoinType.type,
						balance: convertQuantity(amount, quoteCoinType.scalar),
					}));

			const minOutInput = convertQuantity(
				minOut,
				isBaseToCoin ? quoteCoinType.scalar : baseCoinType.scalar,
			);

			const [baseCoinResult, quoteCoinResult] = tx.add(
				poolMoveCalls.swapExactQuantityWithManager({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeCap,
						depositCap,
						withdrawCap,
						baseIn: baseCoinInput,
						quoteIn: quoteCoinInput,
						minOut: minOutInput,
					},
					typeArguments: [baseCoinType.type, quoteCoinType.type],
				}),
			);

			return [baseCoinResult, quoteCoinResult] as const;
		};

	/**
	 * @description Create a new pool permissionlessly
	 * @param {CreatePermissionlessPoolParams} params Parameters for creating permissionless pool
	 * @returns A function that takes a Transaction object
	 */
	createPermissionlessPool = (params: CreatePermissionlessPoolParams) => (tx: Transaction) => {
		tx.setSenderIfNotSet(this.#config.address);
		const { baseCoinKey, quoteCoinKey, tickSize, lotSize, minSize, deepCoin } = params;
		const baseCoin = this.#config.getCoin(baseCoinKey);
		const quoteCoin = this.#config.getCoin(quoteCoinKey);
		const deepCoinType = this.#config.getCoin('DEEP').type;

		const baseScalar = baseCoin.scalar;
		const quoteScalar = quoteCoin.scalar;

		const adjustedTickSize = convertPrice(tickSize, FLOAT_SCALAR, quoteScalar, baseScalar);
		const adjustedLotSize = convertQuantity(lotSize, baseScalar);
		const adjustedMinSize = convertQuantity(minSize, baseScalar);

		const deepCoinInput =
			deepCoin ??
			coinWithBalance({
				type: deepCoinType,
				balance: POOL_CREATION_FEE_DEEP,
			});

		tx.add(
			poolMoveCalls.createPermissionlessPool({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					registry: this.#config.REGISTRY_ID,
					tickSize: adjustedTickSize,
					lotSize: adjustedLotSize,
					minSize: adjustedMinSize,
					creationFee: deepCoinInput,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the trade parameters for a given pool, including taker fee, maker fee, and stake required.
	 * @param {string} poolKey Key of the pool
	 * @returns A function that takes a Transaction object
	 */
	poolTradeParams = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.poolTradeParams({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the book parameters for a given pool, including tick size, lot size, and min size.
	 * @param {string} poolKey Key of the pool
	 * @returns A function that takes a Transaction object
	 */
	poolBookParams = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.poolBookParams({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the account information for a given pool and balance manager
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	account = (poolKey: string, managerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const managerId = this.#config.getBalanceManager(managerKey).address;

		tx.add(
			poolMoveCalls.account({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: managerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the locked balance for a given pool and balance manager
	 * @param {string} poolKey Key of the pool
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	lockedBalance = (poolKey: string, managerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const managerId = this.#config.getBalanceManager(managerKey).address;

		tx.add(
			poolMoveCalls.lockedBalance({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: managerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the DEEP price conversion for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	getPoolDeepPrice = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.getOrderDeepPrice({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the balance manager IDs for a given owner
	 * @param {string} owner The owner address to get balance manager IDs for
	 * @returns A function that takes a Transaction object
	 */
	getBalanceManagerIds = (owner: string) => (tx: Transaction) => {
		tx.add(
			registryMoveCalls.getBalanceManagerIds({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: this.#config.REGISTRY_ID, owner },
			}),
		);
	};

	/**
	 * @description Get the balances for a referral (DeepBookPoolReferral)
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} referral The referral (DeepBookPoolReferral) to get the balances for
	 * @returns A function that takes a Transaction object
	 */
	getPoolReferralBalances = (poolKey: string, referral: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.getPoolReferralBalances({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, referral },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the multiplier for a referral (DeepBookPoolReferral)
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} referral The referral (DeepBookPoolReferral) to get the multiplier for
	 * @returns A function that takes a Transaction object
	 */
	poolReferralMultiplier = (poolKey: string, referral: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.poolReferralMultiplier({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, referral },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if a pool is a stable pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	stablePool = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.stablePool({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if a pool is registered
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	registeredPool = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.registeredPool({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the quote quantity out for a given base quantity using input token as fee
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuoteQuantityOutInputFee =
		(poolKey: string, baseQuantity: number | bigint) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.add(
				poolMoveCalls.getQuoteQuantityOutInputFee({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						baseQuantity: convertQuantity(baseQuantity, baseCoin.scalar),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get the base quantity out for a given quote quantity using input token as fee
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getBaseQuantityOutInputFee =
		(poolKey: string, quoteQuantity: number | bigint) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.add(
				poolMoveCalls.getBaseQuantityOutInputFee({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						quoteQuantity: convertQuantity(quoteQuantity, quoteCoin.scalar),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get the quantity out for a given base or quote quantity using input token as fee
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuantityOutInputFee =
		(poolKey: string, baseQuantity: number | bigint, quoteQuantity: number | bigint) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.add(
				poolMoveCalls.getQuantityOutInputFee({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						baseQuantity: convertQuantity(baseQuantity, baseCoin.scalar),
						quoteQuantity: convertQuantity(quoteQuantity, quoteCoin.scalar),
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get the base quantity needed to receive a target quote quantity
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} targetQuoteQuantity Target quote quantity
	 * @param {boolean} payWithDeep Whether to pay fees with DEEP
	 * @returns A function that takes a Transaction object
	 */
	getBaseQuantityIn =
		(poolKey: string, targetQuoteQuantity: number | bigint, payWithDeep: boolean) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.add(
				poolMoveCalls.getBaseQuantityIn({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						targetQuoteQuantity: convertQuantity(targetQuoteQuantity, quoteCoin.scalar),
						payWithDeep,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get the quote quantity needed to receive a target base quantity
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} targetBaseQuantity Target base quantity
	 * @param {boolean} payWithDeep Whether to pay fees with DEEP
	 * @returns A function that takes a Transaction object
	 */
	getQuoteQuantityIn =
		(poolKey: string, targetBaseQuantity: number | bigint, payWithDeep: boolean) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.add(
				poolMoveCalls.getQuoteQuantityIn({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						targetBaseQuantity: convertQuantity(targetBaseQuantity, baseCoin.scalar),
						payWithDeep,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get account order details for a balance manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} managerKey Key of the balance manager
	 * @returns A function that takes a Transaction object
	 */
	getAccountOrderDetails = (poolKey: string, managerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getBalanceManager(managerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.getAccountOrderDetails({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: manager.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the DEEP required for an order
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity
	 * @param {number} price Price
	 * @returns A function that takes a Transaction object
	 */
	getOrderDeepRequired =
		(poolKey: string, baseQuantity: number | bigint, price: number | bigint) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
			const inputQuantity = convertQuantity(baseQuantity, baseCoin.scalar);

			return tx.add(
				poolMoveCalls.getOrderDeepRequired({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: pool.address, baseQuantity: inputQuantity, price: inputPrice },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Check if account exists for a balance manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} managerKey Key of the balance manager
	 * @returns A function that takes a Transaction object
	 */
	accountExists = (poolKey: string, managerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getBalanceManager(managerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.accountExists({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, balanceManager: manager.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the next epoch trade parameters for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	poolTradeParamsNext = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.poolTradeParamsNext({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the quorum for a pool
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	quorum = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.quorum({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the pool ID
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	poolId = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.add(
			poolMoveCalls.id({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if a limit order can be placed
	 * @param {CanPlaceLimitOrderParams} params Parameters for checking limit order validity
	 * @returns A function that takes a Transaction object
	 */
	canPlaceLimitOrder = (params: CanPlaceLimitOrderParams) => (tx: Transaction) => {
		const { poolKey, balanceManagerKey, price, quantity, isBid, payWithDeep, expireTimestamp } =
			params;

		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);

		return tx.add(
			poolMoveCalls.canPlaceLimitOrder({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: manager.address,
					price: inputPrice,
					quantity: inputQuantity,
					isBid,
					payWithDeep,
					expireTimestamp,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if a market order can be placed
	 * @param {CanPlaceMarketOrderParams} params Parameters for checking market order validity
	 * @returns A function that takes a Transaction object
	 */
	canPlaceMarketOrder = (params: CanPlaceMarketOrderParams) => (tx: Transaction) => {
		const { poolKey, balanceManagerKey, quantity, isBid, payWithDeep } = params;

		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getBalanceManager(balanceManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);

		return tx.add(
			poolMoveCalls.canPlaceMarketOrder({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: manager.address,
					quantity: inputQuantity,
					isBid,
					payWithDeep,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if market order params are valid
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} quantity Quantity
	 * @returns A function that takes a Transaction object
	 */
	checkMarketOrderParams = (poolKey: string, quantity: number | bigint) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);

		return tx.add(
			poolMoveCalls.checkMarketOrderParams({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, quantity: inputQuantity },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if limit order params are valid
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} price Price
	 * @param {number} quantity Quantity
	 * @param {number} expireTimestamp Expiration timestamp
	 * @returns A function that takes a Transaction object
	 */
	checkLimitOrderParams =
		(poolKey: string, price: number | bigint, quantity: number | bigint, expireTimestamp: number) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);

			return tx.add(
				poolMoveCalls.checkLimitOrderParams({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						price: inputPrice,
						quantity: inputQuantity,
						expireTimestamp,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};
}
