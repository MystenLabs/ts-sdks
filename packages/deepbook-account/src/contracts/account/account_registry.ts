/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns the derivation root for canonical accounts and the global whitelist of
 * application witness types. App authorization is package-wide rather than
 * per-account: an authorized app can request full mutable authority for any
 * account wrapper supplied to its flow. `account::account` owns wrapper
 * construction, custody, accumulator settlement, and app-data invariants.
 */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
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
	registry?: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedAddressOptions {
	package?: string;
	arguments: DerivedAddressArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/**
 * Returns the deterministic canonical account address for external discovery and
 * PTB construction.
 */
export function derivedAddress(options: DerivedAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_address',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface DerivedWrapperAddressArguments {
	registry?: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedWrapperAddressOptions {
	package?: string;
	arguments: DerivedWrapperAddressArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/**
 * Returns the deterministic wrapper address for external discovery, accumulator
 * delivery, and PTB construction.
 */
export function derivedWrapperAddress(options: DerivedWrapperAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_wrapper_address',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface DerivedExistsArguments {
	registry?: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedExistsOptions {
	package?: string;
	arguments: DerivedExistsArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/** Returns whether the canonical account identity has been claimed. */
export function derivedExists(options: DerivedExistsOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_exists',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface DerivedWrapperExistsArguments {
	registry?: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface DerivedWrapperExistsOptions {
	package?: string;
	arguments: DerivedWrapperExistsArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/** Returns whether the canonical wrapper has been claimed. */
export function derivedWrapperExists(options: DerivedWrapperExistsOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['registry', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'derived_wrapper_exists',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface NewArguments {
	registry?: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments?: NewArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/**
 * Creates the sender's canonical account and wrapper, aborting if either derived
 * ID is already claimed.
 */
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'new',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface NewWithReferrerArguments {
	registry?: RawTransactionArgument<string>;
	referrer: RawTransactionArgument<string>;
}
export interface NewWithReferrerOptions {
	package?: string;
	arguments: NewWithReferrerArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/**
 * Creates the sender's canonical account and permanently records the supplied
 * wrapper's account identity and receive address as its referrer.
 */
export function newWithReferrer(options: NewWithReferrerOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'referrer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'new_with_referrer',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface NewSelfOwnedArguments {
	registry?: RawTransactionArgument<string>;
	ownerUid: RawTransactionArgument<string>;
}
export interface NewSelfOwnedOptions {
	package?: string;
	arguments: NewSelfOwnedArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
}
/**
 * Creates the canonical account owned by `owner_uid`'s object address, aborting if
 * either derived ID is already claimed.
 */
export function newSelfOwned(options: NewSelfOwnedOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'ownerUid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'new_self_owned',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface IsAppAuthorizedArguments {
	registry?: RawTransactionArgument<string>;
}
export interface IsAppAuthorizedOptions {
	package?: string;
	arguments?: IsAppAuthorizedArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/** Returns whether `App` may request package-issued mutable account authority. */
export function isAppAuthorized(options: IsAppAuthorizedOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'is_app_authorized',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface AuthorizeAppArguments {
	registry?: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface AuthorizeAppOptions {
	package?: string;
	arguments: AuthorizeAppArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/** Globally authorizes `App` to request mutable authority for account wrappers. */
export function authorizeApp(options: AuthorizeAppOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'authorize_app',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeAppArguments {
	registry?: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface DeauthorizeAppOptions {
	package?: string;
	arguments: DeauthorizeAppArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/** Revokes `App` from requesting new mutable account authority. */
export function deauthorizeApp(options: DeauthorizeAppOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'deauthorize_app',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface AssertAppIsAuthorizedArguments {
	registry?: RawTransactionArgument<string>;
}
export interface AssertAppIsAuthorizedOptions {
	package?: string;
	arguments?: AssertAppIsAuthorizedArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/** Aborts unless `App` is currently authorized for app-driven account access. */
export function assertAppIsAuthorized(options: AssertAppIsAuthorizedOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'assert_app_is_authorized',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface GenerateAuthAsAppArguments {
	registry?: RawTransactionArgument<string>;
	Permit: TransactionArgument;
}
export interface GenerateAuthAsAppOptions {
	package?: string;
	arguments: GenerateAuthAsAppArguments;
	config?: {
		accountRegistry: ConfigValue;
		accountPackageId?: string;
	};
	typeArguments: [string];
}
/**
 * Generates full mutable account authority after checking the global app
 * whitelist. `Permit<App>` restricts the request to the module that defines `App`;
 * the returned authority is not bound to an owner, wrapper, or operation.
 */
export function generateAuthAsApp(options: GenerateAuthAsAppOptions) {
	const packageAddress =
		options.package ?? options.config?.accountPackageId ?? '@local-pkg/account';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'Permit'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'account_registry',
			function: 'generate_auth_as_app',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.accountRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
