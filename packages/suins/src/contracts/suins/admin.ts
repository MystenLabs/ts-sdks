/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Admin features of the SuiNS application. Meant to be called directly by the
 * suins admin.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/core::admin';
export const Admin = new MoveStruct({
	name: `${$moduleName}::Admin`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AuthorizeArguments {
	cap: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
}
export interface AuthorizeOptions {
	package?: string;
	arguments:
		| AuthorizeArguments
		| [cap: RawTransactionArgument<string>, suins?: RawTransactionArgument<string>];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
/**
 * Authorize the admin application in the SuiNS to get access to protected
 * functions. Must be called in order to use the rest of the functions.
 */
export function authorize(options: AuthorizeOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['cap', 'suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'admin',
			function: 'authorize',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 1,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'admin',
									functionName: 'authorize',
									parameterIndex: 1,
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
export interface ReserveDomainArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
	noYears: RawTransactionArgument<number>;
}
export interface ReserveDomainOptions {
	package?: string;
	arguments:
		| ReserveDomainArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string> | undefined,
				domainName: RawTransactionArgument<string>,
				noYears: RawTransactionArgument<number>,
		  ];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
/** Reserve a `domain` in the `SuiNS`. */
export function reserveDomain(options: ReserveDomainOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	const argumentsTypes = [null, null, '0x1::string::String', 'u8', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['_', 'suins', 'domainName', 'noYears'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'admin',
			function: 'reserve_domain',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 1,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'admin',
									functionName: 'reserve_domain',
									parameterIndex: 1,
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
export interface ReserveDomainsArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
	domains: RawTransactionArgument<Array<string>>;
	noYears: RawTransactionArgument<number>;
}
export interface ReserveDomainsOptions {
	package?: string;
	arguments:
		| ReserveDomainsArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string> | undefined,
				domains: RawTransactionArgument<Array<string>>,
				noYears: RawTransactionArgument<number>,
		  ];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
/** Reserve a list of domains. */
export function reserveDomains(options: ReserveDomainsOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/core';
	const argumentsTypes = [
		null,
		null,
		'vector<0x1::string::String>',
		'u8',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['_', 'suins', 'domains', 'noYears'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'admin',
			function: 'reserve_domains',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 1,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'admin',
									functionName: 'reserve_domains',
									parameterIndex: 1,
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
