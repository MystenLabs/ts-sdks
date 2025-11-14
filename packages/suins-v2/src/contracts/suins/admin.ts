// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Admin features of the SuiNS application. Meant to be called directly by the
 * suins admin.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/core::admin';
export const Admin = new MoveStruct({
	name: `${$moduleName}::Admin`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AuthorizeArguments {
	cap: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
}
export interface AuthorizeOptions {
	package?: string;
	arguments:
		| AuthorizeArguments
		| [cap: RawTransactionArgument<string>, suins: RawTransactionArgument<string>];
}
/**
 * Authorize the admin application in the SuiNS to get access to protected
 * functions. Must be called in order to use the rest of the functions.
 */
export function authorize(options: AuthorizeOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
	] satisfies string[];
	const parameterNames = ['cap', 'suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'admin',
			function: 'authorize',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReserveDomainArguments {
	_: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	noYears: RawTransactionArgument<number>;
}
export interface ReserveDomainOptions {
	package?: string;
	arguments:
		| ReserveDomainArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
				noYears: RawTransactionArgument<number>,
		  ];
}
/** Reserve a `domain` in the `SuiNS`. */
export function reserveDomain(options: ReserveDomainOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u8',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['_', 'suins', 'domainName', 'noYears'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'admin',
			function: 'reserve_domain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReserveDomainsArguments {
	_: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	domains: RawTransactionArgument<string[]>;
	noYears: RawTransactionArgument<number>;
}
export interface ReserveDomainsOptions {
	package?: string;
	arguments:
		| ReserveDomainsArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				domains: RawTransactionArgument<string[]>,
				noYears: RawTransactionArgument<number>,
		  ];
}
/** Reserve a list of domains. */
export function reserveDomains(options: ReserveDomainsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::suins::SuiNS`,
		'vector<0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
		'u8',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['_', 'suins', 'domains', 'noYears'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'admin',
			function: 'reserve_domains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
