// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Core configuration of the SuiNS application.
 *
 * This configuration is used to validate domains for registration and renewal. It
 * can only be stored as a valid config in the `SuiNS` object by an admin, hence
 * why all the functions are public. Having just the config object cannot pose a
 * security risk as it cannot be used.
 */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as vec_map from './deps/sui/vec_map.js';
export function CoreConfig() {
	return bcs.struct('CoreConfig', {
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
	});
}
export function _new(options: {
	package?: string;
	arguments:
		| [
				publicKey: RawTransactionArgument<number[]>,
				minLabelLength: RawTransactionArgument<number>,
				maxLabelLength: RawTransactionArgument<number>,
				paymentsVersion: RawTransactionArgument<number>,
				maxYears: RawTransactionArgument<number>,
				validTlds: RawTransactionArgument<string[]>,
				extra: RawTransactionArgument<string>,
		  ]
		| {
				publicKey: RawTransactionArgument<number[]>;
				minLabelLength: RawTransactionArgument<number>;
				maxLabelLength: RawTransactionArgument<number>;
				paymentsVersion: RawTransactionArgument<number>;
				maxYears: RawTransactionArgument<number>;
				validTlds: RawTransactionArgument<string[]>;
				extra: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		'vector<u8>',
		'u8',
		'u8',
		'u8',
		'u8',
		'vector<0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000001::string::String, 0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
	] satisfies string[];
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
export function public_key(options: {
	package?: string;
	arguments:
		| [config: RawTransactionArgument<string>]
		| {
				config: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::core_config::CoreConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function min_label_length(options: {
	package?: string;
	arguments:
		| [config: RawTransactionArgument<string>]
		| {
				config: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::core_config::CoreConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'min_label_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function max_label_length(options: {
	package?: string;
	arguments:
		| [config: RawTransactionArgument<string>]
		| {
				config: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::core_config::CoreConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'max_label_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function is_valid_tld(options: {
	package?: string;
	arguments:
		| [config: RawTransactionArgument<string>, tld: RawTransactionArgument<string>]
		| {
				config: RawTransactionArgument<string>;
				tld: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::core_config::CoreConfig`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['config', 'tld'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'is_valid_tld',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function payments_version(options: {
	package?: string;
	arguments:
		| [config: RawTransactionArgument<string>]
		| {
				config: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::core_config::CoreConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'payments_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function max_years(options: {
	package?: string;
	arguments:
		| [config: RawTransactionArgument<string>]
		| {
				config: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::core_config::CoreConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'core_config',
			function: 'max_years',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
