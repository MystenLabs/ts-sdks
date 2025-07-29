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

import { MoveTuple, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/discounts::discounts';
export const RegularDiscountsApp = new MoveTuple({
	name: `${$moduleName}::RegularDiscountsApp`,
	fields: [bcs.bool()],
});
export const DiscountKey = new MoveTuple({
	name: `${$moduleName}::DiscountKey`,
	fields: [bcs.bool()],
});
export interface ApplyPercentageDiscountArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	_: RawTransactionArgument<T>;
}
export interface ApplyPercentageDiscountOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| ApplyPercentageDiscountArguments<T>
		| [
				self: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				_: RawTransactionArgument<T>,
		  ];
	typeArguments: [string];
}
/** A function to register a name with a discount using type `T`. */
export function applyPercentageDiscount<T extends BcsType<any>>(
	options: ApplyPercentageDiscountOptions<T>,
) {
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
export interface ApplyDayOneDiscountArguments {
	self: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	dayOne: RawTransactionArgument<string>;
}
export interface ApplyDayOneDiscountOptions {
	package?: string;
	arguments:
		| ApplyDayOneDiscountArguments
		| [
				self: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				dayOne: RawTransactionArgument<string>,
		  ];
}
/**
 * A special function for DayOne registration. We separate it from the normal
 * registration flow because we only want it to be usable for activated DayOnes.
 */
export function applyDayOneDiscount(options: ApplyDayOneDiscountOptions) {
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
export interface AuthorizeTypeArguments {
	self: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	pricingConfig: RawTransactionArgument<string>;
}
export interface AuthorizeTypeOptions {
	package?: string;
	arguments:
		| AuthorizeTypeArguments
		| [
				self: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				pricingConfig: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * An admin action to authorize a type T for special pricing.
 *
 * When authorizing, we reuse the core `PricingConfig` struct, and only accept it
 * if all the values are in the [0, 100] range. make sure that all the percentages
 * are in the [0, 99] range. We can use `free_claims` to giveaway free names.
 */
export function authorizeType(options: AuthorizeTypeOptions) {
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
export interface DeauthorizeTypeArguments {
	_: RawTransactionArgument<string>;
	self: RawTransactionArgument<string>;
}
export interface DeauthorizeTypeOptions {
	package?: string;
	arguments:
		| DeauthorizeTypeArguments
		| [_: RawTransactionArgument<string>, self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** An admin action to deauthorize type T from getting discounts. */
export function deauthorizeType(options: DeauthorizeTypeOptions) {
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
