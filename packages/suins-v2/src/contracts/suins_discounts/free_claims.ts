// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A module that allows claiming names of a set length for free by presenting an
 * object T. Each `T` can have a separate configuration for a discount percentage.
 * If a `T` doesn't exist, registration will fail.
 *
 * Can be called only when promotions are active for a specific type T. Activation
 * / deactivation happens through PTBs.
 */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as pricing_config from './deps/suins/pricing_config.js';
import * as linked_table from './deps/sui/linked_table.js';
export function FreeClaimsApp() {
	return bcs.tuple([bcs.bool()], { name: 'FreeClaimsApp' });
}
export function FreeClaimsKey() {
	return bcs.tuple([bcs.bool()], { name: 'FreeClaimsKey' });
}
export function FreeClaimsConfig() {
	return bcs.struct('FreeClaimsConfig', {
		domain_length_range: pricing_config.Range(),
		used_objects: linked_table.LinkedTable(bcs.Address),
	});
}
/** A function to register a name with a discount using type `T`. */
export function free_claim<T extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				object: RawTransactionArgument<T>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				suins: RawTransactionArgument<string>;
				intent: RawTransactionArgument<string>;
				object: RawTransactionArgument<T>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::payment::PaymentIntent`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['self', 'suins', 'intent', 'object'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'free_claim',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export function free_claim_with_day_one(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				dayOne: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				suins: RawTransactionArgument<string>;
				intent: RawTransactionArgument<string>;
				dayOne: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::payment::PaymentIntent`,
		`${packageAddress}::day_one::DayOne`,
	] satisfies string[];
	const parameterNames = ['self', 'suins', 'intent', 'dayOne'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'free_claim_with_day_one',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * An admin action to authorize a type T for free claiming of names by presenting
 * an object of type `T`.
 */
export function authorize_type(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				domainLengthRange: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				_: RawTransactionArgument<string>;
				domainLengthRange: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::pricing_config::Range`,
	] satisfies string[];
	const parameterNames = ['self', '_', 'domainLengthRange'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'authorize_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Force-deauthorize type T from free claims. Drops the linked_table. */
export function deauthorize_type(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, _: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				_: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::suins::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'deauthorize_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
