// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A module that allows purchasing names in a different price by presenting a
 * reference of type T. Each `T` can have a separate configuration for a discount
 * percentage. If a `T` doesn't exist, registration will fail.
 *
 * Can be called only when promotions are active for a specific type T. Activation
 * / deactivation happens through PTBs.
 */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export function RegularDiscountsApp() {
	return bcs.tuple([bcs.bool()], { name: 'RegularDiscountsApp' });
}
export function DiscountKey() {
	return bcs.tuple([bcs.bool()], { name: 'DiscountKey' });
}
/** A function to register a name with a discount using type `T`. */
export function apply_percentage_discount<T extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				_: RawTransactionArgument<T>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				intent: RawTransactionArgument<string>;
				suins: RawTransactionArgument<string>;
				_: RawTransactionArgument<T>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::payment::PaymentIntent`,
		`${packageAddress}::suins::SuiNS`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['self', 'intent', 'suins', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'apply_percentage_discount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/**
 * A special function for DayOne registration. We separate it from the normal
 * registration flow because we only want it to be usable for activated DayOnes.
 */
export function apply_day_one_discount(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				dayOne: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				intent: RawTransactionArgument<string>;
				suins: RawTransactionArgument<string>;
				dayOne: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::payment::PaymentIntent`,
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::day_one::DayOne`,
	] satisfies string[];
	const parameterNames = ['self', 'intent', 'suins', 'dayOne'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'apply_day_one_discount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * An admin action to authorize a type T for special pricing.
 *
 * When authorizing, we reuse the core `PricingConfig` struct, and only accept it
 * if all the values are in the [0, 100] range. make sure that all the percentages
 * are in the [0, 99] range. We can use `free_claims` to giveaway free names.
 */
export function authorize_type(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				pricingConfig: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				_: RawTransactionArgument<string>;
				pricingConfig: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::pricing_config::PricingConfig`,
	] satisfies string[];
	const parameterNames = ['self', '_', 'pricingConfig'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'authorize_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** An admin action to deauthorize type T from getting discounts. */
export function deauthorize_type(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
				self: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::suins::AdminCap`,
		`${packageAddress}::house::DiscountHouse`,
	] satisfies string[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'deauthorize_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
