// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import type {
	PlaceMarginLimitOrderParams,
	PlaceMarginMarketOrderParams,
	MarginProposalParams,
} from '../types/index.js';

import type { DeepBookConfig } from '../utils/config.js';
import { OrderType, SelfMatchingOptions } from '../types/index.js';
import { MAX_TIMESTAMP, FLOAT_SCALAR } from '../utils/config.js';
import { convertQuantity, convertPrice, convertRate } from '../utils/conversion.js';
import * as poolProxyMoveCalls from '../contracts/deepbook_margin/pool_proxy.js';

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
	 * @description Place a limit order. Enforces a post-trade `risk_ratio >=
	 * min_borrow_risk_ratio` invariant on the manager (skipped when the manager
	 * has no debt).
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
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
		return tx.add(
			poolProxyMoveCalls.placeLimitOrderV2({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: manager.address,
					pool: pool.address,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
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
	 * @description Place a market order. Enforces a post-trade `risk_ratio >=
	 * min_borrow_risk_ratio` invariant on the manager (skipped when the manager
	 * has no debt).
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
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
		return tx.add(
			poolProxyMoveCalls.placeMarketOrderV2({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: manager.address,
					pool: pool.address,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
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
	 * @description Place a reduce only limit order. Requires the manager to have
	 * debt on the relevant side; enforces a monotonic `risk_ratio_after >=
	 * risk_ratio_before` invariant so the fill cannot leak value to the
	 * counterparty.
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
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
		return tx.add(
			poolProxyMoveCalls.placeReduceOnlyLimitOrderV2({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: manager.address,
					pool: pool.address,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
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
	 * @description Place a reduce only market order. Requires the manager to
	 * have debt on the relevant side; enforces a monotonic `risk_ratio_after >=
	 * risk_ratio_before` invariant so the fill cannot leak value to the
	 * counterparty.
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
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
		return tx.add(
			poolProxyMoveCalls.placeReduceOnlyMarketOrderV2({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: manager.address,
					pool: pool.address,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
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
	 * @description Place a market order and repay the loan from the fill proceeds.
	 * The taker fill settles into the manager's balance, so the proceeds (plus any
	 * idle balance) are repaid into the debt side before the risk check; the gate
	 * is then the *net* post-repay `risk_ratio` being at least the pre-fill ratio.
	 * Unlike {@link placeMarketOrder}, which checks the post-trade ratio against
	 * `min_borrow_risk_ratio`, this lets a deleveraging fill go through in the
	 * `liquidation..min_borrow` band, where a swap alone would be rejected.
	 * @param {PlaceMarginMarketOrderParams} params Parameters for placing a market order
	 * @returns A function that takes a Transaction object
	 */
	placeMarketOrderAndRepayLoan = (params: PlaceMarginMarketOrderParams) => (tx: Transaction) => {
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
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
		return tx.add(
			poolProxyMoveCalls.placeMarketOrderAndRepayLoan({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: manager.address,
					pool: pool.address,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
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
	 * @description Place a reduce only limit order and repay the loan from the
	 * fill proceeds. Requires debt on the relevant side (a bid needs base debt; an
	 * ask needs quote debt and sells at most the gross base held); the repay
	 * happens before the monotonic `risk_ratio` gate, so the check is on the net
	 * post-repay ratio.
	 * @param {PlaceMarginLimitOrderParams} params Parameters for placing a reduce only limit order
	 * @returns A function that takes a Transaction object
	 */
	placeReduceOnlyLimitOrderAndRepayLoan =
		(params: PlaceMarginLimitOrderParams) => (tx: Transaction) => {
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
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
			const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
			return tx.add(
				poolProxyMoveCalls.placeReduceOnlyLimitOrderAndRepayLoan({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						registry: this.#config.MARGIN_REGISTRY_ID,
						marginManager: manager.address,
						pool: pool.address,
						baseMarginPool: baseMarginPool.address,
						quoteMarginPool: quoteMarginPool.address,
						baseOracle: baseCoin.priceInfoObjectId!,
						quoteOracle: quoteCoin.priceInfoObjectId!,
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
	 * @description Place a reduce only market order and repay the loan from the
	 * fill proceeds. Same reduce-only direction guard as
	 * {@link placeReduceOnlyMarketOrder}, but the settled proceeds are repaid into
	 * the debt side before the monotonic `risk_ratio` gate, so the check is on the
	 * net post-repay ratio.
	 * @param {PlaceMarginMarketOrderParams} params Parameters for placing a reduce only market order
	 * @returns A function that takes a Transaction object
	 */
	placeReduceOnlyMarketOrderAndRepayLoan =
		(params: PlaceMarginMarketOrderParams) => (tx: Transaction) => {
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
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
			return tx.add(
				poolProxyMoveCalls.placeReduceOnlyMarketOrderAndRepayLoan({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						registry: this.#config.MARGIN_REGISTRY_ID,
						marginManager: manager.address,
						pool: pool.address,
						baseMarginPool: baseMarginPool.address,
						quoteMarginPool: quoteMarginPool.address,
						baseOracle: baseCoin.priceInfoObjectId!,
						quoteOracle: quoteCoin.priceInfoObjectId!,
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
			const inputQuantity = convertQuantity(newQuantity, baseCoin.scalar);

			tx.add(
				poolProxyMoveCalls.modifyOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						registry: this.#config.MARGIN_REGISTRY_ID,
						marginManager: marginManager.address,
						pool: pool.address,
						orderId: BigInt(orderId),
						newQuantity: inputQuantity,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
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
		tx.add(
			poolProxyMoveCalls.cancelOrder({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
					orderId: BigInt(orderId),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolProxyMoveCalls.cancelOrders({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
					orderIds: orderIds.map(BigInt),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolProxyMoveCalls.cancelAllOrders({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolProxyMoveCalls.withdrawSettledAmounts({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		const stakeInput = convertQuantity(stakeAmount, deepCoin.scalar);
		tx.add(
			poolProxyMoveCalls.stake({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
					amount: stakeInput,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolProxyMoveCalls.unstake({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Submit a proposal
	 * @param {string} marginManagerKey The key to identify the MarginManager
	 * @param {MarginProposalParams} params Parameters for the proposal
	 * @returns A function that takes a Transaction object
	 */
	submitProposal =
		(marginManagerKey: string, params: MarginProposalParams) => (tx: Transaction) => {
			const { takerFee, makerFee, stakeRequired } = params;
			const marginManager = this.#config.getMarginManager(marginManagerKey);
			const pool = this.#config.getPool(marginManager.poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const stakeInput = convertRate(stakeRequired, FLOAT_SCALAR);
			const takerFeeInput = convertRate(takerFee, FLOAT_SCALAR);
			const makerFeeInput = convertRate(makerFee, FLOAT_SCALAR);
			tx.add(
				poolProxyMoveCalls.submitProposal({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						registry: this.#config.MARGIN_REGISTRY_ID,
						marginManager: marginManager.address,
						pool: pool.address,
						takerFee: takerFeeInput,
						makerFee: makerFeeInput,
						stakeRequired: stakeInput,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
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
		tx.add(
			poolProxyMoveCalls.vote({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
					proposalId,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
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
		tx.add(
			poolProxyMoveCalls.claimRebates({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginManager: marginManager.address,
					pool: pool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Withdraw settled amounts permissionlessly for a margin manager by ID
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The object ID of the MarginManager
	 * @returns A function that takes a Transaction object
	 */
	withdrawMarginSettledAmounts =
		(poolKey: string, marginManagerId: string) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			tx.add(
				poolProxyMoveCalls.withdrawSettledAmountsPermissionless({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						registry: this.#config.MARGIN_REGISTRY_ID,
						marginManager: marginManagerId,
						pool: pool.address,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Update the current price for a pool using Pyth oracle
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	updateCurrentPrice = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		if (!baseCoin.priceInfoObjectId) {
			throw new Error(`Missing priceInfoObjectId for ${pool.baseCoin}`);
		}
		if (!quoteCoin.priceInfoObjectId) {
			throw new Error(`Missing priceInfoObjectId for ${pool.quoteCoin}`);
		}
		tx.add(
			poolProxyMoveCalls.updateCurrentPrice({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					registry: this.#config.MARGIN_REGISTRY_ID,
					pool: pool.address,
					basePriceInfoObject: baseCoin.priceInfoObjectId,
					quotePriceInfoObject: quoteCoin.priceInfoObjectId,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};
}
