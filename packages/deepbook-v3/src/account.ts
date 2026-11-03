// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type {
	Transaction,
	TransactionObjectArgument,
	TransactionResult,
} from '@mysten/sui/transactions';
import { deriveObjectID } from '@mysten/sui/utils';

import * as account from './account-bindings/account.js';
import * as accountRegistry from './account-bindings/account-registry.js';
import type { AccountConfig as GeneratedAccountConfig } from './contracts/account/config-arguments.js';
import { MAINNET_ACCOUNT } from './deployments/mainnet.js';
import { TESTNET_ACCOUNT } from './deployments/testnet.js';
import type { NetworkArg } from './deployments/index.js';

// Provenance: which on-chain deployment the ids above came from. Re-exported so a consumer
// can answer "which deploy is this build pinned to?" without reaching for another subpath.
export { getDeployment, getUnits, TESTNET_DEPLOYMENT, TESTNET_UNITS } from './deployments/index.js';
export type { NetworkArg } from './deployments/index.js';
export type { DeployedNetwork } from './deployments/index.js';

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
	/**
	 * The ORIGINAL `account` Move package id. Type tags and the derived wrapper address are built
	 * from it, so it never moves to an upgraded package: that would derive addresses nothing lives
	 * at, and a coin sent to one is lost.
	 */
	accountPackageId: string;
	/** The shared `AccountRegistry` object id. */
	accountRegistry: string;
	/**
	 * The latest `account` package, once the network has upgraded it: the call target of every
	 * builder here. A PTB can't call account at an older version than another package in it links
	 * (Predict's Version 5 links account v2), and `receiveCoin` / `receiveCoinAtAccountId` exist
	 * only from v2. Absent while the network runs v1: calls then target `accountPackageId`.
	 */
	accountPackageIdLatest?: string;
}

/**
 * @description The deployed `account` ids for `network`, so a caller does not transcribe
 * them. Generated from the deploy manifest — see `src/deployments/`.
 * @throws if the network has no recorded deployment, rather than returning placeholder ids
 * that would fail as a confusing on-chain abort.
 *
 * ```ts
 * const account = new AccountContract(getAccountConfig('testnet'));
 * ```
 */
export function getAccountConfig(network: NetworkArg): AccountConfig {
	if (network === 'testnet') return TESTNET_ACCOUNT;
	if (network === 'mainnet') return MAINNET_ACCOUNT;
	throw new Error(
		`@mysten/deepbook-v3/account: no account deployment recorded for network '${network}'. ` +
			'The account primitive is recorded for testnet and mainnet; for your own deployment pass ' +
			'`{ accountPackageId, accountRegistry }` to AccountContract directly.',
	);
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
	 * @description Move a `Coin<T>` that was transferred to an account's wrapper address into
	 * the account's stored balance (`receive_coin`). Permissionless: anyone may submit it, and
	 * value only enters the account the coin was addressed to. A sender that can only transfer a
	 * coin to an address (a bridge mint, for example) sends it to `deriveAccountWrapperId(owner)`.
	 * The coin can arrive before the account exists and waits there until the owner creates it.
	 * @param {object} params Wrapper id, the received coin's object id (or a `Receiving` input),
	 * and its coin type
	 * @returns A function that takes a Transaction object
	 * @throws if the config has no `accountPackageIdLatest`, i.e. the network still runs account v1
	 */
	receiveCoin(params: {
		wrapperId: string;
		coin: string | TransactionObjectArgument;
		coinType: string;
	}) {
		const packageId = this.#latestPackage('receiveCoin');
		return (tx: Transaction): TransactionResult =>
			tx.add(
				account.receiveCoin({
					package: packageId,
					arguments: {
						wrapper: params.wrapperId,
						coin: typeof params.coin === 'string' ? tx.object(params.coin) : params.coin,
					},
					typeArguments: [params.coinType],
				}),
			);
	}

	/**
	 * @description `receiveCoin` for a coin sent to the account's canonical ID (`account_id`,
	 * the address `account_registry::derived_address` returns) instead of its wrapper address.
	 * A `Receiving` input can't name its owner, so pick the call from where the coin sits: the
	 * wrong one aborts `EUnableToReceiveObject`. Senders should use the wrapper address.
	 * @param {object} params Wrapper id, the received coin's object id (or a `Receiving` input),
	 * and its coin type
	 * @returns A function that takes a Transaction object
	 * @throws if the config has no `accountPackageIdLatest`, i.e. the network still runs account v1
	 */
	receiveCoinAtAccountId(params: {
		wrapperId: string;
		coin: string | TransactionObjectArgument;
		coinType: string;
	}) {
		const packageId = this.#latestPackage('receiveCoinAtAccountId');
		return (tx: Transaction): TransactionResult =>
			tx.add(
				account.receiveCoinAtAccountId({
					package: packageId,
					arguments: {
						wrapper: params.wrapperId,
						coin: typeof params.coin === 'string' ? tx.object(params.coin) : params.coin,
					},
					typeArguments: [params.coinType],
				}),
			);
	}

	// The call target for the functions added in account v2, which v1 doesn't have.
	#latestPackage(builder: string): string {
		const latest = this.#config.accountPackageIdLatest;
		if (!latest) {
			throw new Error(
				`@mysten/deepbook-v3/account: ${builder} calls a function added in account v2, and this ` +
					'config has no `accountPackageIdLatest` (the network still runs account v1).',
			);
		}
		return latest;
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
// The move calls resolve their package to `config.accountPackageIdLatest` when the config has one
// (see `account-bindings/latest.ts`); `accountPackageId` stays the original for derivation.
export * as accountMoveCalls from './account-bindings/account.js';
export * as accountRegistryMoveCalls from './account-bindings/account-registry.js';
export * as accountEvents from './contracts/account/account_events.js';
export { Account, AccountWrapper } from './contracts/account/account.js';
