// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A `temporary` proxy used to proxy subdomain requests because we can't use
 * references in a PTB.
 *
 * Module has no tests as it's a plain proxy for other function calls. All
 * validation happens on those functions.
 *
 * This package will stop being used when we've implemented references in PTBs.
 */

import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export interface NewArguments {
	suins: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
	expirationTimestampMs: RawTransactionArgument<number | bigint>;
	allowCreation: RawTransactionArgument<boolean>;
	allowTimeExtension: RawTransactionArgument<boolean>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				expirationTimestampMs: RawTransactionArgument<number | bigint>,
				allowCreation: RawTransactionArgument<boolean>,
				allowTimeExtension: RawTransactionArgument<boolean>,
		  ];
}
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u64',
		'bool',
		'bool',
	] satisfies string[];
	const parameterNames = [
		'suins',
		'subdomain',
		'clock',
		'subdomainName',
		'expirationTimestampMs',
		'allowCreation',
		'allowTimeExtension',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewLeafArguments {
	suins: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
	target: RawTransactionArgument<string>;
}
export interface NewLeafOptions {
	package?: string;
	arguments:
		| NewLeafArguments
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				target: RawTransactionArgument<string>,
		  ];
}
export function newLeaf(options: NewLeafOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'address',
	] satisfies string[];
	const parameterNames = ['suins', 'subdomain', 'clock', 'subdomainName', 'target'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'new_leaf',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveLeafArguments {
	suins: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
}
export interface RemoveLeafOptions {
	package?: string;
	arguments:
		| RemoveLeafArguments
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
		  ];
}
export function removeLeaf(options: RemoveLeafOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['suins', 'subdomain', 'clock', 'subdomainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'remove_leaf',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EditSetupArguments {
	suins: RawTransactionArgument<string>;
	parent: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
	allowCreation: RawTransactionArgument<boolean>;
	allowTimeExtension: RawTransactionArgument<boolean>;
}
export interface EditSetupOptions {
	package?: string;
	arguments:
		| EditSetupArguments
		| [
				suins: RawTransactionArgument<string>,
				parent: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				allowCreation: RawTransactionArgument<boolean>,
				allowTimeExtension: RawTransactionArgument<boolean>,
		  ];
}
export function editSetup(options: EditSetupOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'bool',
		'bool',
	] satisfies string[];
	const parameterNames = [
		'suins',
		'parent',
		'clock',
		'subdomainName',
		'allowCreation',
		'allowTimeExtension',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'edit_setup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTargetAddressArguments {
	suins: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	newTarget: RawTransactionArgument<string | null>;
}
export interface SetTargetAddressOptions {
	package?: string;
	arguments:
		| SetTargetAddressArguments
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ];
}
export function setTargetAddress(options: SetTargetAddressOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'subdomain', 'newTarget', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetUserDataArguments {
	suins: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface SetUserDataOptions {
	package?: string;
	arguments:
		| SetUserDataArguments
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
}
export function setUserData(options: SetUserDataOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'subdomain', 'key', 'value', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'set_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetUserDataArguments {
	suins: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface UnsetUserDataOptions {
	package?: string;
	arguments:
		| UnsetUserDataArguments
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ];
}
export function unsetUserData(options: UnsetUserDataOptions) {
	const packageAddress = options.package ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::subdomain_registration::SubDomainRegistration',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'subdomain', 'key', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'unset_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
