// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Defines the `Domain` type and helper functions.
 *
 * Domains are structured similar to their web2 counterpart and the rules
 * determining what a valid domain is can be found here:
 * https://en.wikipedia.org/wiki/Domain_name#Domain_name_syntax
 */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export function Domain() {
	return bcs.struct('Domain', {
		/**
		 * Vector of labels that make up a domain.
		 *
		 * Labels are stored in reverse order such that the TLD is always in position `0`.
		 * e.g. domain "pay.name.sui" will be stored in the vector as ["sui", "name",
		 * "pay"].
		 */
		labels: bcs.vector(bcs.string()),
	});
}
export function _new(options: {
	package?: string;
	arguments:
		| [domain: RawTransactionArgument<string>]
		| {
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Converts a domain into a fully-qualified string representation. */
export function to_string(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'to_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Returns the `label` in a domain specified by `level`.
 *
 * Given the domain "pay.name.sui" the individual labels have the following levels:
 *
 * - "pay" - `2`
 * - "name" - `1`
 * - "sui" - `0`
 *
 * This means that the TLD will always be at level `0`.
 */
export function label(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, level: RawTransactionArgument<number | bigint>]
		| {
				self: RawTransactionArgument<string>;
				level: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`, 'u64'] satisfies string[];
	const parameterNames = ['self', 'level'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'label',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Returns the TLD (Top-Level Domain) of a `Domain`.
 *
 * "name.sui" -> "sui"
 */
export function tld(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'tld',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Returns the SLD (Second-Level Domain) of a `Domain`.
 *
 * "name.sui" -> "sui"
 */
export function sld(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'sld',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function number_of_levels(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'number_of_levels',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function is_subdomain(options: {
	package?: string;
	arguments:
		| [domain: RawTransactionArgument<string>]
		| {
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'is_subdomain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Derive the parent of a subdomain. e.g. `subdomain.example.sui` -> `example.sui` */
export function parent(options: {
	package?: string;
	arguments:
		| [domain: RawTransactionArgument<string>]
		| {
				domain: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'parent',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Checks if `parent` domain is a valid parent for `child`. */
export function is_parent_of(options: {
	package?: string;
	arguments:
		| [parent: RawTransactionArgument<string>, child: RawTransactionArgument<string>]
		| {
				parent: RawTransactionArgument<string>;
				child: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::domain::Domain`,
		`${packageAddress}::domain::Domain`,
	] satisfies string[];
	const parameterNames = ['parent', 'child'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'is_parent_of',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
