// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';

import type { ProposalParams } from '../types/index.js';
import type { DeepBookConfig } from '../utils/config.js';
import { DEEP_SCALAR, FLOAT_SCALAR } from '../utils/config.js';
import { convertQuantity, convertRate } from '../utils/conversion.js';
import * as poolMoveCalls from '../contracts/deepbook/pool.js';

/**
 * GovernanceContract class for managing governance operations in DeepBook.
 */
export class GovernanceContract {
	#config: DeepBookConfig;

	/**
	 * @param {DeepBookConfig} config Configuration for GovernanceContract
	 */
	constructor(config: DeepBookConfig) {
		this.#config = config;
	}

	/**
	 * @description Stake a specified amount in the pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {number} stakeAmount The amount to stake
	 * @returns A function that takes a Transaction object
	 */
	stake =
		(poolKey: string, balanceManagerKey: string, stakeAmount: number) => (tx: Transaction) => {
			const pool = this.#config.getPool(poolKey);
			const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
			const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));
			const baseCoin = this.#config.getCoin(pool.baseCoin);
			const quoteCoin = this.#config.getCoin(pool.quoteCoin);
			const stakeInput = convertQuantity(stakeAmount, DEEP_SCALAR);

			tx.add(
				poolMoveCalls.stake({
					package: this.#config.DEEPBOOK_PACKAGE_ID,
					arguments: {
						self: pool.address,
						balanceManager: balanceManager.address,
						tradeProof,
						amount: stakeInput,
					},
					typeArguments: [baseCoin.type, quoteCoin.type],
				}),
			);
		};

	/**
	 * @description Unstake from the pool
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @returns A function that takes a Transaction object
	 */
	unstake = (poolKey: string, balanceManagerKey: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.unstake({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeProof,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Submit a governance proposal
	 * @param {ProposalParams} params Parameters for the proposal
	 * @returns A function that takes a Transaction object
	 */
	submitProposal = (params: ProposalParams) => (tx: Transaction) => {
		const { poolKey, balanceManagerKey, takerFee, makerFee, stakeRequired } = params;

		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.submitProposal({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeProof,
					takerFee: convertRate(takerFee, FLOAT_SCALAR),
					makerFee: convertRate(makerFee, FLOAT_SCALAR),
					stakeRequired: convertQuantity(stakeRequired, DEEP_SCALAR),
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};

	/**
	 * @description Vote on a proposal
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string} proposal_id The ID of the proposal to vote on
	 * @returns A function that takes a Transaction object
	 */
	vote = (poolKey: string, balanceManagerKey: string, proposal_id: string) => (tx: Transaction) => {
		const pool = this.#config.getPool(poolKey);
		const balanceManager = this.#config.getBalanceManager(balanceManagerKey);
		const tradeProof = tx.add(this.#config.balanceManager.generateProof(balanceManagerKey));
		const baseCoin = this.#config.getCoin(pool.baseCoin);
		const quoteCoin = this.#config.getCoin(pool.quoteCoin);

		tx.add(
			poolMoveCalls.vote({
				package: this.#config.DEEPBOOK_PACKAGE_ID,
				arguments: {
					self: pool.address,
					balanceManager: balanceManager.address,
					tradeProof,
					proposalId: proposal_id,
				},
				typeArguments: [baseCoin.type, quoteCoin.type],
			}),
		);
	};
}
