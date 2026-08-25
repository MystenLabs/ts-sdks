/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns shared account wrappers, typed coin custody, accumulator settlement, and
 * application-scoped data. Consuming `Auth` is the mutable-borrow boundary: owner
 * auth is checked against the account, while package-issued app auth yields the
 * same full `&mut Account` and is not bound to an owner or operation. The wrapper
 * address receives accumulator funds; a distinct derived account UID identifies
 * the account and anchors app data, while typed balances remain embedded in the
 * account. App data is namespaced by witness type, requires `Permit<App>` to
 * mutate, and remains publicly readable.
 */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@local-pkg/account::account';
export const Account = new MoveStruct({
	name: `${$moduleName}::Account`,
	fields: {
		/** Dynamic-field parent for account-owned application data. */
		account_id: bcs.Address,
		/** EOA address or object-ID-as-address that owns this account. */
		owner: bcs.Address,
		/** Wrapper-object address used as the accumulator delivery and withdrawal anchor. */
		receive_address: bcs.Address,
		/** Type-indexed stored `Balance<T>` values. */
		balances: bag.Bag,
		/** Type-indexed timestamps of the latest settlement attempt. */
		settlements: bag.Bag,
		/** Canonical account ID supplied at referral-based creation, if any. */
		referrer_account_id: bcs.option(bcs.Address),
		/** Referrer's wrapper address for accumulator delivery, if any. */
		referrer_receive_address: bcs.option(bcs.Address),
	},
});
export const AccountWrapper = new MoveStruct({
	name: `${$moduleName}::AccountWrapper`,
	fields: {
		id: bcs.Address,
		account: Account,
	},
});
export const DataKey = new MoveTuple({
	name: `${$moduleName}::DataKey<phantom App>`,
	fields: [bcs.bool()],
});
export const CoinKey = new MoveTuple({
	name: `${$moduleName}::CoinKey<phantom T>`,
	fields: [bcs.bool()],
});
export const Auth = new MoveStruct({
	name: `${$moduleName}::Auth`,
	fields: {
		kind: bcs.u8(),
		owner: bcs.Address,
	},
});
export interface IdArguments {
	self: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [self: RawTransactionArgument<string>];
	config?: {
		accountPackageId?: string;
	};
}
/** Returns the wrapper object ID. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LoadAccountArguments {
	self: RawTransactionArgument<string>;
}
export interface LoadAccountOptions {
	package?: string;
	arguments: LoadAccountArguments | [self: RawTransactionArgument<string>];
	config?: {
		accountPackageId?: string;
	};
}
/** Borrows the wrapped account for read-only composition. */
export function loadAccount(options: LoadAccountOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'load_account',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BalanceArguments {
	self: TransactionArgument;
}
export interface BalanceOptions {
	package?: string;
	arguments: BalanceArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Returns the total balance of `T` available to the account, including funds
 * delivered through the ambient accumulator but not yet settled into the account.
 */
export function balance(options: BalanceOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [
		null,
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface OwnerArguments {
	self: TransactionArgument;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
}
/**
 * Returns the account owner address. This may be an EOA address or an
 * object-ID-as-address.
 */
export function owner(options: OwnerOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AccountIdArguments {
	self: TransactionArgument;
}
export interface AccountIdOptions {
	package?: string;
	arguments: AccountIdArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
}
/** Returns the canonical account ID. */
export function accountId(options: AccountIdOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferrerAccountIdArguments {
	self: TransactionArgument;
}
export interface ReferrerAccountIdOptions {
	package?: string;
	arguments: ReferrerAccountIdArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
}
/**
 * Returns the canonical referrer account ID recorded at creation for external Move
 * composition.
 */
export function referrerAccountId(options: ReferrerAccountIdOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'referrer_account_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReferrerReceiveAddressArguments {
	self: TransactionArgument;
}
export interface ReferrerReceiveAddressOptions {
	package?: string;
	arguments: ReferrerReceiveAddressArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
}
/**
 * Returns the referrer's accumulator receive address for external Move
 * composition.
 */
export function referrerReceiveAddress(options: ReferrerReceiveAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'referrer_receive_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReceiveAddressArguments {
	self: TransactionArgument;
}
export interface ReceiveAddressOptions {
	package?: string;
	arguments: ReceiveAddressArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
}
/** Returns the accumulator receive address for this account (the wrapper address). */
export function receiveAddress(options: ReceiveAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'receive_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateAuthOptions {
	package?: string;
	arguments?: [];
	config?: {
		accountPackageId?: string;
	};
}
/** Creates owner authority bound to the transaction sender. */
export function generateAuth(options: GenerateAuthOptions = {}) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'generate_auth',
		});
}
export interface GenerateAuthAsObjectArguments {
	uid: RawTransactionArgument<string>;
}
export interface GenerateAuthAsObjectOptions {
	package?: string;
	arguments: GenerateAuthAsObjectArguments | [uid: RawTransactionArgument<string>];
	config?: {
		accountPackageId?: string;
	};
}
/** Creates owner authority bound to an owning object's address. */
export function generateAuthAsObject(options: GenerateAuthAsObjectOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['uid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'generate_auth_as_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ShareArguments {
	self: RawTransactionArgument<string>;
}
export interface ShareOptions {
	package?: string;
	arguments: ShareArguments | [self: RawTransactionArgument<string>];
	config?: {
		accountPackageId?: string;
	};
}
/** Shares a newly created account wrapper. */
export function share(options: ShareOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LoadAccountMutArguments {
	self: RawTransactionArgument<string>;
	auth: TransactionArgument;
}
export interface LoadAccountMutOptions {
	package?: string;
	arguments:
		LoadAccountMutArguments | [self: RawTransactionArgument<string>, auth: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
}
/**
 * Consumes owner or app authority and returns the account's full mutable surface.
 * Owner authority must match the stored owner; app authority is package-issued
 * after registry authorization and carries no owner or operation restriction.
 */
export function loadAccountMut(options: LoadAccountMutOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'auth'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'load_account_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SettleArguments {
	wrapper: RawTransactionArgument<string>;
}
export interface SettleOptions {
	package?: string;
	arguments: SettleArguments | [wrapper: RawTransactionArgument<string>];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Permissionlessly folds accumulator-delivered `T` at the wrapper address into
 * stored account balance. The per-coin timestamp is latched before reading the
 * accumulator, preventing duplicate withdrawal and same-timestamp double counting
 * even when no funds are available. Only the wrapper UID can authenticate the
 * address-balance withdrawal; value leaving the account still requires a mutable
 * borrow through `Auth`.
 */
export function settle(options: SettleOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [
		null,
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['wrapper'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'settle',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DepositArguments {
	self: TransactionArgument;
	coin: RawTransactionArgument<string>;
}
export interface DepositOptions {
	package?: string;
	arguments: DepositArguments | [self: TransactionArgument, coin: RawTransactionArgument<string>];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Deposits into stored balance only; callers that include accumulator funds must
 * settle through the wrapper first.
 */
export function deposit(options: DepositOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'deposit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: TransactionArgument;
	amount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [self: TransactionArgument, amount: RawTransactionArgument<number | bigint>];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Withdraws from stored balance only; callers that include accumulator funds must
 * settle through the wrapper first.
 */
export function withdraw(options: WithdrawOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DepositFundsArguments {
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	coin: RawTransactionArgument<string>;
}
export interface DepositFundsOptions {
	package?: string;
	arguments:
		| DepositFundsArguments
		| [
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				coin: RawTransactionArgument<string>,
		  ];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * PTB entrypoint that settles accumulator funds, consumes authority, and deposits
 * into stored balance in one call.
 */
export function depositFunds(options: DepositFundsOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [
		null,
		null,
		null,
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'auth', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'deposit_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawFundsArguments {
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	amount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawFundsOptions {
	package?: string;
	arguments:
		| WithdrawFundsArguments
		| [
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * PTB entrypoint that settles accumulator funds, consumes authority, and withdraws
 * from stored balance in one call.
 */
export function withdrawFunds(options: WithdrawFundsOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [
		null,
		null,
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'auth', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'withdraw_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AttachArguments<Data extends BcsType<any>> {
	self: TransactionArgument;
	Permit: TransactionArgument;
	data: RawTransactionArgument<Data>;
}
export interface AttachOptions<Data extends BcsType<any>> {
	package?: string;
	arguments:
		| AttachArguments<Data>
		| [self: TransactionArgument, Permit: TransactionArgument, data: RawTransactionArgument<Data>];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string, string];
}
/**
 * Attach an app's `Data` under its witness namespace. Requires `Permit<App>`.
 * Aborts if `App` already has data attached.
 */
export function attach<Data extends BcsType<any>>(options: AttachOptions<Data>) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null, `${options.typeArguments[1]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'Permit', 'data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'attach',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HasDataArguments {
	self: TransactionArgument;
}
export interface HasDataOptions {
	package?: string;
	arguments: HasDataArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/** Whether `App` has data attached to this account. */
export function hasData(options: HasDataOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'has_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowDataArguments {
	self: TransactionArgument;
}
export interface BorrowDataOptions {
	package?: string;
	arguments: BorrowDataArguments | [self: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string, string];
}
/**
 * Borrow an app's attached `Data`. Open (no witness): the slot is namespaced by
 * `App` and on-chain state is public, so composing apps can read it. Aborts if
 * nothing is attached.
 */
export function borrowData(options: BorrowDataOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'borrow_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowDataMutArguments {
	self: TransactionArgument;
	Permit: TransactionArgument;
}
export interface BorrowDataMutOptions {
	package?: string;
	arguments: BorrowDataMutArguments | [self: TransactionArgument, Permit: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string, string];
}
/**
 * Mutably borrow an app's attached `Data`. Requires `Permit<App>`. Aborts if
 * nothing is attached.
 */
export function borrowDataMut(options: BorrowDataMutOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'Permit'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'borrow_data_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DetachArguments {
	self: TransactionArgument;
	Permit: TransactionArgument;
}
export interface DetachOptions {
	package?: string;
	arguments: DetachArguments | [self: TransactionArgument, Permit: TransactionArgument];
	config?: {
		accountPackageId?: string;
	};
	typeArguments: [string, string];
}
/**
 * Detach and return an app's `Data`. Requires `Permit<App>`. Aborts if nothing is
 * attached.
 */
export function detach(options: DetachOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'Permit'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'detach',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
