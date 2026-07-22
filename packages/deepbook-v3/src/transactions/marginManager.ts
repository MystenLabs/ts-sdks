// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import type { DepositParams, DepositDuringInitParams } from '../types/index.js';
import { FLOAT_SCALAR } from '../utils/config.js';
import { convertPrice, convertQuantity } from '../utils/conversion.js';
import * as marginManagerMoveCalls from '../contracts/deepbook_margin/margin_manager.js';

/**
 * MarginManagerContract class for managing MarginManager operations.
 */
export class MarginManagerContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginManagerContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Create a new margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	newMarginManager = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginManagerMoveCalls._new({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					pool: pool.address,
					deepbookRegistry: this.#config.REGISTRY_ID,
					marginRegistry: this.#config.MARGIN_REGISTRY_ID,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Create a new margin manager with an initializer
	 * @param {string} poolKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	newMarginManagerWithInitializer = (poolKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const [manager, initializer] = tx.add(
			marginManagerMoveCalls.newWithInitializer({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					pool: pool.address,
					deepbookRegistry: this.#config.REGISTRY_ID,
					marginRegistry: this.#config.MARGIN_REGISTRY_ID,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
		return { manager, initializer };
	};

	/**
	 * @description Share a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {TransactionArgument} manager The margin manager to share
	 * @param {TransactionArgument} initializer The initializer for the manager
	 * @returns A function that takes a Transaction object
	 */
	shareMarginManager =
		(poolKey: string, manager: TransactionArgument, initializer: TransactionArgument) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			tx.add(
				marginManagerMoveCalls.share({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: { manager, initializer },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Register a margin manager back to the margin registry. Lets
	 * owners restore visibility of a manager that was unregistered by another
	 * platform.
	 * @param {string} managerKey The key to identify the margin manager
	 * @returns A function that takes a Transaction object
	 */
	registerMarginManager = (managerKey: string) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginManagerMoveCalls.registerMarginManager({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: manager.address, marginRegistry: this.#config.MARGIN_REGISTRY_ID },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Unregister a margin manager from the margin registry. Aborts
	 * if the manager holds any outstanding debt or base/quote/DEEP balance.
	 * @param {string} managerKey The key to identify the margin manager
	 * @returns A function that takes a Transaction object
	 */
	unregisterMarginManager = (managerKey: string) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		tx.add(
			marginManagerMoveCalls.unregisterMarginManager({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: manager.address, marginRegistry: this.#config.MARGIN_REGISTRY_ID },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Deposit into a margin manager during initialization (before sharing).
	 * Use this when you need to deposit funds into a newly created manager in the same transaction.
	 * @param {DepositDuringInitParams} params The deposit parameters
	 * @returns A function that takes a Transaction object
	 */
	depositDuringInitialization = (params: DepositDuringInitParams) => (tx: Transaction) => {
		const { manager, poolKey, coinType } = params;
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		// Get the deposit coin from config using the coinType key (e.g., 'SUI', 'DBUSDC', 'DEEP')
		const depositCoin = this.#config.getCoin(coinType);

		// If amount is provided, create a coin with balance; otherwise use the provided coin
		const coin =
			'amount' in params && params.amount !== undefined
				? coinWithBalance({
						type: depositCoin.type,
						balance: convertQuantity(params.amount, depositCoin.scalar),
					})
				: params.coin;

		tx.add(
			marginManagerMoveCalls.deposit({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					coin,
				},
				typeArguments: [baseCoin.type, quoteCoin.type, depositCoin.type],
			}),
		);
	};

	/**
	 * @description Deposit base into a margin manager
	 * @param {DepositParams} params The deposit parameters
	 * @returns A function that takes a Transaction object
	 */
	depositBase = (params: DepositParams) => (tx: Transaction) => {
		const { managerKey } = params;
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const coin =
			'amount' in params && params.amount !== undefined
				? coinWithBalance({
						type: baseCoin.type,
						balance: convertQuantity(params.amount, baseCoin.scalar),
					})
				: params.coin;
		tx.add(
			marginManagerMoveCalls.deposit({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					coin,
				},
				typeArguments: [baseCoin.type, quoteCoin.type, baseCoin.type],
			}),
		);
	};

	/**
	 * @description Deposit quote into a margin manager
	 * @param {DepositParams} params The deposit parameters
	 * @returns A function that takes a Transaction object
	 */
	depositQuote = (params: DepositParams) => (tx: Transaction) => {
		const { managerKey } = params;
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const coin =
			'amount' in params && params.amount !== undefined
				? coinWithBalance({
						type: quoteCoin.type,
						balance: convertQuantity(params.amount, quoteCoin.scalar),
					})
				: params.coin;
		tx.add(
			marginManagerMoveCalls.deposit({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					coin,
				},
				typeArguments: [baseCoin.type, quoteCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Deposit deep into a margin manager
	 * @param {DepositParams} params The deposit parameters
	 * @returns A function that takes a Transaction object
	 */
	depositDeep = (params: DepositParams) => (tx: Transaction) => {
		const { managerKey } = params;
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const deepCoin = this.#config.getCoin('DEEP');
		const coin =
			'amount' in params && params.amount !== undefined
				? coinWithBalance({
						type: deepCoin.type,
						balance: convertQuantity(params.amount, deepCoin.scalar),
					})
				: params.coin;
		tx.add(
			marginManagerMoveCalls.deposit({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					coin,
				},
				typeArguments: [baseCoin.type, quoteCoin.type, deepCoin.type],
			}),
		);
	};

	/**
	 * @description Withdraw base from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawBase = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.withdraw({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					pool: pool.address,
					withdrawAmount: convertQuantity(amount, baseCoin.scalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type, baseCoin.type],
			}),
		);
	};

	/**
	 * @description Withdraw quote from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawQuote = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.withdraw({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					pool: pool.address,
					withdrawAmount: convertQuantity(amount, quoteCoin.scalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Withdraw deep from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawDeep = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const deepCoin = this.#config.getCoin('DEEP');
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.withdraw({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					pool: pool.address,
					withdrawAmount: convertQuantity(amount, deepCoin.scalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type, deepCoin.type],
			}),
		);
	};

	/**
	 * @description Borrow base from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowBase = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		return tx.add(
			marginManagerMoveCalls.borrowBase({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseMarginPool: baseMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					pool: pool.address,
					loanAmount: convertQuantity(amount, baseCoin.scalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Borrow quote from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowQuote = (managerKey: string, amount: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.borrowQuote({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					quoteMarginPool: quoteMarginPool.address,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					pool: pool.address,
					loanAmount: convertQuantity(amount, quoteCoin.scalar),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Repay base from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to repay
	 * @returns A function that takes a Transaction object
	 */
	repayBase = (managerKey: string, amount?: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		return tx.add(
			marginManagerMoveCalls.repayBase({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginPool: baseMarginPool.address,
					amount: amount !== undefined ? convertQuantity(amount, baseCoin.scalar) : null,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Repay quote from a margin manager
	 * @param {string} managerKey The key to identify the manager
	 * @param {number} amount The amount to repay
	 * @returns A function that takes a Transaction object
	 */
	repayQuote = (managerKey: string, amount?: number) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.repayQuote({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: manager.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					marginPool: quoteMarginPool.address,
					amount: amount !== undefined ? convertQuantity(amount, quoteCoin.scalar) : null,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Liquidate a margin manager
	 * @param {string} managerAddress The address of the manager to liquidate
	 * @param {string} poolKey The key to identify the pool
	 * @param {boolean} debtIsBase Whether the debt is in base
	 * @param {TransactionArgument} repayCoin The coin to repay
	 * @returns A function that takes a Transaction object
	 */
	liquidate =
		(
			managerAddress: string,
			poolKey: string,
			debtIsBase: boolean,
			repayCoin: TransactionArgument,
		) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
			const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
			const marginPool = debtIsBase ? baseMarginPool : quoteMarginPool;
			return tx.add(
				marginManagerMoveCalls.liquidate({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: managerAddress,
						registry: this.#config.MARGIN_REGISTRY_ID,
						baseOracle: baseCoin.priceInfoObjectId!,
						quoteOracle: quoteCoin.priceInfoObjectId!,
						marginPool: marginPool.address,
						pool: pool.address,
						repayCoin,
					},
					typeArguments: [
						baseCoin.type,
						quoteCoin.type,
						debtIsBase ? baseCoin.type : quoteCoin.type,
					],
				}),
			);
		};

	/**
	 * @description Set the referral for a margin manager (DeepBookPoolReferral)
	 * @param {string} managerKey The key to identify the margin manager
	 * @param {string} referral The referral (DeepBookPoolReferral) to set
	 * @returns A function that takes a Transaction object
	 */
	setMarginManagerReferral = (managerKey: string, referral: string) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(manager.poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			marginManagerMoveCalls.setMarginManagerReferral({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: manager.address, referralCap: referral },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Unset the referral for a margin manager
	 * @param {string} managerKey The key to identify the margin manager
	 * @param {string} poolKey The key of the pool to unset the referral for
	 * @returns A function that takes a Transaction object
	 */
	unsetMarginManagerReferral = (managerKey: string, poolKey: string) => (tx: Transaction) => {
		const manager = this.#config.getMarginManager(managerKey);
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			marginManagerMoveCalls.unsetMarginManagerReferral({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: manager.address, poolId: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	// === Read-Only Functions ===

	/**
	 * @description Get the owner address of a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	ownerByPoolKey = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.owner({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the DeepBook pool ID associated with a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	deepbookPool = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.deepbookPool({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the margin pool ID (if any) associated with a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	marginPoolId = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.marginPoolId({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get borrowed shares for both base and quote assets
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	borrowedShares = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.borrowedShares({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get borrowed base shares
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	borrowedBaseShares = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.borrowedBaseShares({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get borrowed quote shares
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	borrowedQuoteShares = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.borrowedQuoteShares({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if margin manager has base asset debt
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	hasBaseDebt = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.hasBaseDebt({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the balance manager ID for a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	balanceManager = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.balanceManager({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Calculate assets (base and quote) for a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	calculateAssets = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.calculateAssets({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Calculate debts (base and quote) for a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} coinKey The key to identify the debt coin (base or quote)
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	calculateDebts =
		(poolKey: string, coinKey: string, marginManagerId: string) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const debtCoin = this.#config.getCoin(coinKey);
			const marginPool = this.#config.getMarginPool(coinKey);
			return tx.add(
				marginManagerMoveCalls.calculateDebts({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: { self: marginManagerId, marginPool: marginPool.address },
					typeArguments: [baseCoin.type, quoteCoin.type, debtCoin.type],
				}),
			);
		};

	/**
	 * @description Get comprehensive state information for a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 * @returns Returns (manager_id, deepbook_pool_id, risk_ratio, base_asset, quote_asset,
	 *                   base_debt, quote_debt, base_pyth_price, base_pyth_decimals,
	 *                   quote_pyth_price, quote_pyth_decimals)
	 */
	managerState = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const baseMarginPool = this.#config.getMarginPool(pool.baseCoin);
		const quoteMarginPool = this.#config.getMarginPool(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.managerState({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: marginManagerId,
					registry: this.#config.MARGIN_REGISTRY_ID,
					baseOracle: baseCoin.priceInfoObjectId!,
					quoteOracle: quoteCoin.priceInfoObjectId!,
					pool: pool.address,
					baseMarginPool: baseMarginPool.address,
					quoteMarginPool: quoteMarginPool.address,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the base asset balance of a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	baseBalance = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.baseBalance({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the quote asset balance of a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	quoteBalance = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.quoteBalance({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the DEEP token balance of a margin manager
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	deepBalance = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.deepBalance({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the underlying BalanceManager ID for a margin manager.
	 * Returns an ID (not a `&BalanceManager`), so it composes in PTBs unlike
	 * `balanceManager`.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	balanceManagerId = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.balanceManagerId({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the BalanceManager referral ID for a pool (Option<ID>).
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	getBalanceManagerReferralId = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.getBalanceManagerReferralId({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, poolId: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check if the margin manager's account exists in the pool.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	accountExists = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.accountExists({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the pool account data for the margin manager.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	account = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.account({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get the open order IDs for the margin manager's account in
	 * the pool.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	accountOpenOrders = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.accountOpenOrders({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get full order details for the margin manager's account in
	 * the pool.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	getAccountOrderDetails = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.getAccountOrderDetails({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Get locked balances (base, quote, deep) for the margin
	 * manager's account in the pool.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @returns A function that takes a Transaction object
	 */
	lockedBalance = (poolKey: string, marginManagerId: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		return tx.add(
			marginManagerMoveCalls.lockedBalance({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginManagerId, pool: pool.address },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Check whether a limit order can be placed given the
	 * manager's current state.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @param {number | bigint} price Limit price
	 * @param {number | bigint} quantity Order quantity (base units)
	 * @param {boolean} isBid True for bid, false for ask
	 * @param {boolean} payWithDeep Whether to pay fees in DEEP
	 * @param {number | bigint} expireTimestamp Order expiration timestamp (ms)
	 * @returns A function that takes a Transaction object
	 */
	canPlaceLimitOrder =
		(
			poolKey: string,
			marginManagerId: string,
			price: number | bigint,
			quantity: number | bigint,
			isBid: boolean,
			payWithDeep: boolean,
			expireTimestamp: number | bigint,
		) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputPrice = convertPrice(price, FLOAT_SCALAR, quoteCoin.scalar, baseCoin.scalar);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
			return tx.add(
				marginManagerMoveCalls.canPlaceLimitOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginManagerId,
						pool: pool.address,
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
	 * @description Check whether a market order can be placed given the
	 * manager's current state.
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} marginManagerId The ID of the margin manager
	 * @param {number | bigint} quantity Order quantity (base units)
	 * @param {boolean} isBid True for bid, false for ask
	 * @param {boolean} payWithDeep Whether to pay fees in DEEP
	 * @returns A function that takes a Transaction object
	 */
	canPlaceMarketOrder =
		(
			poolKey: string,
			marginManagerId: string,
			quantity: number | bigint,
			isBid: boolean,
			payWithDeep: boolean,
		) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const inputQuantity = convertQuantity(quantity, baseCoin.scalar);
			return tx.add(
				marginManagerMoveCalls.canPlaceMarketOrder({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginManagerId,
						pool: pool.address,
						quantity: inputQuantity,
						isBid,
						payWithDeep,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};
}
