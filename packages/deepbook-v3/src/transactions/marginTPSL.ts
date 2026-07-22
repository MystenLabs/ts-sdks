// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type {
	PendingLimitOrderParams,
	PendingMarketOrderParams,
	AddConditionalOrderParams,
} from '../types/index.js';
import { OrderType, SelfMatchingOptions } from '../types/index.js';
import { MAX_TIMESTAMP, FLOAT_SCALAR } from '../utils/config.js';
import { convertQuantity, convertPrice } from '../utils/conversion.js';
import * as marginManagerMoveCalls from '../contracts/deepbook_margin/margin_manager.js';
import * as tpslMoveCalls from '../contracts/deepbook_margin/tpsl.js';

/**
 * MarginTPSLContract class for managing Take Profit / Stop Loss operations.
 */
export class MarginTPSLContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginTPSLContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	// === Helper Functions ===

	/**
	 * @description Create a new condition for a conditional order
	 * @param {string} poolKey The key to identify the pool
	 * @param {boolean} triggerBelowPrice Whether to trigger when price is below trigger price
	 * @param {number} triggerPrice The price at which to trigger the order
	 * @returns A function that takes a Transaction object
	 */
	newCondition =
		(poolKey: string, triggerBelowPrice: boolean, triggerPrice: number | bigint) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = convertPrice(
				triggerPrice,
				FLOAT_SCALAR,
				quoteCoin.scalar,
				baseCoin.scalar,
			);
			return tx.add(
				tpslMoveCalls.newCondition({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: { triggerBelowPrice, triggerPrice: inputPrice },
				}),
			);
		};

	/**
	 * @description Create a new pending limit order for use in conditional orders
	 * @param {string} poolKey The key to identify the pool
	 * @param {PendingLimitOrderParams} params Parameters for the pending limit order
	 * @returns A function that takes a Transaction object
	 */
	newPendingLimitOrder =
		(poolKey: string, params: PendingLimitOrderParams) => (tx: Transaction) => {
			const {
				clientOrderId,
				orderType = OrderType.NO_RESTRICTION,
				selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
				price,
				quantity,
				isBid,
				payWithDeep = true,
				expireTimestamp = MAX_TIMESTAMP,
			} = params;
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
			return tx.add(
				tpslMoveCalls.newPendingLimitOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						clientOrderId: BigInt(clientOrderId),
						orderType,
						selfMatchingOption,
						price: inputPrice,
						quantity: inputQuantity,
						isBid,
						payWithDeep,
						expireTimestamp,
					},
				}),
			);
		};

	/**
	 * @description Create a new pending market order for use in conditional orders
	 * @param {string} poolKey The key to identify the pool
	 * @param {PendingMarketOrderParams} params Parameters for the pending market order
	 * @returns A function that takes a Transaction object
	 */
	newPendingMarketOrder =
		(poolKey: string, params: PendingMarketOrderParams) => (tx: Transaction) => {
			const {
				clientOrderId,
				selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
				quantity,
				isBid,
				payWithDeep = true,
			} = params;
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
			return tx.add(
				tpslMoveCalls.newPendingMarketOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						clientOrderId: BigInt(clientOrderId),
						selfMatchingOption,
						quantity: inputQuantity,
						isBid,
						payWithDeep,
					},
				}),
			);
		};

	// === Public Functions ===

	/**
	 * @description Add a conditional order (take profit or stop loss)
	 * @param {AddConditionalOrderParams} params Parameters for adding the conditional order
	 * @returns A function that takes a Transaction object
	 */
	addConditionalOrder = (params: AddConditionalOrderParams) => (tx: Transaction) => {
		const { marginManagerKey, conditionalOrderId, triggerBelowPrice, triggerPrice, pendingOrder } =
			params;
		const manager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		// Create condition
		const condition = this.newCondition(manager.poolKey, triggerBelowPrice, triggerPrice)(tx);

		// Create pending order based on type
		const isLimitOrder = 'price' in pendingOrder;
		const pending = isLimitOrder
			? this.newPendingLimitOrder(manager.poolKey, pendingOrder as PendingLimitOrderParams)(tx)
			: this.newPendingMarketOrder(manager.poolKey, pendingOrder as PendingMarketOrderParams)(tx);

		tx.add(
			marginManagerMoveCalls.addConditionalOrder({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					pool: pool.address,
					basePriceInfoObject: baseCoin.priceInfoObjectId!,
					quotePriceInfoObject: quoteCoin.priceInfoObjectId!,
					registry: this.#config.MARGIN_REGISTRY_ID,
					conditionalOrderId: BigInt(conditionalOrderId),
					condition,
					pendingOrder: pending,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Cancel all conditional orders for a margin manager
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @returns A function that takes a Transaction object
	 */
	cancelAllConditionalOrders = (marginManagerKey: string) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginManagerMoveCalls.cancelAllConditionalOrders({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: manager.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Cancel a specific conditional order
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {string} conditionalOrderId The ID of the conditional order to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelConditionalOrder =
		(marginManagerKey: string, conditionalOrderId: string) => (tx: Transaction) => {
			const manager = this.#config.getMarginManager(marginManagerKey);
			const pool = this.#config.getPool(manager.poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			tx.add(
				marginManagerMoveCalls.cancelConditionalOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: { self: manager.address, conditionalOrderId: BigInt(conditionalOrderId) },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Execute conditional orders that have been triggered.
	 * Permissionless — anyone can call this. After the inner fill loop, the
	 * manager's post-trade `risk_ratio` is checked against
	 * `min_borrow_risk_ratio`; if any triggered fill breaches that floor, the
	 * whole txn aborts (no partial-state landing).
	 * @param {string} managerAddress The address of the margin manager
	 * @param {string} poolKey The key to identify the pool (e.g., 'SUI_USDC')
	 * @param {number} maxOrdersToExecute Maximum number of orders to execute in this call
	 * @returns A function that takes a Transaction object
	 */
	executeConditionalOrders =
		(managerAddress: string, poolKey: string, maxOrdersToExecute: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
			return tx.add(
				marginManagerMoveCalls.executeConditionalOrdersV2({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: managerAddress,
						pool: pool.address,
						baseMarginPool: baseMarginPool.address,
						quoteMarginPool: quoteMarginPool.address,
						basePriceInfoObject: baseCoin.priceInfoObjectId!,
						quotePriceInfoObject: quoteCoin.priceInfoObjectId!,
						registry: this.#config.MARGIN_REGISTRY_ID,
						maxOrdersToExecute,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Execute conditional orders, deleveraging on each market-type
	 * fill. Permissionless, with the same trigger and cancellation handling as
	 * {@link executeConditionalOrders}, but the market proceeds are repaid into
	 * the loan before the risk check, and the gate is the *net* post-repay
	 * `risk_ratio` being at least the pre-fill ratio.
	 *
	 * This is what lets a stop-loss fire in the `liquidation..min_borrow` danger
	 * band: a swap alone only lowers the oracle-valued ratio (so the v2
	 * borrow-floor gate rejects it), while repaying actually improves it. If a
	 * single triggered fill would worsen net solvency the whole txn aborts — no
	 * partial-state landing.
	 * @param {string} managerAddress The address of the margin manager
	 * @param {string} poolKey The key to identify the pool (e.g., 'SUI_USDC')
	 * @param {number} maxOrdersToExecute Maximum number of orders to execute in this call
	 * @returns A function that takes a Transaction object
	 */
	executeConditionalOrdersV3 =
		(managerAddress: string, poolKey: string, maxOrdersToExecute: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
			return tx.add(
				marginManagerMoveCalls.executeConditionalOrdersV3({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: managerAddress,
						pool: pool.address,
						baseMarginPool: baseMarginPool.address,
						quoteMarginPool: quoteMarginPool.address,
						basePriceInfoObject: baseCoin.priceInfoObjectId!,
						quotePriceInfoObject: quoteCoin.priceInfoObjectId!,
						registry: this.#config.MARGIN_REGISTRY_ID,
						maxOrdersToExecute,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	// === Read-Only Functions ===

	/**
	 * @description Get all conditional order IDs for a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	conditionalOrderIds = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.conditionalOrderIds({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get a specific conditional order by ID
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @param {string} conditionalOrderId The ID of the conditional order
	 * @returns A function that takes a Transaction object
	 */
	conditionalOrder =
		(poolKey: string, marginManagerId: string, conditionalOrderId: string) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			return tx.add(
				marginManagerMoveCalls.conditionalOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: { self: marginManagerId, conditionalOrderId: BigInt(conditionalOrderId) },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Get the lowest trigger price for trigger_above orders
	 * Returns constants::max_u64() if there are no trigger_above orders
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	lowestTriggerAbovePrice = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.lowestTriggerAbovePrice({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the highest trigger price for trigger_below orders
	 * Returns 0 if there are no trigger_below orders
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	highestTriggerBelowPrice = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.highestTriggerBelowPrice({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};
}
