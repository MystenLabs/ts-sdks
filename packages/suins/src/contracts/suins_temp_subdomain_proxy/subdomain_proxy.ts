/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A `temporary` proxy used to proxy subdomain requests because we can't use
 * references in a PTB.
 *
 * Module has no tests as it's a plain proxy for other function calls. All
 * validation happens on those functions.
 *
 * This package will stop being used when we've implemented references in PTBs.
 */

import { type Transaction } from '@mysten/sui/transactions';
import {
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
export interface NewArguments {
	suins?: RawTransactionArgument<string>;
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
				suins: RawTransactionArgument<string> | undefined,
				subdomain: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				expirationTimestampMs: RawTransactionArgument<number | bigint>,
				allowCreation: RawTransactionArgument<boolean>,
				allowTimeExtension: RawTransactionArgument<boolean>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x2::clock::Clock',
		'0x1::string::String',
		'u64',
		'bool',
		'bool',
	] satisfies (string | null)[];
	const parameterNames = [
		'suins',
		'subdomain',
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
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'new',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface NewLeafArguments {
	suins?: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
	target: RawTransactionArgument<string>;
}
export interface NewLeafOptions {
	package?: string;
	arguments:
		| NewLeafArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				subdomain: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				target: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function newLeaf(options: NewLeafOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x2::clock::Clock',
		'0x1::string::String',
		'address',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'subdomain', 'subdomainName', 'target'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'new_leaf',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'new_leaf',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RemoveLeafArguments {
	suins?: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
}
export interface RemoveLeafOptions {
	package?: string;
	arguments:
		| RemoveLeafArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				subdomain: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function removeLeaf(options: RemoveLeafOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [null, null, '0x2::clock::Clock', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'subdomain', 'subdomainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'remove_leaf',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'remove_leaf',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface AddLeafMetadataArguments {
	suins?: RawTransactionArgument<string>;
	parent: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface AddLeafMetadataOptions {
	package?: string;
	arguments:
		| AddLeafMetadataArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				parent: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function addLeafMetadata(options: AddLeafMetadataOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x2::clock::Clock',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'parent', 'subdomainName', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'add_leaf_metadata',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'add_leaf_metadata',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RemoveLeafMetadataArguments {
	suins?: RawTransactionArgument<string>;
	parent: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface RemoveLeafMetadataOptions {
	package?: string;
	arguments:
		| RemoveLeafMetadataArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				parent: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function removeLeafMetadata(options: RemoveLeafMetadataOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x2::clock::Clock',
		'0x1::string::String',
		'0x1::string::String',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'parent', 'subdomainName', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'remove_leaf_metadata',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'remove_leaf_metadata',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface EditSetupArguments {
	suins?: RawTransactionArgument<string>;
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
				suins: RawTransactionArgument<string> | undefined,
				parent: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
				allowCreation: RawTransactionArgument<boolean>,
				allowTimeExtension: RawTransactionArgument<boolean>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function editSetup(options: EditSetupOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x2::clock::Clock',
		'0x1::string::String',
		'bool',
		'bool',
	] satisfies (string | null)[];
	const parameterNames = [
		'suins',
		'parent',
		'subdomainName',
		'allowCreation',
		'allowTimeExtension',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'edit_setup',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'edit_setup',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetTargetAddressArguments {
	suins?: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	newTarget: RawTransactionArgument<string | null>;
}
export interface SetTargetAddressOptions {
	package?: string;
	arguments:
		| SetTargetAddressArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				subdomain: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function setTargetAddress(options: SetTargetAddressOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x1::option::Option<address>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'subdomain', 'newTarget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'set_target_address',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetUserDataArguments {
	suins?: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface SetUserDataOptions {
	package?: string;
	arguments:
		| SetUserDataArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				subdomain: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function setUserData(options: SetUserDataOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [
		null,
		null,
		'0x1::string::String',
		'0x1::string::String',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'subdomain', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'set_user_data',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'set_user_data',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface UnsetUserDataArguments {
	suins?: RawTransactionArgument<string>;
	subdomain: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface UnsetUserDataOptions {
	package?: string;
	arguments:
		| UnsetUserDataArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				subdomain: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		tempSubdomainsProxyPackageId?: string;
	};
}
export function unsetUserData(options: UnsetUserDataOptions) {
	const packageAddress =
		options.package ?? options.config?.tempSubdomainsProxyPackageId ?? '@suins/subdomain-proxy';
	const argumentsTypes = [null, null, '0x1::string::String', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'subdomain', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subdomain_proxy',
			function: 'unset_user_data',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'subdomain_proxy',
									functionName: 'unset_user_data',
									parameterIndex: 0,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
