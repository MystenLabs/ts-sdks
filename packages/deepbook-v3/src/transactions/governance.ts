// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';

import type { Environment, ProposalParams } from '../types/index.js';
import { DEEP_SCALAR, FLOAT_SCALAR } from '../utils/config.js';
import { mainnetPackageIds, testnetPackageIds } from '../utils/constants.js';
import { BalanceManagerContract } from './balanceManager.js';

/**
 * GovernanceContract class for managing governance operations in DeepBook.
 */
export class GovernanceContract {
	#deepbookPackageId: string;
	#balanceManagerContract: BalanceManagerContract;
	/**
	 * @param {Environment} env Environment for GovernanceContract
	 */
	constructor(env: Environment) {
		this.#deepbookPackageId =
			env === 'mainnet'
				? mainnetPackageIds.DEEPBOOK_PACKAGE_ID
				: testnetPackageIds.DEEPBOOK_PACKAGE_ID;
		this.#balanceManagerContract = new BalanceManagerContract(env);
	}

	/**
	 * @description Stake a specified amount in the pool
	 * @param {string} poolAddress The address of the pool
	 * @param {string} balanceManagerAddress The address of the BalanceManager
	 * @param {number} stakeAmount The amount to stake
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @returns A function that takes a Transaction object
	 */
	stake =
		(
			poolAddress: string,
			balanceManagerAddress: string,
			stakeAmount: number,
			baseCoinType: string,
			quoteCoinType: string,
		) =>
		(tx: Transaction) => {
			const tradeProof = tx.add(this.#balanceManagerContract.generateProof(balanceManagerAddress));

			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::stake`,
				arguments: [
					tx.object(poolAddress),
					tx.object(balanceManagerAddress),
					tradeProof,
					tx.pure.u64(stakeAmount),
				],
				typeArguments: [baseCoinType, quoteCoinType],
			});
		};

	/**
	 * @description Unstake from the pool
	 * @param {string} poolAddress The address of the pool
	 * @param {string} balanceManagerAddress The address of the BalanceManager
	 * @param {string} baseCoinType The type of the base coin
	 * @param {string} quoteCoinType The type of the quote coin
	 * @returns A function that takes a Transaction object
	 */
	unstake =
		(
			poolAddress: string,
			balanceManagerAddress: string,
			baseCoinType: string,
			quoteCoinType: string,
		) =>
		(tx: Transaction) => {
			const tradeProof = tx.add(this.#balanceManagerContract.generateProof(balanceManagerAddress));

			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::unstake`,
				arguments: [tx.object(poolAddress), tx.object(balanceManagerAddress), tradeProof],
				typeArguments: [baseCoinType, quoteCoinType],
			});
		};

	/**
	 * @description Submit a governance proposal
	 * @param {ProposalParams} params Parameters for the proposal
	 * @returns A function that takes a Transaction object
	 */
	submitProposal = (params: ProposalParams) => (tx: Transaction) => {
		const {
			poolAddress,
			balanceManagerAddress,
			baseCoinType,
			quoteCoinType,
			takerFee,
			makerFee,
			stakeRequired,
		} = params;

		const tradeProof = tx.add(this.#balanceManagerContract.generateProof(balanceManagerAddress));

		tx.moveCall({
			target: `${this.#deepbookPackageId}::pool::submit_proposal`,
			arguments: [
				tx.object(poolAddress),
				tx.object(balanceManagerAddress),
				tradeProof,
				tx.pure.u64(Math.round(takerFee * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(makerFee * FLOAT_SCALAR)),
				tx.pure.u64(Math.round(stakeRequired * DEEP_SCALAR)),
			],
			typeArguments: [baseCoinType, quoteCoinType],
		});
	};

	/**
	 * @description Vote on a proposal
	 * @param {string} poolKey The key to identify the pool
	 * @param {string} balanceManagerKey The key to identify the BalanceManager
	 * @param {string} proposal_id The ID of the proposal to vote on
	 * @returns A function that takes a Transaction object
	 */
	vote =
		(
			poolAddress: string,
			balanceManagerAddress: string,
			proposal_id: string,
			baseCoinType: string,
			quoteCoinType: string,
		) =>
		(tx: Transaction) => {
			const tradeProof = tx.add(this.#balanceManagerContract.generateProof(balanceManagerAddress));

			tx.moveCall({
				target: `${this.#deepbookPackageId}::pool::vote`,
				arguments: [
					tx.object(poolAddress),
					tx.object(balanceManagerAddress),
					tradeProof,
					tx.pure.id(proposal_id),
				],
				typeArguments: [baseCoinType, quoteCoinType],
			});
		};
}
