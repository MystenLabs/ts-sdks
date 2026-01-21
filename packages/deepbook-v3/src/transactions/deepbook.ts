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
		const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);

		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::place_limit_order`,
			arguments: [
				tx.object(pool.address),
				tx.object(balanceManager.address),
				tradeProof,
				tx.pure.u64(clientOrderId),
				tx.pure.u8(orderType),
				tx.pure.u8(selfMatchingOption),
				tx.pure.u64(inputPrice),
				tx.pure.u64(inputQuantity),
				tx.pure.bool(isBid),
				tx.pure.bool(payWithDeep),
				tx.pure.u64(expiration),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		const inputQuantity = Math.round(quantity * baseCoin.scalar);

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::place_market_order`,
			arguments: [
				tx.object(pool.address),
				tx.object(balanceManager.address),
				tradeProof,
				tx.pure.u64(clientOrderId),
				tx.pure.u8(selfMatchingOption),
				tx.pure.u64(inputQuantity),
				tx.pure.bool(isBid),
				tx.pure.bool(payWithDeep),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			const inputQuantity = Math.round(newQuantity * baseCoin.scalar);

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::modify_order`,
				arguments: [
					tx.object(pool.address),
					tx.object(balanceManager.address),
					tradeProof,
					tx.pure.u128(orderId),
					tx.pure.u64(inputQuantity),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::cancel_order`,
				arguments: [
					tx.object(pool.address),
					tx.object(balanceManager.address),
					tradeProof,
					tx.pure.u128(orderId),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::cancel_orders`,
				arguments: [
					tx.object(pool.address),
					tx.object(balanceManager.address),
					tradeProof,
					tx.pure.vector('u128', orderIds),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::cancel_all_orders`,
			arguments: [
				tx.object(pool.address),
				tx.object(balanceManager.address),
				tradeProof,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::withdraw_settled_amounts`,
			arguments: [tx.object(pool.address), tx.object(balanceManager.address), tradeProof],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::withdraw_settled_amounts_permissionless`,
				arguments: [tx.object(pool.address), tx.object(balanceManager.address)],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::add_deep_price_point`,
			arguments: [
				tx.object(targetPool.address),
				tx.object(referencePool.address),
				tx.object.clock(),
			],
			typeArguments: [
				targetBaseCoin.type,
				targetQuoteCoin.type,
				referenceBaseCoin.type,
				referenceQuoteCoin.type,
			],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::claim_rebates`,
			arguments: [tx.object(pool.address), tx.object(balanceManager.address), tradeProof],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		const adjustedNumber = Math.round(multiplier * FLOAT_SCALAR);

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::mint_referral`,
			arguments: [tx.object(pool.address), tx.pure.u64(adjustedNumber)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			const adjustedNumber = Math.round(multiplier * FLOAT_SCALAR);

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::update_pool_referral_multiplier`,
				arguments: [tx.object(pool.address), tx.object(referral), tx.pure.u64(adjustedNumber)],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		const [baseRewards, quoteRewards, deepRewards] = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::claim_pool_referral_rewards`,
			arguments: [tx.object(pool.address), tx.object(referral)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});

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
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::update_pool_allowed_versions`,
			arguments: [tx.object(pool.address), tx.object(this.#config.REGISTRY_ID)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_order`,
			arguments: [tx.object(pool.address), tx.pure.u128(orderId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_orders`,
			arguments: [tx.object(pool.address), tx.pure.vector('u128', orderIds)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::burn_deep`,
			arguments: [tx.object(pool.address), tx.object(this.#config.DEEP_TREASURY_ID)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::mid_price`,
			arguments: [tx.object(pool.address), tx.object.clock()],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::whitelisted`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the quote quantity out for a given base quantity in
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuoteQuantityOut = (poolKey: string, baseQuantity: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_quote_quantity_out`,
			arguments: [
				tx.object(pool.address),
				tx.pure.u64(Math.round(baseQuantity * baseCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the base quantity out for a given quote quantity in
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getBaseQuantityOut = (poolKey: string, quoteQuantity: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const quoteScalar = quoteCoin.scalar;

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_base_quantity_out`,
			arguments: [
				tx.object(pool.address),
				tx.pure.u64(Math.round(quoteQuantity * quoteScalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the quantity out for a given base or quote quantity
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuantityOut =
		(poolKey: string, baseQuantity: number, quoteQuantity: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const quoteScalar = quoteCoin.scalar;

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_quantity_out`,
				arguments: [
					tx.object(pool.address),
					tx.pure.u64(Math.round(baseQuantity * baseCoin.scalar)),
					tx.pure.u64(Math.round(quoteQuantity * quoteScalar)),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::account_open_orders`,
			arguments: [tx.object(pool.address), tx.object(manager.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		(poolKey: string, priceLow: number, priceHigh: number, isBid: boolean) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_level2_range`,
				arguments: [
					tx.object(pool.address),
					tx.pure.u64(Math.round((priceLow * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar)),
					tx.pure.u64(Math.round((priceHigh * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar)),
					tx.pure.bool(isBid),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_level2_ticks_from_mid`,
			arguments: [tx.object(pool.address), tx.pure.u64(tickFromMid), tx.object.clock()],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::vault_balances`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the pool ID by asset types
	 * @param {string} baseType Type of the base asset
	 * @param {string} quoteType Type of the quote asset
	 * @returns A function that takes a Transaction object
	 */
	getPoolIdByAssets = (baseType: string, quoteType: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_pool_id_by_asset`,
			arguments: [tx.object(this.#config.REGISTRY_ID)],
			typeArguments: [baseType, quoteType],
		});
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
			coinWithBalance({ type: baseCoin.type, balance: Math.round(baseAmount * baseCoin.scalar) });

		const deepCoin =
			params.deepCoin ??
			coinWithBalance({ type: deepCoinType, balance: Math.round(deepAmount * DEEP_SCALAR) });

		const minQuoteInput = Math.round(minQuote * quoteCoin.scalar);

		const [baseCoinResult, quoteCoinResult, deepCoinResult] = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote`,
			arguments: [
				tx.object(pool.address),
				baseCoinInput,
				deepCoin,
				tx.pure.u64(minQuoteInput),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});

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
				balance: Math.round(quoteAmount * quoteCoin.scalar),
			});

		const deepCoin =
			params.deepCoin ??
			coinWithBalance({ type: deepCoinType, balance: Math.round(deepAmount * DEEP_SCALAR) });

		const minBaseInput = Math.round(minBase * baseCoin.scalar);

		const [baseCoinResult, quoteCoinResult, deepCoinResult] = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quote_for_base`,
			arguments: [
				tx.object(pool.address),
				quoteCoinInput,
				deepCoin,
				tx.pure.u64(minBaseInput),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});

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
					balance: Math.round(amount * baseCoinType.scalar),
				}))
			: coinWithBalance({ type: baseCoinType.type, balance: 0 });

		const quoteCoinInput = isBaseToCoin
			? coinWithBalance({ type: quoteCoinType.type, balance: 0 })
			: (quoteCoin ??
				coinWithBalance({
					type: quoteCoinType.type,
					balance: Math.round(amount * quoteCoinType.scalar),
				}));

		const deepCoinInput =
			deepCoin ??
			coinWithBalance({ type: deepCoinType, balance: Math.round(deepAmount * DEEP_SCALAR) });

		const minOutInput = Math.round(
			minOut * (isBaseToCoin ? quoteCoinType.scalar : baseCoinType.scalar),
		);

		const [baseCoinResult, quoteCoinResult, deepCoinResult] = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quantity`,
			arguments: [
				tx.object(pool.address),
				baseCoinInput,
				quoteCoinInput,
				deepCoinInput,
				tx.pure.u64(minOutInput),
				tx.object.clock(),
			],
			typeArguments: [baseCoinType.type, quoteCoinType.type],
		});

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
				balance: Math.round(baseAmount * baseCoinType.scalar),
			});
		const minQuoteInput = Math.round(minQuote * quoteCoinType.scalar);

		const [baseCoinResult, quoteCoinResult] = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::swap_exact_base_for_quote_with_manager`,
			arguments: [
				tx.object(pool.address),
				tx.object(balanceManager.address),
				tx.object(tradeCap),
				tx.object(depositCap),
				tx.object(withdrawCap),
				baseCoinInput,
				tx.pure.u64(minQuoteInput),
				tx.object.clock(),
			],
			typeArguments: [baseCoinType.type, quoteCoinType.type],
		});

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
				balance: Math.round(quoteAmount * quoteCoinType.scalar),
			});
		const minBaseInput = Math.round(minBase * baseCoinType.scalar);

		const [baseCoinResult, quoteCoinResult] = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quote_for_base_with_manager`,
			arguments: [
				tx.object(pool.address),
				tx.object(balanceManager.address),
				tx.object(tradeCap),
				tx.object(depositCap),
				tx.object(withdrawCap),
				quoteCoinInput,
				tx.pure.u64(minBaseInput),
				tx.object.clock(),
			],
			typeArguments: [baseCoinType.type, quoteCoinType.type],
		});

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
						balance: Math.round(amount * baseCoinType.scalar),
					}))
				: coinWithBalance({ type: baseCoinType.type, balance: 0 });

			const quoteCoinInput = isBaseToCoin
				? coinWithBalance({ type: quoteCoinType.type, balance: 0 })
				: (quoteCoin ??
					coinWithBalance({
						type: quoteCoinType.type,
						balance: Math.round(amount * quoteCoinType.scalar),
					}));

			const minOutInput = Math.round(
				minOut * (isBaseToCoin ? quoteCoinType.scalar : baseCoinType.scalar),
			);

			const [baseCoinResult, quoteCoinResult] = tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::swap_exact_quantity_with_manager`,
				arguments: [
					tx.object(pool.address),
					tx.object(balanceManager.address),
					tx.object(tradeCap),
					tx.object(depositCap),
					tx.object(withdrawCap),
					baseCoinInput,
					quoteCoinInput,
					tx.pure.u64(minOutInput),
					tx.object.clock(),
				],
				typeArguments: [baseCoinType.type, quoteCoinType.type],
			});

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

		const adjustedTickSize = Math.round((tickSize * FLOAT_SCALAR * quoteScalar) / baseScalar);
		const adjustedLotSize = Math.round(lotSize * baseScalar);
		const adjustedMinSize = Math.round(minSize * baseScalar);

		const deepCoinInput =
			deepCoin ??
			coinWithBalance({
				type: deepCoinType,
				balance: POOL_CREATION_FEE_DEEP,
			});

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::create_permissionless_pool`,
			arguments: [
				tx.object(this.#config.REGISTRY_ID), // registry_id
				tx.pure.u64(adjustedTickSize), // adjusted tick_size
				tx.pure.u64(adjustedLotSize), // adjusted lot_size
				tx.pure.u64(adjustedMinSize), // adjusted min_size
				deepCoinInput,
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::pool_trade_params`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::pool_book_params`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::account`,
			arguments: [tx.object(pool.address), tx.object(managerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::locked_balance`,
			arguments: [tx.object(pool.address), tx.object(managerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_order_deep_price`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the balance manager IDs for a given owner
	 * @param {string} owner The owner address to get balance manager IDs for
	 * @returns A function that takes a Transaction object
	 */
	getBalanceManagerIds = (owner: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::registry::get_balance_manager_ids`,
			arguments: [tx.object(this.#config.REGISTRY_ID), tx.pure.address(owner)],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_pool_referral_balances`,
			arguments: [tx.object(pool.address), tx.object(referral)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::pool_referral_multiplier`,
			arguments: [tx.object(pool.address), tx.object(referral)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::stable_pool`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::registered_pool`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the quote quantity out for a given base quantity using input token as fee
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuoteQuantityOutInputFee = (poolKey: string, baseQuantity: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_quote_quantity_out_input_fee`,
			arguments: [
				tx.object(pool.address),
				tx.pure.u64(Math.round(baseQuantity * baseCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the base quantity out for a given quote quantity using input token as fee
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getBaseQuantityOutInputFee = (poolKey: string, quoteQuantity: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_base_quantity_out_input_fee`,
			arguments: [
				tx.object(pool.address),
				tx.pure.u64(Math.round(quoteQuantity * quoteCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the quantity out for a given base or quote quantity using input token as fee
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity to convert
	 * @param {number} quoteQuantity Quote quantity to convert
	 * @returns A function that takes a Transaction object
	 */
	getQuantityOutInputFee =
		(poolKey: string, baseQuantity: number, quoteQuantity: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_quantity_out_input_fee`,
				arguments: [
					tx.object(pool.address),
					tx.pure.u64(Math.round(baseQuantity * baseCoin.scalar)),
					tx.pure.u64(Math.round(quoteQuantity * quoteCoin.scalar)),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Get the base quantity needed to receive a target quote quantity
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} targetQuoteQuantity Target quote quantity
	 * @param {boolean} payWithDeep Whether to pay fees with DEEP
	 * @returns A function that takes a Transaction object
	 */
	getBaseQuantityIn =
		(poolKey: string, targetQuoteQuantity: number, payWithDeep: boolean) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_base_quantity_in`,
				arguments: [
					tx.object(pool.address),
					tx.pure.u64(Math.round(targetQuoteQuantity * quoteCoin.scalar)),
					tx.pure.bool(payWithDeep),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Get the quote quantity needed to receive a target base quantity
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} targetBaseQuantity Target base quantity
	 * @param {boolean} payWithDeep Whether to pay fees with DEEP
	 * @returns A function that takes a Transaction object
	 */
	getQuoteQuantityIn =
		(poolKey: string, targetBaseQuantity: number, payWithDeep: boolean) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);

			return tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_quote_quantity_in`,
				arguments: [
					tx.object(pool.address),
					tx.pure.u64(Math.round(targetBaseQuantity * baseCoin.scalar)),
					tx.pure.bool(payWithDeep),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_account_order_details`,
			arguments: [tx.object(pool.address), tx.object(manager.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Get the DEEP required for an order
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} baseQuantity Base quantity
	 * @param {number} price Price
	 * @returns A function that takes a Transaction object
	 */
	getOrderDeepRequired =
		(poolKey: string, baseQuantity: number, price: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
			const inputQuantity = Math.round(baseQuantity * baseCoin.scalar);

			return tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::get_order_deep_required`,
				arguments: [tx.object(pool.address), tx.pure.u64(inputQuantity), tx.pure.u64(inputPrice)],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::account_exists`,
			arguments: [tx.object(pool.address), tx.object(manager.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::pool_trade_params_next`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::quorum`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::id`,
			arguments: [tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::can_place_limit_order`,
			arguments: [
				tx.object(pool.address),
				tx.object(manager.address),
				tx.pure.u64(inputPrice),
				tx.pure.u64(inputQuantity),
				tx.pure.bool(isBid),
				tx.pure.bool(payWithDeep),
				tx.pure.u64(expireTimestamp),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		const inputQuantity = Math.round(quantity * baseCoin.scalar);

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::can_place_market_order`,
			arguments: [
				tx.object(pool.address),
				tx.object(manager.address),
				tx.pure.u64(inputQuantity),
				tx.pure.bool(isBid),
				tx.pure.bool(payWithDeep),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Check if market order params are valid
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} quantity Quantity
	 * @returns A function that takes a Transaction object
	 */
	checkMarketOrderParams = (poolKey: string, quantity: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);

		return tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::check_market_order_params`,
			arguments: [tx.object(pool.address), tx.pure.u64(inputQuantity)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		(poolKey: string, price: number, quantity: number, expireTimestamp: number) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
			const inputQuantity = Math.round(quantity * baseCoin.scalar);

			return tx.moveCall({
				target: `${this.#config.DEEPBOOK_PACKAGE_ID}::pool::check_limit_order_params`,
				arguments: [
					tx.object(pool.address),
					tx.pure.u64(inputPrice),
					tx.pure.u64(inputQuantity),
					tx.pure.u64(expireTimestamp),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};
}
