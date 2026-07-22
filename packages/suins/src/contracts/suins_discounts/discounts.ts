/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A module that allows purchasing names in a different price by presenting a
 * reference of type T. Each `T` can have a separate configuration for a discount
 * percentage. If a `T` doesn't exist, registration will fail.
 *
 * Can be called only when promotions are active for a specific type T. Activation
 * / deactivation happens through PTBs.
 */

import {
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@suins/discounts::discounts';
export const RegularDiscountsApp = new MoveTuple({
	name: `${$moduleName}::RegularDiscountsApp`,
	fields: [bcs.bool()],
});
export const DiscountKey = new MoveTuple({
	name: `${$moduleName}::DiscountKey<phantom T>`,
	fields: [bcs.bool()],
});
export interface ApplyPercentageDiscountArguments<T extends BcsType<any>> {
	self?: RawTransactionArgument<string>;
	intent: TransactionArgument;
	suins?: RawTransactionArgument<string>;
	_: RawTransactionArgument<T>;
}
export interface ApplyPercentageDiscountOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| ApplyPercentageDiscountArguments<T>
		| [
				self: RawTransactionArgument<string> | undefined,
				intent: TransactionArgument,
				suins: RawTransactionArgument<string> | undefined,
				_: RawTransactionArgument<T>,
		  ];
	config?: {
		discountHouseId: ConfigValue;
		suins: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
/** A function to register a name with a discount using type `T`. */
export function applyPercentageDiscount<T extends BcsType<any>>(
	options: ApplyPercentageDiscountOptions<T>,
) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/discounts';
	const argumentsTypes = [null, null, null, `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'intent', 'suins', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'apply_percentage_discount',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.discountHouseId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'discounts',
									functionName: 'apply_percentage_discount',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'discountHouseId',
							),
					},
					{
						index: 2,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'discounts',
									functionName: 'apply_percentage_discount',
									parameterIndex: 2,
									parameterName: 'suins',
								},
								'suins',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface ApplyDayOneDiscountArguments {
	self?: RawTransactionArgument<string>;
	intent: TransactionArgument;
	suins?: RawTransactionArgument<string>;
	dayOne: RawTransactionArgument<string>;
}
export interface ApplyDayOneDiscountOptions {
	package?: string;
	arguments:
		| ApplyDayOneDiscountArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				intent: TransactionArgument,
				suins: RawTransactionArgument<string> | undefined,
				dayOne: RawTransactionArgument<string>,
		  ];
	config?: {
		discountHouseId: ConfigValue;
		suins: ConfigValue;
		packageId?: string;
	};
}
/**
 * A special function for DayOne registration. We separate it from the normal
 * registration flow because we only want it to be usable for activated DayOnes.
 */
export function applyDayOneDiscount(options: ApplyDayOneDiscountOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/discounts';
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'intent', 'suins', 'dayOne'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'apply_day_one_discount',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.discountHouseId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'discounts',
									functionName: 'apply_day_one_discount',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'discountHouseId',
							),
					},
					{
						index: 2,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'discounts',
									functionName: 'apply_day_one_discount',
									parameterIndex: 2,
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
export interface AuthorizeTypeArguments {
	self?: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	pricingConfig: TransactionArgument;
}
export interface AuthorizeTypeOptions {
	package?: string;
	arguments:
		| AuthorizeTypeArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				_: RawTransactionArgument<string>,
				pricingConfig: TransactionArgument,
		  ];
	config?: {
		discountHouseId: ConfigValue;
		packageId?: string;
	};
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
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/discounts';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', '_', 'pricingConfig'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'authorize_type',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.discountHouseId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'discounts',
									functionName: 'authorize_type',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'discountHouseId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeTypeArguments {
	_: RawTransactionArgument<string>;
	self?: RawTransactionArgument<string>;
}
export interface DeauthorizeTypeOptions {
	package?: string;
	arguments:
		| DeauthorizeTypeArguments
		| [_: RawTransactionArgument<string>, self?: RawTransactionArgument<string>];
	config?: {
		discountHouseId: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
/** An admin action to deauthorize type T from getting discounts. */
export function deauthorizeType(options: DeauthorizeTypeOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/discounts';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'discounts',
			function: 'deauthorize_type',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 1,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.discountHouseId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'discounts',
									functionName: 'deauthorize_type',
									parameterIndex: 1,
									parameterName: 'self',
								},
								'discountHouseId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
			typeArguments: options.typeArguments,
		});
}
