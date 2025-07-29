// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as data from './data.js';
import * as object from './deps/sui/object.js';
const $moduleName = '@suins/coupons::coupon_house';
export const CouponsApp = new MoveStruct({
	name: `${$moduleName}::CouponsApp`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const AppKey = new MoveStruct({
	name: `${$moduleName}::AppKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const CouponHouse = new MoveStruct({
	name: `${$moduleName}::CouponHouse`,
	fields: {
		data: data.Data,
		version: bcs.u8(),
		storage: object.UID,
	},
});
export interface SetupArguments {
	suins: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface SetupOptions {
	package?: string;
	arguments:
		| SetupArguments
		| [suins: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/** Called once to setup the CouponHouse on SuiNS. */
export function setup(options: SetupOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::AdminCap',
	] satisfies string[];
	const parameterNames = ['suins', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'setup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApplyCouponArguments {
	suins: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	couponCode: RawTransactionArgument<string>;
}
export interface ApplyCouponOptions {
	package?: string;
	arguments:
		| ApplyCouponArguments
		| [
				suins: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				couponCode: RawTransactionArgument<string>,
		  ];
}
export function applyCoupon(options: ApplyCouponOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000000::payment::PaymentIntent',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['suins', 'intent', 'couponCode', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'apply_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
export function registerWithCoupon(options: RegisterWithCouponOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u8',
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['Suins', 'CouponCode', 'DomainName', 'NoYears', 'Payment', 'Clock'];
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
}
export function calculateSalePrice(options: CalculateSalePriceOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
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
	suins: RawTransactionArgument<string>;
	_: RawTransactionArgument<A>;
}
export interface AppDataMutOptions<A extends BcsType<any>> {
	package?: string;
	arguments:
		| AppDataMutArguments<A>
		| [suins: RawTransactionArgument<string>, _: RawTransactionArgument<A>];
	typeArguments: [string];
}
export function appDataMut<A extends BcsType<any>>(options: AppDataMutOptions<A>) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['suins', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'app_data_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AuthorizeAppArguments {
	_: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
}
export interface AuthorizeAppOptions {
	package?: string;
	arguments:
		| AuthorizeAppArguments
		| [_: RawTransactionArgument<string>, suins: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Authorize an app on the coupon house. This allows to a secondary module to
 * add/remove coupons.
 */
export function authorizeApp(options: AuthorizeAppOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::AdminCap',
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
	] satisfies string[];
	const parameterNames = ['_', 'suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'authorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeAppArguments {
	_: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
}
export interface DeauthorizeAppOptions {
	package?: string;
	arguments:
		| DeauthorizeAppArguments
		| [_: RawTransactionArgument<string>, suins: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** De-authorize an app. The app can no longer add or remove */
export function deauthorizeApp(options: DeauthorizeAppOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::AdminCap',
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
	] satisfies string[];
	const parameterNames = ['_', 'suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'deauthorize_app',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetVersionArguments {
	_: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	version: RawTransactionArgument<number>;
}
export interface SetVersionOptions {
	package?: string;
	arguments:
		| SetVersionArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				version: RawTransactionArgument<number>,
		  ];
}
/**
 * An admin helper to set the version of the shared object. Registrations are only
 * possible if the latest version is being used.
 */
export function setVersion(options: SetVersionOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::AdminCap',
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'u8',
	] satisfies string[];
	const parameterNames = ['_', 'suins', 'version'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'set_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertVersionIsValidArguments {
	self: RawTransactionArgument<string>;
}
export interface AssertVersionIsValidOptions {
	package?: string;
	arguments: AssertVersionIsValidArguments | [self: RawTransactionArgument<string>];
}
/** Validate that the version of the app is the latest. */
export function assertVersionIsValid(options: AssertVersionIsValidOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::coupon_house::CouponHouse`] satisfies string[];
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
	suins: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	kind: RawTransactionArgument<number>;
	amount: RawTransactionArgument<number | bigint>;
	rules: RawTransactionArgument<string>;
}
export interface AdminAddCouponOptions {
	package?: string;
	arguments:
		| AdminAddCouponArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				code: RawTransactionArgument<string>,
				kind: RawTransactionArgument<number>,
				amount: RawTransactionArgument<number | bigint>,
				rules: RawTransactionArgument<string>,
		  ];
}
/**
 * To create a coupon, you have to call the PTB in the specific order
 *
 * 1.  (Optional) Call rules::new_domain_length_rule(type, length) // generate a
 *     length specific rule (e.g. only domains of size 5)
 * 2.  Call rules::coupon_rules(...) to create the coupon's ruleset.
 */
export function adminAddCoupon(options: AdminAddCouponOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::AdminCap',
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u8',
		'u64',
		`${packageAddress}::rules::CouponRules`,
	] satisfies string[];
	const parameterNames = ['_', 'suins', 'code', 'kind', 'amount', 'rules'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'admin_add_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AdminRemoveCouponArguments {
	_: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
}
export interface AdminRemoveCouponOptions {
	package?: string;
	arguments:
		| AdminRemoveCouponArguments
		| [
				_: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				code: RawTransactionArgument<string>,
		  ];
}
export function adminRemoveCoupon(options: AdminRemoveCouponOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::AdminCap',
		'0x0000000000000000000000000000000000000000000000000000000000000000::suins::SuiNS',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['_', 'suins', 'code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'admin_remove_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AppAddCouponArguments {
	data: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
	kind: RawTransactionArgument<number>;
	amount: RawTransactionArgument<number | bigint>;
	rules: RawTransactionArgument<string>;
}
export interface AppAddCouponOptions {
	package?: string;
	arguments:
		| AppAddCouponArguments
		| [
				data: RawTransactionArgument<string>,
				code: RawTransactionArgument<string>,
				kind: RawTransactionArgument<number>,
				amount: RawTransactionArgument<number | bigint>,
				rules: RawTransactionArgument<string>,
		  ];
}
export function appAddCoupon(options: AppAddCouponOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		`${packageAddress}::data::Data`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u8',
		'u64',
		`${packageAddress}::rules::CouponRules`,
	] satisfies string[];
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
	data: RawTransactionArgument<string>;
	code: RawTransactionArgument<string>;
}
export interface AppRemoveCouponOptions {
	package?: string;
	arguments:
		| AppRemoveCouponArguments
		| [data: RawTransactionArgument<string>, code: RawTransactionArgument<string>];
}
export function appRemoveCoupon(options: AppRemoveCouponOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		`${packageAddress}::data::Data`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['data', 'code'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coupon_house',
			function: 'app_remove_coupon',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
