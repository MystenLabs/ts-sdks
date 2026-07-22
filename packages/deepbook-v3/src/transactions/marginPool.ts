// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import type { DeepBookConfig } from '../utils/config.js';
import { convertQuantity } from '../utils/conversion.js';
import * as marginPoolMoveCalls from '../contracts/deepbook_margin/margin_pool.js';

/**
 * MarginPoolContract class for managing MarginPool operations.
 */
export class MarginPoolContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for MarginPoolContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Mint a supplier cap for margin pool
	 * @returns A function that takes a Transaction object
	 */
	mintSupplierCap = () => (tx: Transaction) => {
		return tx.add(
			marginPoolMoveCalls.mintSupplierCap({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { registry: this.#config.MARGIN_REGISTRY_ID },
			}),
		);
	};

	/**
	 * @description Supply to a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @param {TransactionObjectArgument} supplierCap The supplier cap object
	 * @param {number} amountToDeposit The amount to deposit
	 * @param {string} referralId The ID of the referral
	 * @returns A function that takes a Transaction object
	 */
	supplyToMarginPool =
		(
			coinKey: string,
			supplierCap: TransactionObjectArgument,
			amountToDeposit: number,
			referralId?: string,
		) =>
		(tx: Transaction) => {
			tx.setSenderIfNotSet(this.#config.address);
			const marginPool = this.#config.getMarginPool(coinKey);
			const coin = this.#config.getCoin(coinKey);
			const depositInput = convertQuantity(amountToDeposit, coin.scalar);
			const supply = coinWithBalance({
				type: coin.type,
				balance: depositInput,
			});

			// NOTE: left as a positional moveCall (not codegen). This builder's
			// coinWithBalance + `tx.object.option` (an on-chain option::none MoveCall
			// for the Option<ID> referral) interleave commands in a way that a
			// generated named-arg call reorders — so migrating it would change the
			// emitted PTB. Kept verbatim to stay byte-identical.
			tx.moveCall({
				target: `${this.#config.MARGIN_PACKAGE_ID}::margin_pool::supply`,
				arguments: [
					tx.object(marginPool.address),
					tx.object(this.#config.MARGIN_REGISTRY_ID),
					supplierCap,
					supply,
					tx.object.option({
						type: '0x2::object::ID',
						value: referralId ? tx.pure.id(referralId) : null,
					}),
					tx.object.clock(),
				],
				typeArguments: [marginPool.type],
			});
		};

	/**
	 * @description Withdraw from a margin pool. If amountToWithdraw is not provided, withdraws all.
	 * @param {string} coinKey The key to identify the pool
	 * @param {TransactionObjectArgument} supplierCap The supplier cap object
	 * @param {number} [amountToWithdraw] The amount to withdraw. If omitted, withdraws all.
	 * @returns A function that takes a Transaction object
	 */
	withdrawFromMarginPool =
		(coinKey: string, supplierCap: TransactionObjectArgument, amountToWithdraw?: number) =>
		(tx: Transaction) => {
			const marginPool = this.#config.getMarginPool(coinKey);
			const coin = this.#config.getCoin(coinKey);
			const withdrawInput =
				amountToWithdraw !== undefined ? convertQuantity(amountToWithdraw, coin.scalar) : null;
			return tx.add(
				marginPoolMoveCalls.withdraw({
					package: this.#config.MARGIN_PACKAGE_ID,
					arguments: {
						self: marginPool.address,
						registry: this.#config.MARGIN_REGISTRY_ID,
						supplierCap,
						amount: withdrawInput,
					},
					typeArguments: [marginPool.type],
				}),
			);
		};

	/**
	 * @description Mint a referral for a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	mintSupplyReferral = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		tx.add(
			marginPoolMoveCalls.mintSupplyReferral({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address, registry: this.#config.MARGIN_REGISTRY_ID },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Withdraw referral fees from a margin pool
	 * @param {string} coinKey The key to identify the pool
	 * @param {string} referralId The ID of the referral
	 * @returns A function that takes a Transaction object
	 */
	withdrawReferralFees = (coinKey: string, referralId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.withdrawReferralFees({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: {
					self: marginPool.address,
					registry: this.#config.MARGIN_REGISTRY_ID,
					referral: referralId,
				},
				typeArguments: [marginPool.type],
			}),
		);
	};

	// === Read-only/View Functions ===

	/**
	 * @description Get the margin pool ID
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	getId = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.id({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Check if a deepbook pool is allowed for borrowing
	 * @param {string} coinKey The key to identify the margin pool
	 * @param {string} deepbookPoolId The ID of the deepbook pool
	 * @returns A function that takes a Transaction object
	 */
	deepbookPoolAllowed = (coinKey: string, deepbookPoolId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.deepbookPoolAllowed({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address, deepbookPoolId },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the total supply amount
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	totalSupply = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.totalSupply({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the total supply shares
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	supplyShares = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.supplyShares({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the total borrow amount
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	totalBorrow = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.totalBorrow({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the total borrow shares
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	borrowShares = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.borrowShares({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the last update timestamp
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	lastUpdateTimestamp = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.lastUpdateTimestamp({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the supply cap
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	supplyCap = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.supplyCap({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the max utilization rate
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	maxUtilizationRate = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.maxUtilizationRate({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the protocol spread
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	protocolSpread = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.protocolSpread({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the minimum borrow amount
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	minBorrow = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.minBorrow({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get the current interest rate
	 * @param {string} coinKey The key to identify the pool
	 * @returns A function that takes a Transaction object
	 */
	interestRate = (coinKey: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.interestRate({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get user supply shares for a supplier cap
	 * @param {string} coinKey The key to identify the pool
	 * @param {string} supplierCapId The ID of the supplier cap
	 * @returns A function that takes a Transaction object
	 */
	userSupplyShares = (coinKey: string, supplierCapId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.userSupplyShares({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address, supplierCapId },
				typeArguments: [marginPool.type],
			}),
		);
	};

	/**
	 * @description Get user supply amount for a supplier cap
	 * @param {string} coinKey The key to identify the pool
	 * @param {string} supplierCapId The ID of the supplier cap
	 * @returns A function that takes a Transaction object
	 */
	userSupplyAmount = (coinKey: string, supplierCapId: string) => (tx: Transaction) => {
		const marginPool = this.#config.getMarginPool(coinKey);
		return tx.add(
			marginPoolMoveCalls.userSupplyAmount({
				package: this.#config.MARGIN_PACKAGE_ID,
				arguments: { self: marginPool.address, supplierCapId },
				typeArguments: [marginPool.type],
			}),
		);
	};
}
