// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export function ControllerV2() {
	return bcs.tuple([bcs.bool()], { name: 'ControllerV2' });
}
export function Controller() {
	return bcs.struct('Controller', {
		dummy_field: bcs.bool(),
	});
}
/** Set the target address of a domain. */
export function set_target_address(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
				newTarget: RawTransactionArgument<string | null>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'newTarget', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Set the reverse lookup address for the domain */
export function set_reverse_lookup(options: {
	package?: string;
	arguments:
		| [suins: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>]
		| {
				suins: RawTransactionArgument<string>;
				domainName: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['suins', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** User-facing function - unset the reverse lookup address for the domain. */
export function unset_reverse_lookup(options: {
	package?: string;
	arguments:
		| [suins: RawTransactionArgument<string>]
		| {
				suins: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::suins::SuiNS`] satisfies string[];
	const parameterNames = ['suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Allows setting the reverse lookup address for an object. Expects a mutable
 * reference of the object.
 */
export function set_object_reverse_lookup(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				obj: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				obj: RawTransactionArgument<string>;
				domainName: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::UID',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['suins', 'obj', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_object_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Allows unsetting the reverse lookup address for an object. Expects a mutable
 * reference of the object.
 */
export function unset_object_reverse_lookup(options: {
	package?: string;
	arguments:
		| [suins: RawTransactionArgument<string>, obj: RawTransactionArgument<string>]
		| {
				suins: RawTransactionArgument<string>;
				obj: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::UID',
	] satisfies string[];
	const parameterNames = ['suins', 'obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_object_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** User-facing function - add a new key-value pair to the name record's data. */
export function set_user_data(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
				value: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'key', 'value', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** User-facing function - remove a key from the name record's data. */
export function unset_user_data(options: {
	package?: string;
	arguments:
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ]
		| {
				suins: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'key', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function burn_expired(options: {
	package?: string;
	arguments:
		| [suins: RawTransactionArgument<string>, nft: RawTransactionArgument<string>]
		| {
				suins: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'burn_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function burn_expired_subname(options: {
	package?: string;
	arguments:
		| [suins: RawTransactionArgument<string>, nft: RawTransactionArgument<string>]
		| {
				suins: RawTransactionArgument<string>;
				nft: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::subdomain_registration::SubDomainRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'burn_expired_subname',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
