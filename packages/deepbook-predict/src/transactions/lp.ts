// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction } from '@mysten/sui/transactions';

import * as account from '../contracts/account/account.js';
import * as plp from '../contracts/deepbook_predict/plp.js';
import type { PredictConfig } from '../utils/config.js';
import { ACCUMULATOR_ROOT_ID } from '../utils/constants.js';

/**
 * Liquidity-provider flows over `plp` (the shared `PoolVault`).
 *
 * Supply/withdraw are asynchronous: `requestSupply`/`requestWithdraw` escrow funds
 * from the account and return a queue index (readable from the emitted event / tx
 * effects) that `cancel*` uses; the request is filled at the next keeper flush.
 * DUSDC/DEEP/PLP amounts are pulled from the account internally (no coin arg) except
 * `sponsorFeeIncentives`/`lockCapital`, which take an actual `Coin<DUSDC>`. Owner
 * flows mint a fresh `Auth`; `Clock` is auto-injected; `AccumulatorRoot` is `0xacc`.
 */
export class LpContract {
	#config: PredictConfig;

	constructor(config: PredictConfig) {
		this.#config = config;
	}

	get #predictPackageId() {
		return this.#config.ids.predictPackageId;
	}

	get #vault() {
		return this.#config.ids.poolVaultId;
	}

	get #protocolConfig() {
		return this.#config.ids.protocolConfigId;
	}

	#auth(tx: Transaction) {
		if (this.#config.address) {
			tx.setSenderIfNotSet(this.#config.address);
		}
		return tx.add(account.generateAuth({ package: this.#config.ids.accountPackageId }));
	}

	/** Queue a DUSDC supply (`amount` raw DUSDC). Returns the queue index (u64) as a tx result. */
	requestSupply = (params: { account: string; amount: bigint | number }) => (tx: Transaction) => {
		const auth = this.#auth(tx);
		return tx.add(
			plp.requestSupply({
				package: this.#predictPackageId,
				arguments: {
					vault: this.#vault,
					wrapper: params.account,
					auth,
					config: this.#protocolConfig,
					amount: params.amount,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};

	/** Queue a PLP-share withdraw (`amount` raw PLP shares). Returns the queue index (u64). */
	requestWithdraw = (params: { account: string; amount: bigint | number }) => (tx: Transaction) => {
		const auth = this.#auth(tx);
		return tx.add(
			plp.requestWithdraw({
				package: this.#predictPackageId,
				arguments: {
					vault: this.#vault,
					wrapper: params.account,
					auth,
					config: this.#protocolConfig,
					amount: params.amount,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};

	/** Cancel a pending supply request by queue index; refunds escrowed DUSDC to the account. */
	cancelSupplyRequest =
		(params: { account: string; index: bigint | number }) => (tx: Transaction) => {
			const auth = this.#auth(tx);
			tx.add(
				plp.cancelSupplyRequest({
					package: this.#predictPackageId,
					arguments: {
						vault: this.#vault,
						wrapper: params.account,
						auth,
						config: this.#protocolConfig,
						index: params.index,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/** Cancel a pending withdraw request by queue index; refunds escrowed PLP to the account. */
	cancelWithdrawRequest =
		(params: { account: string; index: bigint | number }) => (tx: Transaction) => {
			const auth = this.#auth(tx);
			tx.add(
				plp.cancelWithdrawRequest({
					package: this.#predictPackageId,
					arguments: {
						vault: this.#vault,
						wrapper: params.account,
						auth,
						config: this.#protocolConfig,
						index: params.index,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/** Stake DEEP (pulled from the account) for trading-fee benefits; activates next epoch. */
	stakeDeep = (params: { account: string; amount: bigint | number }) => (tx: Transaction) => {
		const auth = this.#auth(tx);
		tx.add(
			plp.stakeDeep({
				package: this.#predictPackageId,
				arguments: {
					vault: this.#vault,
					wrapper: params.account,
					auth,
					config: this.#protocolConfig,
					amount: params.amount,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};

	/** Unstake all DEEP back to the account (no penalty). */
	unstakeDeep = (params: { account: string }) => (tx: Transaction) => {
		const auth = this.#auth(tx);
		tx.add(
			plp.unstakeDeep({
				package: this.#predictPackageId,
				arguments: {
					vault: this.#vault,
					wrapper: params.account,
					auth,
					config: this.#protocolConfig,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};

	/** Claim the account's settled trading-loss rebate for a market (owner auth). Needs the market's Pyth feed. */
	claimTradingLossRebate =
		(params: { account: string; market: string; pyth: string }) => (tx: Transaction) => {
			const auth = this.#auth(tx);
			tx.add(
				plp.claimTradingLossRebate({
					package: this.#predictPackageId,
					arguments: {
						vault: this.#vault,
						market: params.market,
						wrapper: params.account,
						auth,
						config: this.#protocolConfig,
						propbookRegistry: this.#config.ids.oracleRegistryId,
						pyth: params.pyth,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/** Permissionless (keeper) trading-loss rebate claim via app-auth; no owner `Auth`. */
	claimTradingLossRebatePermissionless =
		(params: { account: string; market: string; pyth: string }) => (tx: Transaction) => {
			tx.add(
				plp.claimTradingLossRebatePermissionless({
					package: this.#predictPackageId,
					arguments: {
						vault: this.#vault,
						market: params.market,
						wrapper: params.account,
						accountRegistry: this.#config.ids.accountRegistryId,
						config: this.#protocolConfig,
						propbookRegistry: this.#config.ids.oracleRegistryId,
						pyth: params.pyth,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/** Contribute DUSDC (`amount` raw) to the pool fee-incentive reserve. Permissionless. */
	sponsorFeeIncentives = (params: { amount: bigint | number }) => (tx: Transaction) => {
		const payment = coinWithBalance({ type: this.#config.ids.dusdcType, balance: params.amount });
		tx.add(
			plp.sponsorFeeIncentives({
				package: this.#predictPackageId,
				arguments: { vault: this.#vault, config: this.#protocolConfig, payment },
			}),
		);
	};

	/** Permissionless per-market cash rebalance; makes a market mintable. Needs the market's Pyth feed. */
	rebalanceExpiryCash = (params: { market: string; pyth: string }) => (tx: Transaction) => {
		tx.add(
			plp.rebalanceExpiryCash({
				package: this.#predictPackageId,
				arguments: {
					vault: this.#vault,
					market: params.market,
					config: this.#protocolConfig,
					propbookRegistry: this.#config.ids.oracleRegistryId,
					pyth: params.pyth,
				},
			}),
		);
	};

	/** One-time admin bootstrap: permanently lock genesis DUSDC liquidity (`amount` raw). */
	lockCapital = (params: { adminCap: string; amount: bigint | number }) => (tx: Transaction) => {
		const payment = coinWithBalance({ type: this.#config.ids.dusdcType, balance: params.amount });
		tx.add(
			plp.lockCapital({
				package: this.#predictPackageId,
				arguments: {
					vault: this.#vault,
					config: this.#protocolConfig,
					AdminCap: params.adminCap,
					payment,
				},
			}),
		);
	};
}
