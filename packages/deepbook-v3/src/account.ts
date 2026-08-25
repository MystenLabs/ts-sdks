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
import type { AccountConfig as GeneratedAccountConfig } from './contracts/account/config-arguments.js';

/**
 * The deployed ids of the shared `account` package this contract builds against.
 *
 * Kept deliberately minimal — ids only — so any consumer of the shared account primitive
 * (DeepBook core's account wrapper, Predict, …) can drive these builders with its OWN
 * deployment's ids without constructing a full product-SDK config.
 *
 * Extends the codegen-generated config interface so there is exactly one config shape and
 * casing: the generated bindings resolve `options.config` against these same keys, and if
 * codegen adds, drops, or renames a key this file stops compiling instead of silently
 * building a PTB against the wrong object. The ids are narrowed to `string` — codegen types
 * the package id as optional and the registry as the wider `ConfigValue`, but the
 * wrapper-address derivation needs plain ids.
 */
export interface AccountConfig extends GeneratedAccountConfig {
	/** The `account` Move package id. */
	accountPackageId: string;
	/** The shared `AccountRegistry` object id. */
	accountRegistry: string;
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
			this.#config.accountRegistry,
			`${this.#config.accountPackageId}::account_registry::AccountWrapperKey`,
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
			tx.add(account.generateAuth({ config: this.#config }));
	}

	/**
	 * @description Create the sender's canonical account wrapper and share it. `new` derives
	 * the wrapper at its deterministic address (see `deriveAccountWrapperId`) and aborts if
	 * it already exists; `share` publishes the shared object apps borrow against.
	 * @returns A function that takes a Transaction object
	 */
	createAccount() {
		return (tx: Transaction): void => {
			const wrapper = tx.add(accountRegistry._new({ config: this.#config }));
			tx.add(account.share({ config: this.#config, arguments: { self: wrapper } }));
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
			const wrapper = tx.add(accountRegistry._new({ config: this.#config }));
			const auth = tx.add(this.generateAuth());
			tx.add(
				account.depositFunds({
					config: this.#config,
					arguments: { wrapper, auth, coin: params.coin },
					typeArguments: [params.coinType],
				}),
			);
			tx.add(account.share({ config: this.#config, arguments: { self: wrapper } }));
		};
	}

	/**
	 * @description Deposit a caller-provided `coin` into the account's stored balance via the
	 * PTB-callable `deposit_funds` (folds settle → authorize → load → deposit; clock and
	 * accumulator root auto-injected). The caller owns coin sourcing.
	 * @param {object} params Wrapper id, coin to deposit, and its coin type
	 * @returns A function that takes a Transaction object
	 */
	depositFunds(params: { wrapperId: string; coin: TransactionObjectArgument; coinType: string }) {
		return (tx: Transaction): void => {
			const auth = tx.add(this.generateAuth());
			tx.add(
				account.depositFunds({
					config: this.#config,
					arguments: { wrapper: params.wrapperId, auth, coin: params.coin },
					typeArguments: [params.coinType],
				}),
			);
		};
	}

	/**
	 * @description Withdraw `amount` (raw u64 units) from the account's stored balance via
	 * the PTB-callable `withdraw_funds` (folds settle → authorize → load → withdraw; clock
	 * and accumulator root auto-injected), returning the minted `Coin<T>` for the caller to
	 * transfer or compose.
	 * @param {object} params Wrapper id, raw amount, and coin type
	 * @returns A function that takes a Transaction object and returns the `Coin<T>`
	 */
	withdrawFunds(params: { wrapperId: string; amount: bigint; coinType: string }) {
		return (tx: Transaction): TransactionResult => {
			const auth = tx.add(this.generateAuth());
			return tx.add(
				account.withdrawFunds({
					config: this.#config,
					arguments: { wrapper: params.wrapperId, auth, amount: params.amount },
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
			tx.add(account.loadAccount({ config: this.#config, arguments: { self: params.wrapperId } }));
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
					config: this.#config,
					typeArguments: [params.coinType],
					arguments: { self: acct },
				}),
			);
		};
	}
}

// === Generated bindings ===
// The move-call thunks and BCS structs, for consumers composing their own PTBs or
// parsing account objects/events (e.g. `AccountWrapper.parse`, the event layouts).
//
// NOTE: `Account` here is the shared account primitive's custody account
// (`account::account::Account`). It is deliberately NOT re-exported from this
// package's root — the root already exports a different `Account`
// (`@deepbook/core::account::Account`, the per-pool trading account) and the two
// have unrelated layouts. Keep them separated by subpath.
export * as accountMoveCalls from './contracts/account/account.js';
export * as accountRegistryMoveCalls from './contracts/account/account_registry.js';
export * as accountEvents from './contracts/account/account_events.js';
export { Account, AccountWrapper } from './contracts/account/account.js';
