// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import { convertQuantity } from '../utils/conversion.js';
import * as balanceManagerMoveCalls from '../contracts/deepbook/balance_manager.js';

/**
 * BalanceManagerContract class for managing BalanceManager operations.
 */
export class BalanceManagerContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for BalanceManagerContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Create and share a new BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	createAndShareBalanceManager = () => (tx: Transaction) => {
		// NOTE: left as positional moveCalls (not codegen). `balance_manager::new`
		// is called with no args here, but the generated binding's `new` takes an
		// `Owner` (the current core source drifted from the deployed zero-arg form);
		// and `0x2::transfer::public_share_object` is a framework call with no
		// @deepbook/core binding. Kept verbatim to stay byte-identical.
		const manager = tx.moveCall({
			target: `${this.#config.DEEPBOOK_PACKAGE_ID}::balance_manager::new`,
		});

		tx.moveCall({
			target: '0x2::transfer::public_share_object',
			arguments: [manager],
			typeArguments: [`${this.#config.DEEPBOOK_PACKAGE_ID}::balance_manager::BalanceManager`],
		});
	};

	/**
	 * @description Create a new BalanceManager, manually set the owner. Returns the manager.
	 * @returns A function that takes a Transaction object
	 */
	createBalanceManagerWithOwner = (ownerAddress: string) => (tx: Transaction) => {
		return tx.add(
			balanceManagerMoveCalls.newWithCustomOwner({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { owner: ownerAddress },
			}),
		);
	};

	/**
	 * @description Share the BalanceManager
	 * @param {TransactionArgument} manager The BalanceManager to share
	 * @returns A function that takes a Transaction object
	 */
	shareBalanceManager = (manager: TransactionArgument) => (tx: Transaction) => {
		// Framework call (`0x2::transfer::public_share_object`) — no @deepbook/core
		// binding exists, so this stays a positional moveCall.
		tx.moveCall({
			target: '0x2::transfer::public_share_object',
			arguments: [manager],
			typeArguments: [`${this.#config.DEEPBOOK_PACKAGE_ID}::balance_manager::BalanceManager`],
		});
	};

	/**
	 * @description Deposit funds into the BalanceManager
	 * @param {string} managerKey The key of the BalanceManager
	 * @param {string} coinKey The key of the coin to deposit
	 * @param {number} amountToDeposit The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositIntoManager =
		(managerKey: string, coinKey: string, amountToDeposit: number) => (tx: Transaction) => {
			tx.setSenderIfNotSet(this.#config.address);
			const managerId = this.#config.getBalanceManager(managerKey).address;
			const coin = this.#config.getCoin(coinKey);
			const depositInput = convertQuantity(amountToDeposit, coin.scalar);
			const deposit = coinWithBalance({
				type: coin.type,
				balance: depositInput,
			});

			tx.add(
				balanceManagerMoveCalls.deposit({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId, coin: deposit },
					typeArguments: [coin.type],
				}),
			);
		};

	/**
	 * @description Withdraw funds from the BalanceManager
	 * @param {string} managerKey The key of the BalanceManager
	 * @param {string} coinKey The key of the coin to withdraw
	 * @param {number} amountToWithdraw The amount to withdraw
	 * @param {string} recipient The recipient of the withdrawn funds
	 * @returns A function that takes a Transaction object
	 */
	withdrawFromManager =
		(managerKey: string, coinKey: string, amountToWithdraw: number, recipient: string) =>
		(tx: Transaction) => {
			const managerId = this.#config.getBalanceManager(managerKey).address;
			const coin = this.#config.getCoin(coinKey);
			const withdrawInput = convertQuantity(amountToWithdraw, coin.scalar);
			const coinObject = tx.add(
				balanceManagerMoveCalls.withdraw({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId, withdrawAmount: withdrawInput },
					typeArguments: [coin.type],
				}),
			);

			tx.transferObjects([coinObject], recipient);
		};

	/**
	 * @description Withdraw all funds from the BalanceManager
	 * @param {string} managerKey The key of the BalanceManager
	 * @param {string} coinKey The key of the coin to withdraw
	 * @param {string} recipient The recipient of the withdrawn funds
	 * @returns A function that takes a Transaction object
	 */
	withdrawAllFromManager =
		(managerKey: string, coinKey: string, recipient: string) => (tx: Transaction) => {
			const managerId = this.#config.getBalanceManager(managerKey).address;
			const coin = this.#config.getCoin(coinKey);
			const withdrawalCoin = tx.add(
				balanceManagerMoveCalls.withdrawAll({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId },
					typeArguments: [coin.type],
				}),
			);

			tx.transferObjects([withdrawalCoin], recipient);
		};

	/**
	 * @description Check the balance of the BalanceManager
	 * @param {string} managerKey The key of the BalanceManager
	 * @param {string} coinKey The key of the coin to check the balance of
	 * @returns A function that takes a Transaction object
	 */
	checkManagerBalance = (managerKey: string, coinKey: string) => (tx: Transaction) => {
		const managerId = this.#config.getBalanceManager(managerKey).address;
		const coin = this.#config.getCoin(coinKey);
		tx.add(
			balanceManagerMoveCalls.balance({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
				typeArguments: [coin.type],
			}),
		);
	};

	/**
	 * @description Generate a trade proof for the BalanceManager. Calls the appropriate function based on whether tradeCap is set.
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	generateProof = (managerKey: string) => (tx: Transaction) => {
		const balanceManager = this.#config.getBalanceManager(managerKey);
		return tx.add(
			balanceManager.tradeCap
				? this.generateProofAsTrader(balanceManager.address, balanceManager.tradeCap)
				: this.generateProofAsOwner(balanceManager.address),
		);
	};

	/**
	 * @description Generate a trade proof as the owner
	 * @param {string} managerId The ID of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	generateProofAsOwner = (managerId: string) => (tx: Transaction) => {
		return tx.add(
			balanceManagerMoveCalls.generateProofAsOwner({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
			}),
		);
	};

	/**
	 * @description Generate a trade proof as a trader
	 * @param {string} managerId The ID of the BalanceManager
	 * @param {string} tradeCapId The ID of the tradeCap
	 * @returns A function that takes a Transaction object
	 */
	generateProofAsTrader = (managerId: string, tradeCapId: string) => (tx: Transaction) => {
		return tx.add(
			balanceManagerMoveCalls.generateProofAsTrader({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId, tradeCap: tradeCapId },
			}),
		);
	};

	/**
	 * @description Mint a TradeCap
	 * @param {string} managerKey The name of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	mintTradeCap = (managerKey: string) => (tx: Transaction) => {
		const manager = this.#config.getBalanceManager(managerKey);
		const managerId = manager.address;
		return tx.add(
			balanceManagerMoveCalls.mintTradeCap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
			}),
		);
	};

	/**
	 * @description Mint a DepositCap
	 * @param {string} managerKey The name of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	mintDepositCap = (managerKey: string) => (tx: Transaction) => {
		const manager = this.#config.getBalanceManager(managerKey);
		const managerId = manager.address;
		return tx.add(
			balanceManagerMoveCalls.mintDepositCap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
			}),
		);
	};

	/**
	 * @description Mint a WithdrawalCap
	 * @param {string} managerKey The name of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	mintWithdrawalCap = (managerKey: string) => (tx: Transaction) => {
		const manager = this.#config.getBalanceManager(managerKey);
		const managerId = manager.address;
		return tx.add(
			balanceManagerMoveCalls.mintWithdrawCap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
			}),
		);
	};

	/**
	 * @description Deposit using the DepositCap
	 * @param {string} managerKey The name of the BalanceManager
	 * @param {string} coinKey The name of the coin to deposit
	 * @param {number} amountToDeposit The amount to deposit
	 * @returns A function that takes a Transaction object
	 */
	depositWithCap =
		(managerKey: string, coinKey: string, amountToDeposit: number) => (tx: Transaction) => {
			tx.setSenderIfNotSet(this.#config.address);
			const manager = this.#config.getBalanceManager(managerKey);
			const managerId = manager.address;
			if (!manager.depositCap) {
				throw new Error(`DepositCap not set for ${managerKey}`);
			}
			const depositCapId = manager.depositCap;
			const coin = this.#config.getCoin(coinKey);
			const depositInput = convertQuantity(amountToDeposit, coin.scalar);
			const deposit = coinWithBalance({
				type: coin.type,
				balance: depositInput,
			});
			tx.add(
				balanceManagerMoveCalls.depositWithCap({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId, depositCap: depositCapId, coin: deposit },
					typeArguments: [coin.type],
				}),
			);
		};

	/**
	 * @description Withdraw using the WithdrawCap
	 * @param {string} managerKey The name of the BalanceManager
	 * @param {string} coinKey The name of the coin to withdraw
	 * @param {number} amountToWithdraw The amount to withdraw
	 * @returns A function that takes a Transaction object
	 */
	withdrawWithCap =
		(managerKey: string, coinKey: string, amountToWithdraw: number) => (tx: Transaction) => {
			tx.setSenderIfNotSet(this.#config.address);
			const manager = this.#config.getBalanceManager(managerKey);
			const managerId = manager.address;
			if (!manager.withdrawCap) {
				throw new Error(`WithdrawCap not set for ${managerKey}`);
			}
			const withdrawCapId = manager.withdrawCap;
			const coin = this.#config.getCoin(coinKey);
			const withdrawAmount = convertQuantity(amountToWithdraw, coin.scalar);
			return tx.add(
				balanceManagerMoveCalls.withdrawWithCap({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId, withdrawCap: withdrawCapId, withdrawAmount },
					typeArguments: [coin.type],
				}),
			);
		};

	/**
	 * @description Set the referral for the BalanceManager for a specific pool
	 * @param {string} managerKey The name of the BalanceManager
	 * @param {string} referral The referral (DeepBookPoolReferral) to set the BalanceManager to
	 * @param {TransactionArgument} tradeCap The tradeCap for permission checking
	 * @returns A function that takes a Transaction object
	 */
	setBalanceManagerReferral =
		(managerKey: string, referral: string, tradeCap: TransactionArgument) => (tx: Transaction) => {
			const managerId = this.#config.getBalanceManager(managerKey).address;
			tx.add(
				balanceManagerMoveCalls.setBalanceManagerReferral({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId, referral, tradeCap },
				}),
			);
		};

	/**
	 * @description Unset the referral for the BalanceManager for a specific pool
	 * @param {string} managerKey The name of the BalanceManager
	 * @param {string} poolKey The key of the pool to unset the referral for
	 * @param {TransactionArgument} tradeCap The tradeCap for permission checking
	 * @returns A function that takes a Transaction object
	 */
	unsetBalanceManagerReferral =
		(managerKey: string, poolKey: string, tradeCap: TransactionArgument) => (tx: Transaction) => {
			const managerId = this.#config.getBalanceManager(managerKey).address;
			const poolId = this.#config.getPool(poolKey).address;
			tx.add(
				balanceManagerMoveCalls.unsetBalanceManagerReferral({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: { balanceManager: managerId, poolId, tradeCap },
				}),
			);
		};

	registerBalanceManager = (managerKey: string) => (tx: Transaction) => {
		const managerId = this.#config.getBalanceManager(managerKey).address;
		tx.add(
			balanceManagerMoveCalls.registerBalanceManager({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId, registry: this.#config.REGISTRY_ID },
			}),
		);
	};

	/**
	 * @description Get the owner of the BalanceManager
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	owner = (managerKey: string) => (tx: Transaction) => {
		const managerId = this.#config.getBalanceManager(managerKey).address;
		tx.add(
			balanceManagerMoveCalls.owner({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
			}),
		);
	};

	/**
	 * @description Get the ID of the BalanceManager
	 * @param {string} managerKey The key of the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	id = (managerKey: string) => (tx: Transaction) => {
		const managerId = this.#config.getBalanceManager(managerKey).address;
		tx.add(
			balanceManagerMoveCalls.id({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId },
			}),
		);
	};

	/**
	 * @description Get the owner of the referral (DeepBookPoolReferral)
	 * @param {string} referralId The ID of the referral to get the owner of
	 * @returns A function that takes a Transaction object
	 */
	balanceManagerReferralOwner = (referralId: string) => (tx: Transaction) => {
		return tx.add(
			balanceManagerMoveCalls.balanceManagerReferralOwner({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { referral: referralId },
			}),
		);
	};

	/**
	 * @description Get the pool ID associated with a referral (DeepBookPoolReferral)
	 * @param {string} referralId The ID of the referral to get the pool ID of
	 * @returns A function that takes a Transaction object
	 */
	balanceManagerReferralPoolId = (referralId: string) => (tx: Transaction) => {
		return tx.add(
			balanceManagerMoveCalls.balanceManagerReferralPoolId({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { referral: referralId },
			}),
		);
	};

	/**
	 * @description Get the referral ID from the balance manager for a specific pool
	 * @param {string} managerKey The name of the BalanceManager
	 * @param {string} poolKey Key of the pool to get the referral for
	 * @returns A function that takes a Transaction object
	 */
	getBalanceManagerReferralId = (managerKey: string, poolKey: string) => (tx: Transaction) => {
		const managerId = this.#config.getBalanceManager(managerKey).address;
		const poolId = this.#config.getPool(poolKey).address;
		return tx.add(
			balanceManagerMoveCalls.getBalanceManagerReferralId({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId, poolId },
			}),
		);
	};

	/**
	 * @description Revoke a TradeCap. This also revokes the associated DepositCap and WithdrawCap.
	 * @param {string} managerKey The name of the BalanceManager
	 * @param {string} tradeCapId The ID of the TradeCap to revoke
	 * @returns A function that takes a Transaction object
	 */
	revokeTradeCap = (managerKey: string, tradeCapId: string) => (tx: Transaction) => {
		const managerId = this.#config.getBalanceManager(managerKey).address;
		tx.add(
			balanceManagerMoveCalls.revokeTradeCap({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: { balanceManager: managerId, tradeCapId },
			}),
		);
	};
}
