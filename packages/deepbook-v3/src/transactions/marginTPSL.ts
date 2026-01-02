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
		(poolKey: string, triggerBelowPrice: boolean, triggerPrice: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = Math.round(
				(triggerPrice * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar,
			);
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::tpsl::new_condition`,
				arguments: [tx.pure.bool(triggerBelowPrice), tx.pure.u64(inputPrice)],
			});
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
			const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
			const inputQuantity = Math.round(quantity * baseCoin.scalar);
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::tpsl::new_pending_limit_order`,
				arguments: [
					tx.pure.u64(clientOrderId),
					tx.pure.u8(orderType),
					tx.pure.u8(selfMatchingOption),
					tx.pure.u64(inputPrice),
					tx.pure.u64(inputQuantity),
					tx.pure.bool(isBid),
					tx.pure.bool(payWithDeep),
					tx.pure.u64(expireTimestamp),
				],
			});
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
			const inputQuantity = Math.round(quantity * baseCoin.scalar);
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::tpsl::new_pending_market_order`,
				arguments: [
					tx.pure.u64(clientOrderId),
					tx.pure.u8(selfMatchingOption),
					tx.pure.u64(inputQuantity),
					tx.pure.bool(isBid),
					tx.pure.bool(payWithDeep),
				],
			});
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

		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::add_conditional_order`,
			arguments: [
				tx.object(manager.address),
				tx.object(pool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.pure.u64(conditionalOrderId),
				condition,
				pending,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::cancel_all_conditional_orders`,
			arguments: [tx.object(manager.address), tx.object.clock()],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::cancel_conditional_order`,
				arguments: [tx.object(manager.address), tx.pure.u64(conditionalOrderId), tx.object.clock()],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Execute conditional orders that have been triggered
	 * This is a permissionless function that can be called by anyone
	 * @param {string} marginManagerKey The key to identify the margin manager
	 * @param {number} maxOrdersToExecute Maximum number of orders to execute in this call
	 * @returns A function that takes a Transaction object
	 */
	executeConditionalOrders =
		(marginManagerKey: string, maxOrdersToExecute: number) => (tx: Transaction) => {
			const manager = this.#config.getMarginManager(marginManagerKey);
			const pool = this.#config.getPool(manager.poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::execute_conditional_orders`,
				arguments: [
					tx.object(manager.address),
					tx.object(pool.address),
					tx.object(baseCoin.priceInfoObjectId!),
					tx.object(quoteCoin.priceInfoObjectId!),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.pure.u64(maxOrdersToExecute),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::conditional_order_ids`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::conditional_order`,
				arguments: [tx.object(marginManagerId), tx.pure.u64(conditionalOrderId)],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::lowest_trigger_above_price`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::highest_trigger_below_price`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};
}
