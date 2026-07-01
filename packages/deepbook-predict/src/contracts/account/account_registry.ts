/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Shared registry for canonical account creation.
 *
 * The registry owns the derivation root and controls the ecosystem app whitelist.
 * `account::account` owns deterministic wrapper derivation, account construction,
 * custody, settlement, and app-data invariants.
 */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/account::account_registry';
export const AccountAdminCap = new MoveStruct({
	name: `${$moduleName}::AccountAdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export const AccountRegistry = new MoveStruct({
	name: `${$moduleName}::AccountRegistry`,
	fields: {
		id: bcs.Address,
	},
});
export const AccountKey = new MoveTuple({
	name: `${$moduleName}::AccountKey`,
	fields: [bcs.Address],
});
export const AccountWrapperKey = new MoveTuple({
	name: `${$moduleName}::AccountWrapperKey`,
	fields: [bcs.Address],
});
export const AppKey = new MoveTuple({
	name: `${$moduleName}::AppKey<phantom App>`,
	fields: [bcs.bool()],
});
export interface DerivedAddressArguments {
	registry: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedAddressOptions {
	package?: string;
	arguments:
		| DerivedAddressArguments
		| [registry: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/**
 * Return the deterministic canonical account address for `owner` under this
 * registry.
 */
export function derivedAddress(options: DerivedAddressOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DerivedWrapperAddressArguments {
	registry: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedWrapperAddressOptions {
	package?: string;
	arguments:
		| DerivedWrapperAddressArguments
		| [registry: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/**
 * Return the deterministic account wrapper address for `owner` under this
 * registry.
 */
export function derivedWrapperAddress(options: DerivedWrapperAddressOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_wrapper_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DerivedExistsArguments {
	registry: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedExistsOptions {
	package?: string;
	arguments:
		| DerivedExistsArguments
		| [registry: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/** Return whether the canonical derived account has already been claimed. */
export function derivedExists(options: DerivedExistsOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DerivedWrapperExistsArguments {
	registry: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedWrapperExistsOptions {
	package?: string;
	arguments:
		| DerivedWrapperExistsArguments
		| [registry: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/** Return whether the derived account wrapper has already been claimed. */
export function derivedWrapperExists(options: DerivedWrapperExistsOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_wrapper_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewArguments {
	registry: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments: NewArguments | [registry: RawTransactionArgument<string>];
}
/** Create the sender's canonical derived account wrapper. */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewSelfOwnedArguments {
	registry: RawTransactionArgument<string>;
	ownerUid: RawTransactionArgument<string>;
}
export interface NewSelfOwnedOptions {
	package?: string;
	arguments:
		| NewSelfOwnedArguments
		| [registry: RawTransactionArgument<string>, ownerUid: RawTransactionArgument<string>];
}
/**
 * Create the canonical derived account wrapper owned by `owner_uid`'s object
 * address.
 */
export function newSelfOwned(options: NewSelfOwnedOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'ownerUid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'new_self_owned',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsAppAuthorizedArguments {
	registry: RawTransactionArgument<string>;
}
export interface IsAppAuthorizedOptions {
	package?: string;
	arguments: IsAppAuthorizedArguments | [registry: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return whether `App` is authorized for app-driven account access. */
export function isAppAuthorized(options: IsAppAuthorizedOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'is_app_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AuthorizeAppArguments {
	registry: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface AuthorizeAppOptions {
	package?: string;
	arguments:
		| AuthorizeAppArguments
		| [registry: RawTransactionArgument<string>, Cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Authorize `App` to generate app auth through this registry. */
export function authorizeApp(options: AuthorizeAppOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'authorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeAppArguments {
	registry: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface DeauthorizeAppOptions {
	package?: string;
	arguments:
		| DeauthorizeAppArguments
		| [registry: RawTransactionArgument<string>, Cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Remove `App` from the app account-loading whitelist. */
export function deauthorizeApp(options: DeauthorizeAppOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'deauthorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AssertAppIsAuthorizedArguments {
	registry: RawTransactionArgument<string>;
}
export interface AssertAppIsAuthorizedOptions {
	package?: string;
	arguments: AssertAppIsAuthorizedArguments | [registry: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Assert that `App` is authorized for app-driven account access. */
export function assertAppIsAuthorized(options: AssertAppIsAuthorizedOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'assert_app_is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GenerateAuthAsAppArguments {
	registry: RawTransactionArgument<string>;
	Permit: RawTransactionArgument<string>;
}
export interface GenerateAuthAsAppOptions {
	package?: string;
	arguments:
		| GenerateAuthAsAppArguments
		| [registry: RawTransactionArgument<string>, Permit: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Generate app authority after checking the registry whitelist. The `Permit<App>`
 * proves the caller is the module defining `App`.
 */
export function generateAuthAsApp(options: GenerateAuthAsAppOptions) {
	const packageAddress = options.package ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'Permit'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'generate_auth_as_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
