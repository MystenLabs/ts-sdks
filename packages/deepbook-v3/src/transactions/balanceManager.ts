// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction } from '@mysten/sui/transactions';

import type { Environment } from '../types/index.js';
import { mainnetPackageIds, testnetPackageIds } from '../utils/constants.js';

/**
 * BalanceManagerContract class for managing BalanceManager operations.
 */
export class BalanceManagerContract {
	#deepbookPackageId: string;

	/**
	 * @param {Environment} env Environment for BalanceManagerContract
	 */
	constructor(env: Environment) {
		this.#deepbookPackageId =
			env === 'mainnet'
				? mainnetPackageIds.DEEPBOOK_PACKAGE_ID
				: testnetPackageIds.DEEPBOOK_PACKAGE_ID;
	}

	/**
	 * @description Create and share a new BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	createAndShareBalanceManager = () => (tx: Transaction) => {
		const manager = tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::new`,
		});

		tx.moveCall({
			target: '0x2::transfer::public_share_object',
			arguments: [manager],
			typeArguments: [`${this.#deepbookPackageId}::balance_manager::BalanceManager`],
		});
	};

	/**
	 * @description Create and share a new BalanceManager, manually set the owner
	 * @returns A function that takes a Transaction object
	 */
	createAndShareBalanceManagerWithOwner = (ownerAddress: string) => (tx: Transaction) => {
		const manager = tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::new_with_owner`,
			arguments: [tx.pure.address(ownerAddress)],
		});

		tx.moveCall({
			target: '0x2::transfer::public_share_object',
			arguments: [manager],
			typeArguments: [`${this.#deepbookPackageId}::balance_manager::BalanceManager`],
		});
	};

	/**
	 * @description Deposit funds into the BalanceManager
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} coinType The type of the coin to deposit
	 * @param {number} amountToDeposit The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositIntoManager =
		(managerAddress: string, coinType: string, amountToDeposit: number) => (tx: Transaction) => {
			const deposit = coinWithBalance({
				type: coinType,
				balance: amountToDeposit,
			});

			tx.moveCall({
				target: `${this.#deepbookPackageId}::balance_manager::deposit`,
				arguments: [tx.object(managerAddress), deposit],
				typeArguments: [coinType],
			});
		};

	/**
	 * @description Withdraw funds from the BalanceManager
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} coinType The type of the coin to deposit
	 * @param {number} amountToWithdraw The amount to withdraw
	 * @param {string} recipient The recipient of the withdrawn funds
	 * @returns A function that takes a Transaction object
	 */
	withdrawFromManager =
		(managerAddress: string, coinType: string, amountToWithdraw: number, recipient: string) =>
		(tx: Transaction) => {
			const coinObject = tx.moveCall({
				target: `${this.#deepbookPackageId}::balance_manager::withdraw`,
				arguments: [tx.object(managerAddress), tx.pure.u64(amountToWithdraw)],
				typeArguments: [coinType],
			});

			tx.transferObjects([coinObject], recipient);
		};

	/**
	 * @description Withdraw all funds from the BalanceManager
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} coinType The type of the coin to deposit
	 * @param {string} recipient The recipient of the withdrawn funds
	 * @returns A function that takes a Transaction object
	 */
	withdrawAllFromManager =
		(managerAddress: string, coinType: string, recipient: string) => (tx: Transaction) => {
			const withdrawalCoin = tx.moveCall({
				target: `${this.#deepbookPackageId}::balance_manager::withdraw_all`,
				arguments: [tx.object(managerAddress)],
				typeArguments: [coinType],
			});

			tx.transferObjects([withdrawalCoin], recipient);
		};

	/**
	 * @description Check the balance of the BalanceManager
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} coinType The type of the coin to deposit
	 * @returns A function that takes a Transaction object
	 */
	checkManagerBalance = (managerAddress: string, coinType: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::balance`,
			arguments: [tx.object(managerAddress)],
			typeArguments: [coinType],
		});
	};

	/**
	 * @description Generate a trade proof for the BalanceManager. Calls the appropriate function based on whether tradeCap is set.
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} tradeCapAddress The address of the TradeCap
	 * @returns A function that takes a Transaction object
	 */
	generateProof = (managerAddress: string, tradeCapAddress?: string) => (tx: Transaction) => {
		return tx.add(
			tradeCapAddress
				? this.generateProofAsTrader(managerAddress, tradeCapAddress)
				: this.generateProofAsOwner(managerAddress),
		);
	};

	/**
	 * @description Generate a trade proof as the owner
	 * @param {string} managerAddress The address of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	generateProofAsOwner = (managerAddress: string) => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::generate_proof_as_owner`,
			arguments: [tx.object(managerAddress)],
		});
	};

	/**
	 * @description Generate a trade proof as a trader
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} tradeCapAddress The address of the TradeCap
	 * @returns A function that takes a Transaction object
	 */
	generateProofAsTrader =
		(managerAddress: string, tradeCapAddress: string) => (tx: Transaction) => {
			return tx.moveCall({
				target: `${this.#deepbookPackageId}::balance_manager::generate_proof_as_trader`,
				arguments: [tx.object(managerAddress), tx.object(tradeCapAddress)],
			});
		};

	/**
	 * @description Mint a TradeCap
	 * @param {string} managerAddress The address of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	mintTradeCap = (managerAddress: string) => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::mint_trade_cap`,
			arguments: [tx.object(managerAddress)],
		});
	};

	/**
	 * @description Mint a DepositCap
	 * @param {string} managerAddress The address of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	mintDepositCap = (managerAddress: string) => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::mint_deposit_cap`,
			arguments: [tx.object(managerAddress)],
		});
	};

	/**
	 * @description Mint a WithdrawalCap
	 * @param {string} managerAddress The address of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	mintWithdrawalCap = (managerAddress: string) => (tx: Transaction) => {
		return tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::mint_withdraw_cap`,
			arguments: [tx.object(managerAddress)],
		});
	};

	/**
	 * @description Deposit using the DepositCap
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} depositCapAddress The address of the DepositCap
	 * @param {string} coinType The type of the coin to deposit
	 * @param {number} amountToDeposit The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositWithCap =
		(
			managerAddress: string,
			depositCapAddress: string,
			coinType: string,
			amountToDeposit: number,
		) =>
		(tx: Transaction) => {
			const deposit = coinWithBalance({
				type: coinType,
				balance: amountToDeposit,
			});
			tx.moveCall({
				target: `${this.#deepbookPackageId}::balance_manager::deposit_with_cap`,
				arguments: [tx.object(managerAddress), tx.object(depositCapAddress), deposit],
				typeArguments: [coinType],
			});
		};

	/**
	 * @description Withdraw using the WithdrawCap
	 * @param {string} managerAddress The address of the BalanceManager
	 * @param {string} withdrawCapAddress The address of the DepositCap
	 * @param {string} coinType The type of the coin to deposit
	 * @param {number} amountToWithdraw The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawWithCap =
		(
			managerAddress: string,
			withdrawCapAddress: string,
			coinType: string,
			amountToWithdraw: number,
		) =>
		(tx: Transaction) => {
			return tx.moveCall({
				target: `${this.#deepbookPackageId}::balance_manager::withdraw_with_cap`,
				arguments: [
					tx.object(managerAddress),
					tx.object(withdrawCapAddress),
					tx.pure.u64(amountToWithdraw),
				],
				typeArguments: [coinType],
			});
		};

	/**
	 * @description Get the owner of the BalanceManager
	 * @param {string} managerAddress The address of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	owner = (managerAddress: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::owner`,
			arguments: [tx.object(managerAddress)],
		});
	};

	/**
	 * @description Get the ID of the BalanceManager
	 * @param {string} managerAddress The address of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	id = (managerAddress: string) => (tx: Transaction) => {
		tx.moveCall({
			target: `${this.#deepbookPackageId}::balance_manager::id`,
			arguments: [tx.object(managerAddress)],
		});
	};
}
