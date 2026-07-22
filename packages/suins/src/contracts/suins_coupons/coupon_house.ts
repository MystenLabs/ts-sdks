/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A module to support coupons for SuiNS. This module allows secondary modules
 * (e.g. Discord) to add or remove coupons too. This allows for separation of logic
 * & ease of de-authorization in case we don't want some functionality anymore.
 *
 * Coupons are unique string codes, that can be used (based on the business rules)
 * to claim discounts in the app. Each coupon is validated towards a list of rules.
 * View `rules` module for explanation. The app is authorized on `SuiNS` to be able
 * to claim names and add earnings to the registry.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as data from './data.js';
const $moduleName = '@suins/coupons::coupon_house';
export const CouponsApp = new MoveStruct({
	name: `${$moduleName}::CouponsApp`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const AppKey = new MoveStruct({
	name: `${$moduleName}::AppKey<phantom A>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const CouponHouse = new MoveStruct({
	name: `${$moduleName}::CouponHouse`,
	fields: {
		data: data.Data,
		version: bcs.u8(),
		storage: bcs.Address,
	},
});
export interface SetupArguments {
	suins?: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface SetupOptions {
	package?: string;
	arguments:
		| SetupArguments
		| [suins: RawTransactionArgument<string> | undefined, cap: RawTransactionArgument<string>];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
/** Called once to setup the CouponHouse on SuiNS. */
export function setup(options: SetupOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['suins', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'setup',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'coupon_house',
									functionName: 'setup',
									parameterIndex: 0,
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
export interface ApplyCouponArguments {
	suins?: RawTransactionArgument<string>;
	intent: TransactionArgument;
	couponCode: RawTransactionArgument<string>;
}
export interface ApplyCouponOptions {
	package?: string;
	arguments:
		| ApplyCouponArguments
		| [
				suins: RawTransactionArgument<string> | undefined,
				intent: TransactionArgument,
				couponCode: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
export function applyCoupon(options: ApplyCouponOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null, '0x1::string::String', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'intent', 'couponCode'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'apply_coupon',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'coupon_house',
									functionName: 'apply_coupon',
									parameterIndex: 0,
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
export interface RegisterWithCouponArguments {
	Suins: RawTransactionArgument<string>;
	CouponCode: RawTransactionArgument<string>;
	DomainName: RawTransactionArgument<string>;
	NoYears: RawTransactionArgument<number>;
	Payment: RawTransactionArgument<string>;
}
export interface RegisterWithCouponOptions {
	package?: string;
	arguments:
		| RegisterWithCouponArguments
		| [
				Suins: RawTransactionArgument<string>,
				CouponCode: RawTransactionArgument<string>,
				DomainName: RawTransactionArgument<string>,
				NoYears: RawTransactionArgument<number>,
				Payment: RawTransactionArgument<string>,
		  ];
	config?: {
		packageId?: string;
	};
}
export function registerWithCoupon(options: RegisterWithCouponOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [
		null,
		'0x1::string::String',
		'0x1::string::String',
		'u8',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['Suins', 'CouponCode', 'DomainName', 'NoYears', 'Payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'register_with_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CalculateSalePriceArguments {
	Suins: RawTransactionArgument<string>;
	Price: RawTransactionArgument<number | bigint>;
	CouponCode: RawTransactionArgument<string>;
}
export interface CalculateSalePriceOptions {
	package?: string;
	arguments:
		| CalculateSalePriceArguments
		| [
				Suins: RawTransactionArgument<string>,
				Price: RawTransactionArgument<number | bigint>,
				CouponCode: RawTransactionArgument<string>,
		  ];
	config?: {
		packageId?: string;
	};
}
export function calculateSalePrice(options: CalculateSalePriceOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, 'u64', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['Suins', 'Price', 'CouponCode'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'calculate_sale_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AppDataMutArguments<A extends BcsType<any>> {
	suins?: RawTransactionArgument<string>;
	_: RawTransactionArgument<A>;
}
export interface AppDataMutOptions<A extends BcsType<any>> {
	package?: string;
	arguments:
		| AppDataMutArguments<A>
		| [suins: RawTransactionArgument<string> | undefined, _: RawTransactionArgument<A>];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
export function appDataMut<A extends BcsType<any>>(options: AppDataMutOptions<A>) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['suins', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'app_data_mut',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'suins',
						resolve: () =>
							resolveConfigArgument(
								options.config?.suins,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'coupon_house',
									functionName: 'app_data_mut',
									parameterIndex: 0,
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
export interface AuthorizeAppArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
}
export interface AuthorizeAppOptions {
	package?: string;
	arguments:
		| AuthorizeAppArguments
		| [_: RawTransactionArgument<string>, suins?: RawTransactionArgument<string>];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
/**
 * Authorize an app on the coupon house. This allows to a secondary module to
 * add/remove coupons.
 */
export function authorizeApp(options: AuthorizeAppOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'authorize_app',
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
									moduleName: 'coupon_house',
									functionName: 'authorize_app',
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
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeAppArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
}
export interface DeauthorizeAppOptions {
	package?: string;
	arguments:
		| DeauthorizeAppArguments
		| [_: RawTransactionArgument<string>, suins?: RawTransactionArgument<string>];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
/** De-authorize an app. The app can no longer add or remove */
export function deauthorizeApp(options: DeauthorizeAppOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['_', 'suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'deauthorize_app',
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
									moduleName: 'coupon_house',
									functionName: 'deauthorize_app',
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
			typeArguments: options.typeArguments,
		});
}
export interface SetVersionArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
	version: RawTransactionArgument<number>;
}
export interface SetVersionOptions {
	package?: string;
	arguments:
		| SetVersionArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string> | undefined,
				version: RawTransactionArgument<number>,
		  ];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
/**
 * An admin helper to set the version of the shared object. Registrations are only
 * possible if the latest version is being used.
 */
export function setVersion(options: SetVersionOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null, 'u8'] satisfies (string | null)[];
	const parameterNames = ['_', 'suins', 'version'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'set_version',
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
									moduleName: 'coupon_house',
									functionName: 'set_version',
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
export interface AssertVersionIsValidArguments {
	self: TransactionArgument;
}
export interface AssertVersionIsValidOptions {
	package?: string;
	arguments: AssertVersionIsValidArguments | [self: TransactionArgument];
	config?: {
		packageId?: string;
	};
}
/** Validate that the version of the app is the latest. */
export function assertVersionIsValid(options: AssertVersionIsValidOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'assert_version_is_valid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AdminAddCouponArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	kind: RawTransactionArgument<number>;
	amount: RawTransactionArgument<number | bigint>;
	rules: TransactionArgument;
}
export interface AdminAddCouponOptions {
	package?: string;
	arguments:
		| AdminAddCouponArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string> | undefined,
				code: RawTransactionArgument<string>,
				kind: RawTransactionArgument<number>,
				amount: RawTransactionArgument<number | bigint>,
				rules: TransactionArgument,
		  ];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
/**
 * To create a coupon, you have to call the PTB in the specific order
 *
 * 1.  (Optional) Call rules::new_domain_length_rule(type, length) // generate a
 *     length specific rule (e.g. only domains of size 5)
 * 2.  Call rules::coupon_rules(...) to create the coupon's ruleset.
 */
export function adminAddCoupon(options: AdminAddCouponOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null, '0x1::string::String', 'u8', 'u64', null] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['_', 'suins', 'code', 'kind', 'amount', 'rules'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'admin_add_coupon',
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
									moduleName: 'coupon_house',
									functionName: 'admin_add_coupon',
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
export interface AdminRemoveCouponArguments {
	_: RawTransactionArgument<string>;
	suins?: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
}
export interface AdminRemoveCouponOptions {
	package?: string;
	arguments:
		| AdminRemoveCouponArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string> | undefined,
				code: RawTransactionArgument<string>,
		  ];
	config?: {
		suins: ConfigValue;
		packageId?: string;
	};
}
export function adminRemoveCoupon(options: AdminRemoveCouponOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['_', 'suins', 'code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'admin_remove_coupon',
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
									moduleName: 'coupon_house',
									functionName: 'admin_remove_coupon',
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
export interface AppAddCouponArguments {
	data: TransactionArgument;
	code: RawTransactionArgument<string>;
	kind: RawTransactionArgument<number>;
	amount: RawTransactionArgument<number | bigint>;
	rules: TransactionArgument;
}
export interface AppAddCouponOptions {
	package?: string;
	arguments:
		| AppAddCouponArguments
		| [
				data: TransactionArgument,
				code: RawTransactionArgument<string>,
				kind: RawTransactionArgument<number>,
				amount: RawTransactionArgument<number | bigint>,
				rules: TransactionArgument,
		  ];
	config?: {
		packageId?: string;
	};
}
export function appAddCoupon(options: AppAddCouponOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, '0x1::string::String', 'u8', 'u64', null] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['data', 'code', 'kind', 'amount', 'rules'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'app_add_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AppRemoveCouponArguments {
	data: TransactionArgument;
	code: RawTransactionArgument<string>;
}
export interface AppRemoveCouponOptions {
	package?: string;
	arguments:
		| AppRemoveCouponArguments
		| [data: TransactionArgument, code: RawTransactionArgument<string>];
	config?: {
		packageId?: string;
	};
}
export function appRemoveCoupon(options: AppRemoveCouponOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/coupons';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['data', 'code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'app_remove_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
