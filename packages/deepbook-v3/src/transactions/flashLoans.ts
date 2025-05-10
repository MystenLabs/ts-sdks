// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import type { Environment } from '../types/index.js';
import { mainnetPackageIds, testnetPackageIds } from '../utils/constants.js';

/**
 * FlashLoanContract class for managing flash loans.
 */
export class FlashLoanContract {
	#deepbookPackageId: string;

	/**
	 * @param {Environment} env Environment for FlashLoanContract
	 */
	constructor(env: Environment) {
		this.#deepbookPackageId =
			env === 'mainnet'
				? mainnetPackageIds.DEEPBOOK_PACKAGE_ID
				: testnetPackageIds.DEEPBOOK_PACKAGE_ID;
	}

	/**
	 * @description Borrow base asset from the pool
	 * @param {string} poolAddress The address of the pool
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @param {number} borrowAmount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowBaseAsset =
		(poolAddress: string, baseCoinType: string, quoteCoinType: string, borrowAmount: number) =>
		(tx: Transaction) => {
			const [baseCoinResult, flashLoan] = tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::borrow_flashloan_base`,
				arguments: [tx.object(poolAddress), tx.pure.u64(borrowAmount)],
				typeArguments: [baseCoinType, quoteCoinType],
			});
			return [baseCoinResult, flashLoan] as const;
		};

	/**
	 * @description Return base asset to the pool after a flash loan.
	 * @param {string} poolAddress The address of the pool
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @param {number} borrowAmount The amount of the base asset to return
	 * @param {TransactionObjectArgument} baseCoinInput Coin object representing the base asset to be returned
	 * @param {TransactionObjectArgument} flashLoan FlashLoan object representing the loan to be settled
	 * @returns A function that takes a Transaction object
	 */
	returnBaseAsset =
		(
			poolAddress: string,
			baseCoinType: string,
			quoteCoinType: string,
			borrowAmount: number,
			baseCoinInput: TransactionObjectArgument,
			flashLoan: TransactionObjectArgument,
		) =>
		(tx: Transaction) => {
			const [baseCoinReturn] = tx.splitCoins(baseCoinInput, [tx.pure.u64(borrowAmount)]);
			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::return_flashloan_base`,
				arguments: [tx.object(poolAddress), baseCoinReturn, flashLoan],
				typeArguments: [baseCoinType, quoteCoinType],
			});

			return baseCoinInput;
		};

	/**
	 * @description Borrow quote asset from the pool
	 * @param {string} poolAddress The address of the pool
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @param {number} borrowAmount The amount to borrow
	 * @returns A function that takes a Transaction object
	 */
	borrowQuoteAsset =
		(poolAddress: string, baseCoinType: string, quoteCoinType: string, borrowAmount: number) =>
		(tx: Transaction) => {
			const [quoteCoinResult, flashLoan] = tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::borrow_flashloan_quote`,
				arguments: [tx.object(poolAddress), tx.pure.u64(borrowAmount)],
				typeArguments: [baseCoinType, quoteCoinType],
			});
			return [quoteCoinResult, flashLoan] as const;
		};

	/**
	 * @description Return quote asset to the pool after a flash loan.
	 * @param {string} poolAddress The address of the pool
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @param {number} borrowAmount The amount of the quote asset to return
	 * @param {TransactionObjectArgument} quoteCoinInput Coin object representing the quote asset to be returned
	 * @param {TransactionObjectArgument} flashLoan FlashLoan object representing the loan to be settled
	 * @returns A function that takes a Transaction object
	 */
	returnQuoteAsset =
		(
			poolAddress: string,
			baseCoinType: string,
			quoteCoinType: string,
			borrowAmount: number,
			quoteCoinInput: TransactionObjectArgument,
			flashLoan: TransactionObjectArgument,
		) =>
		(tx: Transaction) => {
			const [quoteCoinReturn] = tx.splitCoins(quoteCoinInput, [tx.pure.u64(borrowAmount)]);
			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::return_flashloan_quote`,
				arguments: [tx.object(poolAddress), quoteCoinReturn, flashLoan],
				typeArguments: [baseCoinType, quoteCoinType],
			});

			return quoteCoinInput;
		};
}
