/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Account logic */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as versioning from './versioning.js';
const $moduleName = '@mysten/pas::account';
export const Account = new MoveStruct({
	name: `${$moduleName}::Account`,
	fields: {
		id: bcs.Address,
		/** The owner of the account (address or object) */
		owner: bcs.Address,
		/**
		 * The ID of the namespace that created this account. There's ONLY ONE namespace in
		 * the system, but this helps us avoid having `&Namespace` inputs in all functions
		 * that need to derive the IDs.
		 */
		namespace_id: bcs.Address,
		/**
		 * Block versions to break backwards compatibility -- only used in case of
		 * emergency.
		 */
		versioning: versioning.Versioning,
	},
});
export const Auth = new MoveTuple({ name: `${$moduleName}::Auth`, fields: [bcs.Address] });
export interface CreateArguments {
	namespace: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface CreateOptions {
	package?: string;
	arguments:
		| CreateArguments
		| [namespace: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/** Create a new account for `owner`. This is a permission-less action. */
export function create(options: CreateOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['namespace', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'create',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ShareArguments {
	account: RawTransactionArgument<string>;
}
export interface ShareOptions {
	package?: string;
	arguments: ShareArguments | [account: RawTransactionArgument<string>];
}
/**
 * The only way to finalize the TX is by sharing the account. All accounts are
 * shared by default.
 */
export function share(options: ShareOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['account'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAndShareArguments {
	namespace: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface CreateAndShareOptions {
	package?: string;
	arguments:
		| CreateAndShareArguments
		| [namespace: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/** Create and share a account in a single step. */
export function createAndShare(options: CreateAndShareOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['namespace', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'create_and_share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnlockBalanceArguments {
	account: RawTransactionArgument<string>;
	auth: TransactionArgument;
	amount: RawTransactionArgument<number | bigint>;
}
export interface UnlockBalanceOptions {
	package?: string;
	arguments:
		| UnlockBalanceArguments
		| [
				account: RawTransactionArgument<string>,
				auth: TransactionArgument,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Enables a fund unlock flow. This is useful for assets that are not managed by a
 * Policy within the system, or if there's a special case where an issuer allows
 * balances to flow out of the system.
 */
export function unlockBalance(options: UnlockBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['account', 'auth', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'unlock_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SendBalanceArguments {
	from: RawTransactionArgument<string>;
	auth: TransactionArgument;
	to: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface SendBalanceOptions {
	package?: string;
	arguments:
		| SendBalanceArguments
		| [
				from: RawTransactionArgument<string>,
				auth: TransactionArgument,
				to: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/** Initiate a transfer from account A to account B. */
export function sendBalance(options: SendBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['from', 'auth', 'to', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'send_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ClawbackBalanceArguments {
	from: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface ClawbackBalanceOptions {
	package?: string;
	arguments:
		| ClawbackBalanceArguments
		| [from: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Initiate a clawback request for an amount of funds. This takes no `Auth`, as
 * it's an admin action.
 *
 * This can only ever finalize if clawback is enabled in the policy.
 */
export function clawbackBalance(options: ClawbackBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['from', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'clawback_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnsafeSendBalanceArguments {
	from: RawTransactionArgument<string>;
	auth: TransactionArgument;
	recipientAddress: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface UnsafeSendBalanceOptions {
	package?: string;
	arguments:
		| UnsafeSendBalanceArguments
		| [
				from: RawTransactionArgument<string>,
				auth: TransactionArgument,
				recipientAddress: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Transfer `amount` from account to an address. This unlocks transfers to a
 * account before it has been created.
 *
 * It's marked as `unsafe_` as it's easy to accidentally pick the wrong recipient
 * address.
 */
export function unsafeSendBalance(options: UnsafeSendBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null, 'address', 'u64'] satisfies (string | null)[];
	const parameterNames = ['from', 'auth', 'recipientAddress', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'unsafe_send_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewAuthOptions {
	package?: string;
	arguments?: [];
}
/** Generate an ownership proof from the sender of the transaction. */
export function newAuth(options: NewAuthOptions = {}) {
	const packageAddress = options.package ?? '@mysten/pas';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'new_auth',
		});
}
export interface NewAuthAsObjectArguments {
	uid: RawTransactionArgument<string>;
}
export interface NewAuthAsObjectOptions {
	package?: string;
	arguments: NewAuthAsObjectArguments | [uid: RawTransactionArgument<string>];
}
/**
 * Generate an ownership proof from a `UID` object, to allow objects to own
 * accounts. `&mut UID` is intentional — it serves as proof of ownership over the
 * object.
 */
export function newAuthAsObject(options: NewAuthAsObjectOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['uid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'new_auth_as_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	account: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [account: RawTransactionArgument<string>];
}
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['account'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DepositBalanceArguments {
	account: RawTransactionArgument<string>;
	balance: TransactionArgument;
}
export interface DepositBalanceOptions {
	package?: string;
	arguments:
		| DepositBalanceArguments
		| [account: RawTransactionArgument<string>, balance: TransactionArgument];
	typeArguments: [string];
}
export function depositBalance(options: DepositBalanceOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['account', 'balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'deposit_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SyncVersioningArguments {
	account: RawTransactionArgument<string>;
	namespace: RawTransactionArgument<string>;
}
export interface SyncVersioningOptions {
	package?: string;
	arguments:
		| SyncVersioningArguments
		| [account: RawTransactionArgument<string>, namespace: RawTransactionArgument<string>];
}
/** Permission-less operation to bring versioning up-to-date with the namespace. */
export function syncVersioning(options: SyncVersioningOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['account', 'namespace'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account',
			function: 'sync_versioning',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
