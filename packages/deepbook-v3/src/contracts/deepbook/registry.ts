// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Registry holds all created pools. */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
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
		id: object.UID,
	},
});
export const Registry = new MoveStruct({
	name: `${$moduleName}::Registry`,
	fields: {
		id: object.UID,
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
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'address',
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
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
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'u64',
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
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
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'u64',
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'version', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'disable_version',
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
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
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
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
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
export interface IsStablecoinArguments {
	self: RawTransactionArgument<string>;
	stableType: RawTransactionArgument<string>;
}
export interface IsStablecoinOptions {
	package?: string;
	arguments:
		| IsStablecoinArguments
		| [self: RawTransactionArgument<string>, stableType: RawTransactionArgument<string>];
}
/** Returns whether the given coin is whitelisted */
export function isStablecoin(options: IsStablecoinOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::type_name::TypeName',
	] satisfies string[];
	const parameterNames = ['self', 'stableType'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'is_stablecoin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
