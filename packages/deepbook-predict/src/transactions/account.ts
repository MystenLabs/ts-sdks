// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { coinWithBalance } from '@mysten/sui/transactions';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import * as account from '../contracts/account/account.js';
import * as accountRegistry from '../contracts/account/account_registry.js';
import type { PredictConfig } from '../utils/config.js';
import { ACCUMULATOR_ROOT_ID } from '../utils/constants.js';

/**
 * Custody flows over the `account` package (the primitive Predict trades against).
 *
 * Each trader has one shared `AccountWrapper` (created once via the account registry).
 * Owner actions consume a fresh `Auth` hot-potato minted in the same PTB via
 * `account::generate_auth` (derived from the tx sender), so set the sender before
 * signing. The `Clock` is auto-injected by the generated bindings; `AccumulatorRoot`
 * (`0xacc`) is passed explicitly because custody calls settle accumulator funds first.
 */
export class AccountContract {
	#config: PredictConfig;

	constructor(config: PredictConfig) {
		this.#config = config;
	}

	get #accountPackageId() {
		return this.#config.ids.accountPackageId;
	}

	#setSender(tx: Transaction) {
		if (this.#config.address) {
			tx.setSenderIfNotSet(this.#config.address);
		}
	}

	/** Mint a fresh owner `Auth` from the tx sender. Consumed by the next custody/trade call. */
	generateAuth = () => (tx: Transaction) => {
		this.#setSender(tx);
		return tx.add(account.generateAuth({ package: this.#accountPackageId }));
	};

	/** Create the sender's canonical account wrapper and share it. One per owner address. */
	createAccount = () => (tx: Transaction) => {
		const wrapper = tx.add(
			accountRegistry._new({
				package: this.#accountPackageId,
				arguments: { registry: this.#config.ids.accountRegistryId },
			}),
		);
		tx.add(account.share({ package: this.#accountPackageId, arguments: { self: wrapper } }));
	};

	/** Deposit DUSDC into the account. `amount` is in raw 6-decimal DUSDC units. */
	deposit = (params: { account: string; amount: bigint | number }) => (tx: Transaction) => {
		this.#setSender(tx);
		const coin = coinWithBalance({ type: this.#config.ids.dusdcType, balance: params.amount });
		this.#depositCoin(tx, params.account, coin);
	};

	/** Deposit an already-constructed `Coin<DUSDC>` into the account. */
	depositFunds =
		(params: { account: string; coin: TransactionObjectArgument }) => (tx: Transaction) => {
			this.#setSender(tx);
			this.#depositCoin(tx, params.account, params.coin);
		};

	#depositCoin(tx: Transaction, wrapper: string, coin: TransactionObjectArgument) {
		const auth = tx.add(account.generateAuth({ package: this.#accountPackageId }));
		tx.add(
			account.depositFunds({
				package: this.#accountPackageId,
				arguments: { wrapper, auth, coin, root: ACCUMULATOR_ROOT_ID },
				typeArguments: [this.#config.ids.dusdcType],
			}),
		);
	}

	/**
	 * Withdraw DUSDC from the account. Returns the `Coin<DUSDC>`; if `recipient` is set
	 * it is transferred there, otherwise use the returned coin downstream in the PTB.
	 */
	withdraw =
		(params: { account: string; amount: bigint | number; recipient?: string }) =>
		(tx: Transaction) => {
			this.#setSender(tx);
			const auth = tx.add(account.generateAuth({ package: this.#accountPackageId }));
			const coin = tx.add(
				account.withdrawFunds({
					package: this.#accountPackageId,
					arguments: {
						wrapper: params.account,
						auth,
						amount: params.amount,
						root: ACCUMULATOR_ROOT_ID,
					},
					typeArguments: [this.#config.ids.dusdcType],
				}),
			);
			if (params.recipient) {
				tx.transferObjects([coin], params.recipient);
			}
			return coin;
		};
}
