/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A pure, reusable on-chain account: a shared wrapper owns the account data and
 * controls who can borrow it mutably.
 *
 * Owner, object-owner, and app flows consume an `Auth` hot potato to load
 * `&mut Account` from the wrapper. Once a caller has a mutable account reference,
 * value movement needs no extra proof: the borrow itself is the authority
 * boundary. Coin reads include funds delivered to this account's accumulator
 * address, and coin writes first settle those funds into the account.
 *
 * Apps also store opaque per-account state through the app-data lane (`attach` /
 * `borrow_data` / `detach`): a dynamic field namespaced by the app's witness type,
 * so apps cannot collide. Mutations require `Permit<App>`; reads are open.
 */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bag from './deps/sui/bag.js';
import * as bag_1 from './deps/sui/bag.js';
const $moduleName = '@local-pkg/account::account';
export const Account = new MoveStruct({
	name: `${$moduleName}::Account`,
	fields: {
		account_id: bcs.Address,
		/** EOA address or object-ID-as-address that owns this account. */
		owner: bcs.Address,
		/**
		 * The wrapper object's address: the accumulator/funds-receive anchor. Funds are
		 * delivered here and settled out via `&mut AccountWrapper.id` — a real shared
		 * object the runtime can authenticate, unlike the nested `account_id` UID, which
		 * can never back an address-balance withdrawal.
		 */
		receive_address: bcs.Address,
		balances: bag.Bag,
		settlements: bag_1.Bag,
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
export const CoinKey = new MoveStruct({
	name: `${$moduleName}::CoinKey<phantom T>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Auth = new MoveStruct({
	name: `${$moduleName}::Auth`,
	fields: {
		kind: bcs.u8(),
		owner: bcs.Address,
	},
});
export interface ShareArguments {
	self: RawTransactionArgument<string>;
}
export interface ShareOptions {
	package?: string;
	arguments: ShareArguments | [self: RawTransactionArgument<string>];
}
/** Share a newly created account object. */
export function share(options: ShareOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface IdArguments {
	self: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [self: RawTransactionArgument<string>];
}
/** Returns the wrapper object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface GenerateAuthOptions {
	package?: string;
	arguments?: [];
}
/** Generate owner authority from the transaction sender. */
export function generateAuth(options: GenerateAuthOptions = {}) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
}
/** Generate owner authority from an owning object's UID. */
export function generateAuthAsObject(options: GenerateAuthAsObjectOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface LoadAccountArguments {
	self: RawTransactionArgument<string>;
}
export interface LoadAccountOptions {
	package?: string;
	arguments: LoadAccountArguments | [self: RawTransactionArgument<string>];
}
/** Borrow the wrapped account for read-only use. */
export function loadAccount(options: LoadAccountOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface LoadAccountMutArguments {
	self: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
}
export interface LoadAccountMutOptions {
	package?: string;
	arguments:
		| LoadAccountMutArguments
		| [self: RawTransactionArgument<string>, auth: RawTransactionArgument<string>];
}
/** Borrow the wrapped account mutably by consuming an `Auth` hot potato. */
export function loadAccountMut(options: LoadAccountMutOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface BalanceArguments {
	self: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface BalanceOptions {
	package?: string;
	arguments:
		| BalanceArguments
		| [self: RawTransactionArgument<string>, root: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Returns the total balance of `T` available to the account, including funds
 * delivered through the ambient accumulator but not yet settled into the account.
 */
export function balance(options: BalanceOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'root'];
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
	self: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [self: RawTransactionArgument<string>];
}
/**
 * Returns the account owner address. This may be an EOA address or an
 * object-ID-as-address.
 */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	self: RawTransactionArgument<string>;
}
export interface AccountIdOptions {
	package?: string;
	arguments: AccountIdArguments | [self: RawTransactionArgument<string>];
}
/** Returns the canonical account ID. */
export function accountId(options: AccountIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface ReceiveAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface ReceiveAddressOptions {
	package?: string;
	arguments: ReceiveAddressArguments | [self: RawTransactionArgument<string>];
}
/** Returns the accumulator receive address for this account (the wrapper address). */
export function receiveAddress(options: ReceiveAddressOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
export interface SettleArguments {
	wrapper: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface SettleOptions {
	package?: string;
	arguments:
		| SettleArguments
		| [wrapper: RawTransactionArgument<string>, root: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Fold any accumulator-delivered funds for `T` (sent to this account's receive
 * address) into stored balance. Withdrawing the address balance uses
 * `&mut wrapper.id` — a real shared object the runtime authenticates as a
 * transaction input. Each public flow that touches `T` settles at its boundary,
 * where the wrapper is in scope, so the deep `&mut Account` custody ops below stay
 * pure stored-balance.
 *
 * Permissionless: it only consolidates the account's own funds and moves nothing
 * out, so it needs no `Auth`; pulling funds out still requires
 * `load_account_mut(auth)`.
 */
export function settle(options: SettleOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'root'];
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
	self: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface DepositOptions {
	package?: string;
	arguments:
		| DepositArguments
		| [self: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Deposit `coin` into the wrapped account's stored `T` balance. Pure
 * stored-balance: callers settle accumulator funds at the flow boundary via
 * `settle` (the deep `&mut Account` here cannot reach the wrapper id needed to
 * authenticate a settle).
 */
export function deposit(options: DepositOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	self: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [self: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Withdraw `amount` of `T` from stored balance. Pure stored-balance (see
 * `deposit`): callers settle accumulator funds at the flow boundary via `settle`
 * first.
 */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	auth: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface DepositFundsOptions {
	package?: string;
	arguments:
		| DepositFundsArguments
		| [
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
				root: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Deposit `coin` into the wrapped account's stored `T` balance from a transaction.
 * `deposit` borrows `&mut Account`, which a PTB cannot carry across commands out
 * of `load_account_mut`, so this folds settle → authorize → load → deposit into
 * one entrypoint (the same shape predict's `mint`/`redeem` use for
 * account-authorized flows).
 */
export function depositFunds(options: DepositFundsOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'auth', 'coin', 'root'];
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
	auth: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface WithdrawFundsOptions {
	package?: string;
	arguments:
		| WithdrawFundsArguments
		| [
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * PTB-callable withdraw: folds settle → authorize → load → withdraw into one
 * entrypoint (see `deposit_funds`).
 */
export function withdrawFunds(options: WithdrawFundsOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null, 'u64', null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['wrapper', 'auth', 'amount', 'root'];
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
	self: RawTransactionArgument<string>;
	Permit: RawTransactionArgument<string>;
	data: RawTransactionArgument<Data>;
}
export interface AttachOptions<Data extends BcsType<any>> {
	package?: string;
	arguments:
		| AttachArguments<Data>
		| [
				self: RawTransactionArgument<string>,
				Permit: RawTransactionArgument<string>,
				data: RawTransactionArgument<Data>,
		  ];
	typeArguments: [string, string];
}
/**
 * Attach an app's `Data` under its witness namespace. Requires `Permit<App>`.
 * Aborts if `App` already has data attached.
 */
export function attach<Data extends BcsType<any>>(options: AttachOptions<Data>) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	self: RawTransactionArgument<string>;
}
export interface HasDataOptions {
	package?: string;
	arguments: HasDataArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Whether `App` has data attached to this account. */
export function hasData(options: HasDataOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	self: RawTransactionArgument<string>;
}
export interface BorrowDataOptions {
	package?: string;
	arguments: BorrowDataArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Borrow an app's attached `Data`. Open (no witness): the slot is namespaced by
 * `App` and on-chain state is public, so composing apps can read it. Aborts if
 * nothing is attached.
 */
export function borrowData(options: BorrowDataOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	self: RawTransactionArgument<string>;
	Permit: RawTransactionArgument<string>;
}
export interface BorrowDataMutOptions {
	package?: string;
	arguments:
		| BorrowDataMutArguments
		| [self: RawTransactionArgument<string>, Permit: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Mutably borrow an app's attached `Data`. Requires `Permit<App>`. Aborts if
 * nothing is attached.
 */
export function borrowDataMut(options: BorrowDataMutOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
	self: RawTransactionArgument<string>;
	Permit: RawTransactionArgument<string>;
}
export interface DetachOptions {
	package?: string;
	arguments:
		| DetachArguments
		| [self: RawTransactionArgument<string>, Permit: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Detach and return an app's `Data`. Requires `Permit<App>`. Aborts if nothing is
 * attached.
 */
export function detach(options: DetachOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
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
