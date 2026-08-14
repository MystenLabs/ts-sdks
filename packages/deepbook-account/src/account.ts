// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type {
	Transaction,
	TransactionObjectArgument,
	TransactionResult,
} from '@mysten/sui/transactions';
import { deriveObjectID } from '@mysten/sui/utils';

import * as account from './contracts/account/account.js';
import * as accountRegistry from './contracts/account/account_registry.js';

/**
 * The framework's well-known accumulator-root singleton, which settles the address
 * balances an account's custody funds move through.
 */
export const ACCUMULATOR_ROOT_ID = '0xacc';

/**
 * The deployed ids of the shared `account` package this contract builds against.
 *
 * Kept deliberately minimal — and structurally satisfied by `DeepBookConfig` — so any
 * consumer of the shared account primitive (DeepBook core's account wrapper, Predict, …)
 * can drive these builders with its OWN deployment's ids without constructing a full
 * `DeepBookConfig`.
 */
export interface AccountConfig {
	/** The `account` Move package id. */
	ACCOUNT_PACKAGE_ID: string;
	/** The shared `AccountRegistry` object id. */
	ACCOUNT_REGISTRY_ID: string;
}

// `AccountWrapperKey(address)` is a one-field positional struct, so its BCS is just the
// owner's 32-byte address. See `packages/account/sources/account_registry.move`.
const AccountWrapperKey = bcs.struct('AccountWrapperKey', {
	pos0: bcs.Address,
});

/**
 * AccountContract — the reusable on-chain account primitive (`packages/account`).
 *
 * An owner has one canonical `AccountWrapper`, a *derived* object of the account registry,
 * so its id is computable off-chain (no read). The wrapper holds an `Account` whose custody
 * balances apps deposit into and withdraw from; app-specific data hangs off it under an
 * app-keyed slot. Authority is a hot-potato `Auth` minted from the tx sender and consumed
 * by the very next account-loading call.
 */
export class AccountContract {
	#config: AccountConfig;

	/**
	 * @param {AccountConfig} config Deployed ids of the shared `account` package
	 */
	constructor(config: AccountConfig) {
		this.#config = config;
	}

	/**
	 * @description The deterministic id of an owner's canonical account wrapper — no chain
	 * read needed. The wrapper is a derived object of the account registry, so its id is
	 * `derive_address(registry, AccountWrapperKey(owner))`.
	 * @param {string} owner Owner address
	 * @returns The wrapper object id
	 */
	deriveAccountWrapperId(owner: string): string {
		const key = AccountWrapperKey.serialize({ pos0: owner }).toBytes();
		return deriveObjectID(
			this.#config.ACCOUNT_REGISTRY_ID,
			`${this.#config.ACCOUNT_PACKAGE_ID}::account_registry::AccountWrapperKey`,
			key,
		);
	}

	/**
	 * @description Mint owner authority for the transaction sender. A hot-potato `Auth`
	 * consumed by the very next account-loading call (`load_account_mut` inside
	 * `deposit_funds` / `withdraw_funds` / an app's own entrypoints).
	 * @returns A function that takes a Transaction object
	 */
	generateAuth() {
		return (tx: Transaction): TransactionResult =>
			tx.add(account.generateAuth({ package: this.#config.ACCOUNT_PACKAGE_ID }));
	}

	/**
	 * @description Create the sender's canonical account wrapper and share it. `new` derives
	 * the wrapper at its deterministic address (see `deriveAccountWrapperId`) and aborts if
	 * it already exists; `share` publishes the shared object apps borrow against.
	 * @returns A function that takes a Transaction object
	 */
	createAccount() {
		return (tx: Transaction): void => {
			const wrapper = tx.add(
				accountRegistry._new({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: { registry: this.#config.ACCOUNT_REGISTRY_ID },
				}),
			);
			tx.add(
				account.share({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: { self: wrapper },
				}),
			);
		};
	}

	/**
	 * @description First-time funding in ONE PTB: create the sender's wrapper, deposit
	 * `coin` through the fresh handle, then `share` LAST (once shared, by-value use of the
	 * handle is over). This cannot be split into `createAccount` + `depositFunds`: an object
	 * input can only address an object that pre-exists the PTB, so a wrapper created inside
	 * it is reachable only through `new`'s result handle.
	 * @param {object} params Coin to deposit and its coin type
	 * @returns A function that takes a Transaction object
	 */
	createAccountAndDeposit(params: { coin: TransactionObjectArgument; coinType: string }) {
		return (tx: Transaction): void => {
			const wrapper = tx.add(
				accountRegistry._new({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: { registry: this.#config.ACCOUNT_REGISTRY_ID },
				}),
			);
			const auth = tx.add(this.generateAuth());
			tx.add(
				account.depositFunds({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: { wrapper, auth, coin: params.coin, root: ACCUMULATOR_ROOT_ID },
					typeArguments: [params.coinType],
				}),
			);
			tx.add(
				account.share({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: { self: wrapper },
				}),
			);
		};
	}

	/**
	 * @description Deposit a caller-provided `coin` into the account's stored balance via the
	 * PTB-callable `deposit_funds` (folds settle → authorize → load → deposit; clock
	 * auto-injected). The caller owns coin sourcing.
	 * @param {object} params Wrapper id, coin to deposit, and its coin type
	 * @returns A function that takes a Transaction object
	 */
	depositFunds(params: { wrapperId: string; coin: TransactionObjectArgument; coinType: string }) {
		return (tx: Transaction): void => {
			const auth = tx.add(this.generateAuth());
			tx.add(
				account.depositFunds({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: {
						wrapper: params.wrapperId,
						auth,
						coin: params.coin,
						root: ACCUMULATOR_ROOT_ID,
					},
					typeArguments: [params.coinType],
				}),
			);
		};
	}

	/**
	 * @description Withdraw `amount` (raw u64 units) from the account's stored balance via
	 * the PTB-callable `withdraw_funds` (folds settle → authorize → load → withdraw; clock
	 * auto-injected), returning the minted `Coin<T>` for the caller to transfer or compose.
	 * @param {object} params Wrapper id, raw amount, and coin type
	 * @returns A function that takes a Transaction object and returns the `Coin<T>`
	 */
	withdrawFunds(params: { wrapperId: string; amount: bigint; coinType: string }) {
		return (tx: Transaction): TransactionResult => {
			const auth = tx.add(this.generateAuth());
			return tx.add(
				account.withdrawFunds({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: {
						wrapper: params.wrapperId,
						auth,
						amount: params.amount,
						root: ACCUMULATOR_ROOT_ID,
					},
					typeArguments: [params.coinType],
				}),
			);
		};
	}

	/**
	 * @description Borrow the `Account` out of its wrapper — the read-side entry point apps
	 * chain their own getters onto (`account::balance<T>`, an app's own data accessors).
	 * @param {object} params Wrapper id
	 * @returns A function that takes a Transaction object and returns the `Account`
	 */
	loadAccount(params: { wrapperId: string }) {
		return (tx: Transaction): TransactionResult =>
			tx.add(
				account.loadAccount({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					arguments: { self: params.wrapperId },
				}),
			);
	}

	/**
	 * @description Read an owner's stored custody balance for a coin type: chains
	 * `load_account(wrapper)` → `balance<T>(account, root, clock)`. Compose in a
	 * dev-inspect/simulate PTB and read the u64 return of the LAST command.
	 * @param {object} params Owner address and coin type
	 * @returns A function that takes a Transaction object
	 */
	balance(params: { owner: string; coinType: string }) {
		return (tx: Transaction): TransactionResult => {
			const acct = tx.add(
				this.loadAccount({ wrapperId: this.deriveAccountWrapperId(params.owner) }),
			);
			return tx.add(
				account.balance({
					package: this.#config.ACCOUNT_PACKAGE_ID,
					typeArguments: [params.coinType],
					arguments: { self: acct, root: ACCUMULATOR_ROOT_ID },
				}),
			);
		};
	}
}
