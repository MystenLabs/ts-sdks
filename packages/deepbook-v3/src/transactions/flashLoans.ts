// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import { convertQuantity } from '../utils/conversion.js';
import * as poolMoveCalls from '../contracts/deepbook/pool.js';

/**
 * FlashLoanContract class for managing flash loans.
 */
export class FlashLoanContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration object for DeepBook
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Borrow base asset from the pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} borrowAmount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowBaseAsset = (poolKey: string, borrowAmount: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = convertQuantity(borrowAmount, baseCoin.scalar);
		const [baseCoinResult, flashLoan] = tx.add(
			poolMoveCalls.borrowFlashloanBase({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, baseAmount: inputQuantity },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
		return [baseCoinResult, flashLoan] as const;
	};

	/**
	 * @description Return base asset to the pool after a flash loan.
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} borrowAmount The amount of the base asset to return
	 * @param {TransactionObjectArgument} baseCoinInput Coin object representing the base asset to be returned
	 * @param {TransactionObjectArgument} flashLoan FlashLoan object representing the loan to be settled
	 * @returns A function that takes a Transaction object
	 */
	returnBaseAsset =
		(
			poolKey: string,
			borrowAmount: number,
			baseCoinInput: TransactionObjectArgument,
			flashLoan: TransactionObjectArgument,
		) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const borrowScalar = baseCoin.scalar;

			const [baseCoinReturn] = tx.splitCoins(baseCoinInput, [
				tx.pure.u64(convertQuantity(borrowAmount, borrowScalar)),
			]);
			tx.add(
				poolMoveCalls.returnFlashloanBase({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: pool.address, coin: baseCoinReturn, flashLoan },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);

			return baseCoinInput;
		};

	/**
	 * @description Borrow quote asset from the pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} borrowAmount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowQuoteAsset = (poolKey: string, borrowAmount: number) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);
		const inputQuantity = convertQuantity(borrowAmount, quoteCoin.scalar);
		const [quoteCoinResult, flashLoan] = tx.add(
			poolMoveCalls.borrowFlashloanQuote({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { self: pool.address, quoteAmount: inputQuantity },
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
		return [quoteCoinResult, flashLoan] as const;
	};

	/**
	 * @description Return quote asset to the pool after a flash loan.
	 * @param {string} poolKey The key to identify the pool
	 * @param {number} borrowAmount The amount of the quote asset to return
	 * @param {TransactionObjectArgument} quoteCoinInput Coin object representing the quote asset to be returned
	 * @param {TransactionObjectArgument} flashLoan FlashLoan object representing the loan to be settled
	 * @returns A function that takes a Transaction object
	 */
	returnQuoteAsset =
		(
			poolKey: string,
			borrowAmount: number,
			quoteCoinInput: TransactionObjectArgument,
			flashLoan: TransactionObjectArgument,
		) =>
		(tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const borrowScalar = quoteCoin.scalar;

			const [quoteCoinReturn] = tx.splitCoins(quoteCoinInput, [
				tx.pure.u64(convertQuantity(borrowAmount, borrowScalar)),
			]);
			tx.add(
				poolMoveCalls.returnFlashloanQuote({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { self: pool.address, coin: quoteCoinReturn, flashLoan },
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);

			return quoteCoinInput;
		};
}
