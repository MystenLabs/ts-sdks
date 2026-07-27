/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Registry holds all created pools. */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as versioned from './deps/sui/versioned.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as bag from './deps/sui/bag.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@deepbook/core::registry';
export const REGISTRY = new MoveStruct({
	name: `${$moduleName}::REGISTRY`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const DeepbookAdminCap = new MoveStruct({
	name: `${$moduleName}::DeepbookAdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export const DeepbookCorePauseCap = new MoveStruct({
	name: `${$moduleName}::DeepbookCorePauseCap`,
	fields: {
		id: bcs.Address,
	},
});
export const Registry = new MoveStruct({
	name: `${$moduleName}::Registry`,
	fields: {
		id: bcs.Address,
		inner: versioned.Versioned,
	},
});
export const RegistryInner = new MoveStruct({
	name: `${$moduleName}::RegistryInner`,
	fields: {
		allowed_versions: vec_set.VecSet(bcs.u64()),
		pools: bag.Bag,
		treasury_address: bcs.Address,
	},
});
export const PoolKey = new MoveStruct({
	name: `${$moduleName}::PoolKey`,
	fields: {
		base: type_name.TypeName,
		quote: type_name.TypeName,
	},
});
export const StableCoinKey = new MoveStruct({
	name: `${$moduleName}::StableCoinKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const BalanceManagerKey = new MoveStruct({
	name: `${$moduleName}::BalanceManagerKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const AllowedPauseCapsKey = new MoveTuple({
	name: `${$moduleName}::AllowedPauseCapsKey`,
	fields: [bcs.bool()],
});
export const AppKey = new MoveStruct({
	name: `${$moduleName}::AppKey<phantom App>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const AppKeyV2 = new MoveStruct({
	name: `${$moduleName}::AppKeyV2<phantom App>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AuthorizeAppArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface AuthorizeAppOptions {
	package?: string;
	arguments:
		| AuthorizeAppArguments
		| [self: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Authorize an application to access protected features of the DeepBook. */
export function authorizeApp(options: AuthorizeAppOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'authorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeAppArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface DeauthorizeAppOptions {
	package?: string;
	arguments:
		| DeauthorizeAppArguments
		| [self: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Deauthorize an application by removing its authorization key. */
export function deauthorizeApp(options: DeauthorizeAppOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'deauthorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AssertAppIsAuthorizedArguments {
	self: RawTransactionArgument<string>;
}
export interface AssertAppIsAuthorizedOptions {
	package?: string;
	arguments: AssertAppIsAuthorizedArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Assert that an application is authorized to access protected features of
 * DeepBook.
 */
export function assertAppIsAuthorized(options: AssertAppIsAuthorizedOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'assert_app_is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetTreasuryAddressArguments {
	self: RawTransactionArgument<string>;
	treasuryAddress: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface SetTreasuryAddressOptions {
	package?: string;
	arguments:
		| SetTreasuryAddressArguments
		| [
				self: RawTransactionArgument<string>,
				treasuryAddress: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
		  ];
}
/**
 * Sets the treasury address where the pool creation fees are sent By default, the
 * treasury address is the publisher of the deepbook package
 */
export function setTreasuryAddress(options: SetTreasuryAddressOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, 'address', null] satisfies (string | null)[];
	const parameterNames = ['self', 'treasuryAddress', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_treasury_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EnableVersionArguments {
	self: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	Cap: RawTransactionArgument<string>;
}
export interface EnableVersionOptions {
	package?: string;
	arguments:
		| EnableVersionArguments
		| [
				self: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				Cap: RawTransactionArgument<string>,
		  ];
}
/**
 * Enables a package version Only Admin can enable a package version This function
 * does not have version restrictions
 */
export function enableVersion(options: EnableVersionOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'version', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'enable_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DisableVersionArguments {
	self: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	Cap: RawTransactionArgument<string>;
}
export interface DisableVersionOptions {
	package?: string;
	arguments:
		| DisableVersionArguments
		| [
				self: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				Cap: RawTransactionArgument<string>,
		  ];
}
/**
 * Disables a package version Only Admin can disable a package version This
 * function does not have version restrictions
 */
export function disableVersion(options: DisableVersionOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'version', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'disable_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintPauseCapArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface MintPauseCapOptions {
	package?: string;
	arguments:
		| MintPauseCapArguments
		| [self: RawTransactionArgument<string>, Cap: RawTransactionArgument<string>];
}
/**
 * Mint a `DeepbookCorePauseCap`. The new cap's ID is recorded so it can later
 * disable a version via `disable_version_pause_cap`. Only Admin can mint. This
 * function does not have version restrictions.
 */
export function mintPauseCap(options: MintPauseCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'mint_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RevokePauseCapArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
	pauseCapId: RawTransactionArgument<string>;
}
export interface RevokePauseCapOptions {
	package?: string;
	arguments:
		| RevokePauseCapArguments
		| [
				self: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
				pauseCapId: RawTransactionArgument<string>,
		  ];
}
/**
 * Revoke a previously minted pause cap by ID. Only Admin can revoke. This function
 * does not have version restrictions.
 */
export function revokePauseCap(options: RevokePauseCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'Cap', 'pauseCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'revoke_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DisableVersionPauseCapArguments {
	self: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	pauseCap: RawTransactionArgument<string>;
}
export interface DisableVersionPauseCapOptions {
	package?: string;
	arguments:
		| DisableVersionPauseCapArguments
		| [
				self: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				pauseCap: RawTransactionArgument<string>,
		  ];
}
/**
 * Disable any allowed package version (including the current one) using a valid
 * `DeepbookCorePauseCap`. The pause cap must be in `allowed_pause_caps`. This
 * function is the emergency kill switch; admin can re-enable via `enable_version`.
 * This function does not have version restrictions.
 */
export function disableVersionPauseCap(options: DisableVersionPauseCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'version', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'disable_version_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddStablecoinArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface AddStablecoinOptions {
	package?: string;
	arguments:
		| AddStablecoinArguments
		| [self: RawTransactionArgument<string>, Cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Adds a stablecoin to the whitelist Only Admin can add stablecoin */
export function addStablecoin(options: AddStablecoinOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_stablecoin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveStablecoinArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface RemoveStablecoinOptions {
	package?: string;
	arguments:
		| RemoveStablecoinArguments
		| [self: RawTransactionArgument<string>, Cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Removes a stablecoin from the whitelist Only Admin can remove stablecoin */
export function removeStablecoin(options: RemoveStablecoinOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'remove_stablecoin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InitBalanceManagerMapArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface InitBalanceManagerMapOptions {
	package?: string;
	arguments:
		| InitBalanceManagerMapArguments
		| [self: RawTransactionArgument<string>, Cap: RawTransactionArgument<string>];
}
/** Adds the BalanceManagerKey dynamic field to the registry */
export function initBalanceManagerMap(options: InitBalanceManagerMapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'init_balance_manager_map',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetBalanceManagerIdsArguments {
	self: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface GetBalanceManagerIdsOptions {
	package?: string;
	arguments:
		| GetBalanceManagerIdsArguments
		| [self: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/** Get the balance manager IDs for a given owner */
export function getBalanceManagerIds(options: GetBalanceManagerIdsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'get_balance_manager_ids',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AllowedPauseCapsArguments {
	self: RawTransactionArgument<string>;
}
export interface AllowedPauseCapsOptions {
	package?: string;
	arguments: AllowedPauseCapsArguments | [self: RawTransactionArgument<string>];
}
/**
 * Get the set of pause cap IDs allowed to disable package versions. Returns an
 * empty set if no pause caps have been minted yet.
 */
export function allowedPauseCaps(options: AllowedPauseCapsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'allowed_pause_caps',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsStablecoinArguments {
	self: RawTransactionArgument<string>;
	stableType: TransactionArgument;
}
export interface IsStablecoinOptions {
	package?: string;
	arguments:
		| IsStablecoinArguments
		| [self: RawTransactionArgument<string>, stableType: TransactionArgument];
}
/** Returns whether the given coin is whitelisted */
export function isStablecoin(options: IsStablecoinOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'stableType'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'is_stablecoin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
