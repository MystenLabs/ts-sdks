// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import type {
	PlaceMarginLimitOrderParams,
	PlaceMarginMarketOrderParams,
	ProposalParams,
} from '../types/index.js';

import type { DeepBookConfig } from '../utils/config.js';
import { OrderType, SelfMatchingOptions } from '../types/index.js';
import { MAX_TIMESTAMP, FLOAT_SCALAR } from '../utils/config.js';

/**
 * PoolProxyContract class for managing PoolProxy operations.
 */
export class PoolProxyContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for PoolProxyContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Place a limit order
	 * @param {PlaceMarginLimitOrderParams} params Parameters for placing a limit order
	 * @returns A function that takes a Transaction object
	 */
	placeLimitOrder = (params: PlaceMarginLimitOrderParams) => (tx: Transaction) => {
		const {
			poolKey,
			marginManagerKey,
			clientOrderId,
			price,
			quantity,
			isBid,
			expiration = MAX_TIMESTAMP,
			orderType = OrderType.NO_RESTRICTION,
			selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			payWithDeep = true,
		} = params;
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getMarginManager(marginManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::place_limit_order`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(manager.address),
				tx.object(pool.address),
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
	 * @param {PlaceMarginMarketOrderParams} params Parameters for placing a market order
	 * @returns A function that takes a Transaction object
	 */
	placeMarketOrder = (params: PlaceMarginMarketOrderParams) => (tx: Transaction) => {
		const {
			poolKey,
			marginManagerKey,
			clientOrderId,
			quantity,
			isBid,
			selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			payWithDeep = true,
		} = params;
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getMarginManager(marginManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::place_market_order`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(manager.address),
				tx.object(pool.address),
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
	 * @description Place a reduce only limit order
	 * @param {PlaceMarginLimitOrderParams} params Parameters for placing a reduce only limit order
	 * @returns A function that takes a Transaction object
	 */
	placeReduceOnlyLimitOrder = (params: PlaceMarginLimitOrderParams) => (tx: Transaction) => {
		const {
			poolKey,
			marginManagerKey,
			clientOrderId,
			price,
			quantity,
			isBid,
			expiration = MAX_TIMESTAMP,
			orderType = OrderType.NO_RESTRICTION,
			selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			payWithDeep = true,
		} = params;
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getMarginManager(marginManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputPrice = Math.round((price * FLOAT_SCALAR * quoteCoin.scalar) / baseCoin.scalar);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);
		const marginPool = isBid
			? this.#config.getMarginPool(pool.baseCoin)
			: this.#config.getMarginPool(pool.quoteCoin);
		const debtType = isBid ? baseCoin.type : quoteCoin.type;
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::place_reduce_only_limit_order`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(manager.address),
				tx.object(pool.address),
				tx.object(marginPool.address),
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
			typeArguments: [baseCoin.type, quoteCoin.type, debtType],
		});
	};

	/**
	 * @description Place a reduce only market order
	 * @param {PlaceMarginMarketOrderParams} params Parameters for placing a reduce only market order
	 * @returns A function that takes a Transaction object
	 */
	placeReduceOnlyMarketOrder = (params: PlaceMarginMarketOrderParams) => (tx: Transaction) => {
		const {
			poolKey,
			marginManagerKey,
			clientOrderId,
			quantity,
			isBid,
			selfMatchingOption = SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			payWithDeep = true,
		} = params;
		const pool = this.#config.getPool(poolKey);
		const manager = this.#config.getMarginManager(marginManagerKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = Math.round(quantity * baseCoin.scalar);
		const marginPool = isBid
			? this.#config.getMarginPool(pool.baseCoin)
			: this.#config.getMarginPool(pool.quoteCoin);
		const debtType = isBid ? baseCoin.type : quoteCoin.type;
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::place_reduce_only_market_order`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(manager.address),
				tx.object(pool.address),
				tx.object(marginPool.address),
				tx.pure.u64(clientOrderId),
				tx.pure.u8(selfMatchingOption),
				tx.pure.u64(inputQuantity),
				tx.pure.bool(isBid),
				tx.pure.bool(payWithDeep),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, debtType],
		});
	};

	/**
	 * @description Modify an existing order
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {string} orderId Order ID to modify
	 * @param {number} newQuantity New quantity for the order
	 * @returns A function that takes a Transaction object
	 */
	modifyOrder =
		(marginManagerKey: string, orderId: string, newQuantity: number) => (tx: Transaction) => {
			const marginManager = this.#config.getMarginManager(marginManagerKey);
			const pool = this.#config.getPool(marginManager.poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputQuantity = Math.round(newQuantity * baseCoin.scalar);

			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::modify_order`,
				arguments: [
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.object(marginManager.address),
					tx.object(pool.address),
					tx.pure.u128(orderId),
					tx.pure.u64(inputQuantity),
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
		};

	/**
	 * @description Cancel an existing order
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {string} orderId Order ID to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelOrder = (marginManagerKey: string, orderId: string) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::cancel_order`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
				tx.pure.u128(orderId),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Cancel multiple existing orders
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {string[]} orderIds Order IDs to cancel
	 * @returns A function that takes a Transaction object
	 */
	cancelOrders = (marginManagerKey: string, orderIds: string[]) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::cancel_orders`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
				tx.pure.vector('u128', orderIds),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Cancel all existing orders
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @returns A function that takes a Transaction object
	 */
	cancelAllOrders = (marginManagerKey: string) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::cancel_all_orders`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Withdraw settled amounts
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @returns A function that takes a Transaction object
	 */
	withdrawSettledAmounts = (marginManagerKey: string) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::withdraw_settled_amounts`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Stake in the pool
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {number} stakeAmount The amount to stake
	 * @returns A function that takes a Transaction object
	 */
	stake = (marginManagerKey: string, stakeAmount: number) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const deepCoin = this.#config.getCoin('DEEP');
		const stakeInput = Math.round(stakeAmount * deepCoin.scalar);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::stake`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
				tx.pure.u64(stakeInput),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Unstake from the pool
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @returns A function that takes a Transaction object
	 */
	unstake = (marginManagerKey: string) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::unstake`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Submit a proposal
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {ProposalParams} params Parameters for the proposal
	 * @returns A function that takes a Transaction object
	 */
	submitProposal = (marginManagerKey: string, params: ProposalParams) => (tx: Transaction) => {
		const { takerFee, makerFee, stakeRequired } = params;
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const stakeInput = Math.round(stakeRequired * FLOAT_SCALAR);
		const takerFeeInput = Math.round(takerFee * FLOAT_SCALAR);
		const makerFeeInput = Math.round(makerFee * FLOAT_SCALAR);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::submit_proposal`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
				tx.pure.u64(takerFeeInput),
				tx.pure.u64(makerFeeInput),
				tx.pure.u64(stakeInput),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Vote on a proposal
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {string} proposalId The ID of the proposal to vote on
	 * @returns A function that takes a Transaction object
	 */
	vote = (marginManagerKey: string, proposalId: string) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::vote`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
				tx.pure.id(proposalId),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};

	/**
	 * @description Claim a rebate from a pool
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @returns A function that takes a Transaction object
	 */
	claimRebate = (marginManagerKey: string) => (tx: Transaction) => {
		const marginManager = this.#config.getMarginManager(marginManagerKey);
		const pool = this.#config.getPool(marginManager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::pool_proxy::claim_rebate`,
			arguments: [
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(marginManager.address),
				tx.object(pool.address),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};
}
