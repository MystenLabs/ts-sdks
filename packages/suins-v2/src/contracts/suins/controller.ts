// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveTuple, MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/core::controller';
export const ControllerV2 = new MoveTuple({
	name: `${$moduleName}::ControllerV2`,
	fields: [bcs.bool()],
});
export const Controller = new MoveStruct({
	name: `${$moduleName}::Controller`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface SetTargetAddressArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	newTarget: RawTransactionArgument<string | null>;
}
export interface SetTargetAddressOptions {
	package?: string;
	arguments:
		| SetTargetAddressArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ];
}
/** Set the target address of a domain. */
export function setTargetAddress(options: SetTargetAddressOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'newTarget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetReverseLookupArguments {
	suins: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface SetReverseLookupOptions {
	package?: string;
	arguments:
		| SetReverseLookupArguments
		| [suins: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
}
/** Set the reverse lookup address for the domain */
export function setReverseLookup(options: SetReverseLookupOptions) {
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
export interface UnsetReverseLookupArguments {
	suins: RawTransactionArgument<string>;
}
export interface UnsetReverseLookupOptions {
	package?: string;
	arguments: UnsetReverseLookupArguments | [suins: RawTransactionArgument<string>];
}
/** User-facing function - unset the reverse lookup address for the domain. */
export function unsetReverseLookup(options: UnsetReverseLookupOptions) {
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
export interface SetObjectReverseLookupArguments {
	suins: RawTransactionArgument<string>;
	obj: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface SetObjectReverseLookupOptions {
	package?: string;
	arguments:
		| SetObjectReverseLookupArguments
		| [
				suins: RawTransactionArgument<string>,
				obj: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
		  ];
}
/**
 * Allows setting the reverse lookup address for an object. Expects a mutable
 * reference of the object.
 */
export function setObjectReverseLookup(options: SetObjectReverseLookupOptions) {
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
export interface UnsetObjectReverseLookupArguments {
	suins: RawTransactionArgument<string>;
	obj: RawTransactionArgument<string>;
}
export interface UnsetObjectReverseLookupOptions {
	package?: string;
	arguments:
		| UnsetObjectReverseLookupArguments
		| [suins: RawTransactionArgument<string>, obj: RawTransactionArgument<string>];
}
/**
 * Allows unsetting the reverse lookup address for an object. Expects a mutable
 * reference of the object.
 */
export function unsetObjectReverseLookup(options: UnsetObjectReverseLookupOptions) {
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
export interface SetUserDataArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface SetUserDataOptions {
	package?: string;
	arguments:
		| SetUserDataArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
}
/** User-facing function - add a new key-value pair to the name record's data. */
export function setUserData(options: SetUserDataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetUserDataArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface UnsetUserDataOptions {
	package?: string;
	arguments:
		| UnsetUserDataArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ];
}
/** User-facing function - remove a key from the name record's data. */
export function unsetUserData(options: UnsetUserDataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnExpiredArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface BurnExpiredOptions {
	package?: string;
	arguments:
		| BurnExpiredArguments
		| [suins: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
export function burnExpired(options: BurnExpiredOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'burn_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnExpiredSubnameArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface BurnExpiredSubnameOptions {
	package?: string;
	arguments:
		| BurnExpiredSubnameArguments
		| [suins: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
export function burnExpiredSubname(options: BurnExpiredSubnameOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::subdomain_registration::SubDomainRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'burn_expired_subname',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
