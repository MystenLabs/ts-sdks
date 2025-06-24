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
export function _new(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				clock: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<number | bigint>,
				expirationTimestampMs: RawTransactionArgument<boolean>,
				allowCreation: RawTransactionArgument<boolean>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				subdomain: RawTransactionArgument<string>;
				clock: RawTransactionArgument<string>;
				subdomainName: RawTransactionArgument<number | bigint>;
				expirationTimestampMs: RawTransactionArgument<boolean>;
				allowCreation: RawTransactionArgument<boolean>;
		  };
}) {
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
export function new_leaf(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				clock: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				subdomain: RawTransactionArgument<string>;
				clock: RawTransactionArgument<string>;
				subdomainName: RawTransactionArgument<string>;
		  };
}) {
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
export function remove_leaf(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				clock: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				subdomain: RawTransactionArgument<string>;
				clock: RawTransactionArgument<string>;
		  };
}) {
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
export function edit_setup(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				parent: RawTransactionArgument<string>,
				clock: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<boolean>,
				allowCreation: RawTransactionArgument<boolean>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				parent: RawTransactionArgument<string>;
				clock: RawTransactionArgument<string>;
				subdomainName: RawTransactionArgument<boolean>;
				allowCreation: RawTransactionArgument<boolean>;
		  };
}) {
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
export function set_target_address(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				subdomain: RawTransactionArgument<string>;
				newTarget: RawTransactionArgument<string | null>;
		  };
}) {
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
export function set_user_data(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				subdomain: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
				value: RawTransactionArgument<string>;
		  };
}) {
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
export function unset_user_data(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				subdomain: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				subdomain: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
		  };
}) {
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
