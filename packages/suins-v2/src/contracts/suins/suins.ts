// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The main module of the SuiNS application, defines the `SuiNS` object and the
 * authorization mechanism for interacting with the main data storage.
 *
 * Authorization mechanic: The Admin can authorize applications to access protected
 * features of the SuiNS, they're named with a prefix `app_*`. Once authorized,
 * application can get mutable access to the `Registry` and add to the application
 * `Balance`.
 *
 * At any moment any of the applications can be deathorized by the Admin making it
 * impossible for the deauthorized module to access the registry.
 *
 * ---
 *
 * Package Upgrades in mind:
 *
 * - None of the public functions of the SuiNS feature any specific types - instead
 *   we use generics to define the actual types in arbitrary modules.
 * - The `Registry` itself (the main feature of the application) is stored as a
 *   dynamic field so that we can change the type and the module that serves the
 *   registry without breaking the SuiNS compatibility.
 * - Any of the old modules can be deauthorized hence disabling its access to the
 *   registry and the balance.
 */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
export function AdminCap() {
	return bcs.struct('AdminCap', {
		id: object.UID(),
	});
}
export function SuiNS() {
	return bcs.struct('SuiNS', {
		id: object.UID(),
		/**
		 * The total balance of the SuiNS. Can be added to by authorized apps. Can be
		 * withdrawn only by the application Admin.
		 */
		balance: balance.Balance(),
	});
}
export function SUINS() {
	return bcs.struct('SUINS', {
		dummy_field: bcs.bool(),
	});
}
export function ConfigKey() {
	return bcs.struct('ConfigKey', {
		dummy_field: bcs.bool(),
	});
}
export function RegistryKey() {
	return bcs.struct('RegistryKey', {
		dummy_field: bcs.bool(),
	});
}
export function BalanceKey() {
	return bcs.struct('BalanceKey', {
		dummy_field: bcs.bool(),
	});
}
export function AppKey() {
	return bcs.struct('AppKey', {
		dummy_field: bcs.bool(),
	});
}
/**
 * Withdraw from the SuiNS balance directly and access the Coins within the same
 * transaction. This is useful for the admin to withdraw funds from the SuiNS and
 * then send them somewhere specific or keep at the address.
 */
export function withdraw(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Withdraw from the SuiNS balance of a custom coin type. */
export function withdraw_custom(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, _: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				_: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'withdraw_custom',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Authorize an application to access protected features of the SuiNS. */
export function authorize_app(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'authorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Deauthorize an application by removing its authorization key. */
export function deauthorize_app(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'deauthorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Check if an application is authorized to access protected features of the SuiNS. */
export function is_app_authorized(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::suins::SuiNS`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'is_app_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/**
 * Assert that an application is authorized to access protected features of the
 * SuiNS. Aborts with `EAppNotAuthorized` if not.
 */
export function assert_app_is_authorized(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::suins::SuiNS`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'assert_app_is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Adds balance to the SuiNS. */
export function app_add_balance<App extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [
				_: RawTransactionArgument<App>,
				self: RawTransactionArgument<string>,
				balance: RawTransactionArgument<string>,
		  ]
		| {
				_: RawTransactionArgument<App>;
				self: RawTransactionArgument<string>;
				balance: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	const parameterNames = ['_', 'self', 'balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'app_add_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Adds a balance of type `T` to the SuiNS protocol as an authorized app. */
export function app_add_custom_balance<App extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				_: RawTransactionArgument<App>,
				balance: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				_: RawTransactionArgument<App>;
				balance: RawTransactionArgument<string>;
		  };
	typeArguments: [string, string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${options.typeArguments[0]}`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self', '_', 'balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'app_add_custom_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/**
 * Get a mutable access to the `Registry` object. Can only be performed by
 * authorized applications.
 */
export function app_registry_mut<App extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<App>, self: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<App>;
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string, string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		`${packageAddress}::suins::SuiNS`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'app_registry_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Attach dynamic configuration object to the application. */
export function add_config<Config extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [
				_: RawTransactionArgument<string>,
				self: RawTransactionArgument<string>,
				config: RawTransactionArgument<Config>,
		  ]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
				config: RawTransactionArgument<Config>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['_', 'self', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'add_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Borrow configuration object. Read-only mode for applications. */
export function get_config(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::suins::SuiNS`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'get_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/**
 * Get the configuration object for editing. The admin should put it back after
 * editing (no extra check performed). Can be used to swap configuration since the
 * `T` has `drop`. Eg nothing is stopping the admin from removing the configuration
 * object and adding a new one.
 *
 * Fully taking the config also allows for edits within a transaction.
 */
export function remove_config(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'remove_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Get a read-only access to the `Registry` object. */
export function registry(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::suins::SuiNS`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'registry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Add a registry to the SuiNS. Can only be performed by the admin. */
export function add_registry<R extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [
				_: RawTransactionArgument<string>,
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<R>,
		  ]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
				registry: RawTransactionArgument<R>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['_', 'self', 'registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'suins',
			function: 'add_registry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
