/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Core configuration of the SuiNS application.
 *
 * This configuration is used to validate domains for registration and renewal. It
 * can only be stored as a valid config in the `SuiNS` object by an admin, hence
 * why all the functions are public. Having just the config object cannot pose a
 * security risk as it cannot be used.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@suins/core::core_config';
export const CoreConfig = new MoveStruct({
	name: `${$moduleName}::CoreConfig`,
	fields: {
		/** Public key of the API server. Currently only used for direct setup. */
		public_key: bcs.vector(bcs.u8()),
		/**
		 * Minimum length of the label part of the domain. This is different from the base
		 * `domain` checks. This is our minimum acceptable length (for sales).
		 */
		min_label_length: bcs.u8(),
		/** Maximum length of the label part of the domain. */
		max_label_length: bcs.u8(),
		/** List of valid TLDs for registration / renewals. */
		valid_tlds: vec_set.VecSet(bcs.string()),
		/** The `PaymentIntent` version that can be used for handling sales. */
		payments_version: bcs.u8(),
		/** Maximum number of years available for a domain. */
		max_years: bcs.u8(),
		extra: vec_map.VecMap(bcs.string(), bcs.string()),
	},
});
export interface NewArguments {
	publicKey: RawTransactionArgument<number[]>;
	minLabelLength: RawTransactionArgument<number>;
	maxLabelLength: RawTransactionArgument<number>;
	paymentsVersion: RawTransactionArgument<number>;
	maxYears: RawTransactionArgument<number>;
	validTlds: RawTransactionArgument<string[]>;
	extra: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [
				publicKey: RawTransactionArgument<number[]>,
				minLabelLength: RawTransactionArgument<number>,
				maxLabelLength: RawTransactionArgument<number>,
				paymentsVersion: RawTransactionArgument<number>,
				maxYears: RawTransactionArgument<number>,
				validTlds: RawTransactionArgument<string[]>,
				extra: RawTransactionArgument<string>,
		  ];
}
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		'vector<u8>',
		'u8',
		'u8',
		'u8',
		'u8',
		'vector<0x1::string::String>',
		null,
	] satisfies (string | null)[];
	const parameterNames = [
		'publicKey',
		'minLabelLength',
		'maxLabelLength',
		'paymentsVersion',
		'maxYears',
		'validTlds',
		'extra',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PublicKeyArguments {
	config: RawTransactionArgument<string>;
}
export interface PublicKeyOptions {
	package?: string;
	arguments: PublicKeyArguments | [config: RawTransactionArgument<string>];
}
export function publicKey(options: PublicKeyOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinLabelLengthArguments {
	config: RawTransactionArgument<string>;
}
export interface MinLabelLengthOptions {
	package?: string;
	arguments: MinLabelLengthArguments | [config: RawTransactionArgument<string>];
}
export function minLabelLength(options: MinLabelLengthOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'min_label_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxLabelLengthArguments {
	config: RawTransactionArgument<string>;
}
export interface MaxLabelLengthOptions {
	package?: string;
	arguments: MaxLabelLengthArguments | [config: RawTransactionArgument<string>];
}
export function maxLabelLength(options: MaxLabelLengthOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'max_label_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsValidTldArguments {
	config: RawTransactionArgument<string>;
	tld: RawTransactionArgument<string>;
}
export interface IsValidTldOptions {
	package?: string;
	arguments:
		| IsValidTldArguments
		| [config: RawTransactionArgument<string>, tld: RawTransactionArgument<string>];
}
export function isValidTld(options: IsValidTldOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['config', 'tld'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'is_valid_tld',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PaymentsVersionArguments {
	config: RawTransactionArgument<string>;
}
export interface PaymentsVersionOptions {
	package?: string;
	arguments: PaymentsVersionArguments | [config: RawTransactionArgument<string>];
}
export function paymentsVersion(options: PaymentsVersionOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'payments_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxYearsArguments {
	config: RawTransactionArgument<string>;
}
export interface MaxYearsOptions {
	package?: string;
	arguments: MaxYearsArguments | [config: RawTransactionArgument<string>];
}
export function maxYears(options: MaxYearsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'max_years',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
