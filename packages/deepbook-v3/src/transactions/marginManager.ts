// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { coinWithBalance } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';

/**
 * Parameters for depositing into a margin manager.
 * Either `amount` (number) or `coin` (TransactionArgument) must be provided, but not both.
 */
export type DepositParams = {
	managerKey: string;
} & ({ amount: number; coin?: never } | { amount?: never; coin: TransactionArgument });

/**
 * Parameters for depositing during margin manager initialization.
 * Either (`coinType` + `amount`) or (`coinType` + `coin`) must be provided.
 * `coinType` should be a coin key from config (e.g., 'SUI', 'DBUSDC', 'DEEP').
 */
export type DepositDuringInitParams = {
	manager: TransactionArgument;
	poolKey: string;
	coinType: string;
} & ({ amount: number; coin?: never } | { amount?: never; coin: TransactionArgument });

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
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::new`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#config.REGISTRY_ID),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		const [manager, initializer] = tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::new_with_initializer`,
			arguments: [
				tx.object(pool.address),
				tx.object(this.#config.REGISTRY_ID),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::share`,
				arguments: [manager, initializer],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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
						balance: Math.round(params.amount * depositCoin.scalar),
					})
				: params.coin;

		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [
				manager,
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				coin,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, depositCoin.type],
		});
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
						balance: Math.round(params.amount * baseCoin.scalar),
					})
				: params.coin;
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				coin,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, baseCoin.type],
		});
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
						balance: Math.round(params.amount * quoteCoin.scalar),
					})
				: params.coin;
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				coin,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, quoteCoin.type],
		});
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
						balance: Math.round(params.amount * deepCoin.scalar),
					})
				: params.coin;
		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deposit`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				coin,
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, deepCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::withdraw`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(Math.round(amount * baseCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, baseCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::withdraw`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(Math.round(amount * quoteCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::withdraw`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(Math.round(amount * deepCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type, deepCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrow_base`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(Math.round(amount * baseCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrow_quote`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(quoteMarginPool.address),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.pure.u64(Math.round(amount * quoteCoin.scalar)),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::repay_base`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseMarginPool.address),
				tx.object.option({
					type: 'u64',
					value: amount ? tx.pure.u64(Math.round(amount * baseCoin.scalar)) : null,
				}),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::repay_quote`,
			arguments: [
				tx.object(manager.address),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(quoteMarginPool.address),
				tx.object.option({
					type: 'u64',
					value: amount ? tx.pure.u64(Math.round(amount * quoteCoin.scalar)) : null,
				}),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::liquidate`,
				arguments: [
					tx.object(managerAddress),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					tx.object(baseCoin.priceInfoObjectId!),
					tx.object(quoteCoin.priceInfoObjectId!),
					tx.object(marginPool.address),
					tx.object(pool.address),
					repayCoin,
					tx.object.clock(),
				],
				typeArguments: [baseCoin.type, quoteCoin.type],
			});
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

		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::set_margin_manager_referral`,
			arguments: [tx.object(manager.address), tx.object(referral)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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

		tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::unset_margin_manager_referral`,
			arguments: [tx.object(manager.address), tx.pure.id(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::owner`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deepbook_pool`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::margin_pool_id`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrowed_shares`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrowed_base_shares`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::borrowed_quote_shares`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::has_base_debt`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::balance_manager`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::calculate_assets`,
			arguments: [tx.object(marginManagerId), tx.object(pool.address)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
			return tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::calculate_debts`,
				arguments: [tx.object(marginManagerId), tx.object(marginPool.address), tx.object.clock()],
				typeArguments: [baseCoin.type, quoteCoin.type, debtCoin.type],
			});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::manager_state`,
			arguments: [
				tx.object(marginManagerId),
				tx.object(this.#config.MARGIN_REGISTRY_ID),
				tx.object(baseCoin.priceInfoObjectId!),
				tx.object(quoteCoin.priceInfoObjectId!),
				tx.object(pool.address),
				tx.object(baseMarginPool.address),
				tx.object(quoteMarginPool.address),
				tx.object.clock(),
			],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::base_balance`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::quote_balance`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
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
		return tx.moveCall({
			target: `${this.#config.MARGIN_PACKAGE_ID}::margin_manager::deep_balance`,
			arguments: [tx.object(marginManagerId)],
			typeArguments: [baseCoin.type, quoteCoin.type],
		});
	};
}
