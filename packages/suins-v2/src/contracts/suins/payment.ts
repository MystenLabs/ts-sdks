// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct, MoveEnum, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as domain_1 from './domain.js';
import * as vec_map from './deps/sui/vec_map.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@suins/core::payment';
export const RequestData = new MoveStruct(`${$moduleName}::RequestData`, {
	/** The version of the payment module. */
	version: bcs.u8(),
	/** The domain for which the payment is being made. */
	domain: domain_1.Domain,
	/** The years for which the payment is being made. Defaults to 1 for registration. */
	years: bcs.u8(),
	/** The amount the user has to pay in base units. */
	base_amount: bcs.u64(),
	/**
	 * The discounts (each app can add a key for its discount) to avoid multiple
	 * additions of the same discount.
	 */
	discounts_applied: vec_map.VecMap(bcs.string(), bcs.u64()),
	/**
	 * a metadata field for future-proofness. No use-cases are enabled in the current
	 * release.
	 */
	metadata: vec_map.VecMap(bcs.string(), bcs.string()),
});
export const TransactionEvent = new MoveStruct(`${$moduleName}::TransactionEvent`, {
	app: type_name.TypeName,
	domain: domain_1.Domain,
	years: bcs.u8(),
	request_data_version: bcs.u8(),
	base_amount: bcs.u64(),
	discounts_applied: vec_map.VecMap(bcs.string(), bcs.u64()),
	metadata: vec_map.VecMap(bcs.string(), bcs.string()),
	is_renewal: bcs.bool(),
	currency: type_name.TypeName,
	currency_amount: bcs.u64(),
});
/**
 * The payment intent for a given domain
 *
 * - Registration: The user is registering a new domain.
 * - Renewal: The user is renewing an existing domain.
 */
export const PaymentIntent = new MoveEnum(`${$moduleName}::PaymentIntent`, {
	Registration: RequestData,
	Renewal: RequestData,
});
/**
 * A receipt that is generated after a successful payment. Can be used to:
 *
 * - Prove that the payment was successful.
 * - Register a new name, or renew an existing one.
 */
export const Receipt = new MoveEnum(`${$moduleName}::Receipt`, {
	Registration: new MoveStruct(`Receipt.Registration`, {
		domain: domain_1.Domain,
		years: bcs.u8(),
		version: bcs.u8(),
	}),
	Renewal: new MoveStruct(`Receipt.Renewal`, {
		domain: domain_1.Domain,
		years: bcs.u8(),
		version: bcs.u8(),
	}),
});
export interface ApplyPercentageDiscountArguments<A extends BcsType<any>> {
	intent: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	_: RawTransactionArgument<A>;
	discountKey: RawTransactionArgument<string>;
	discount: RawTransactionArgument<number>;
	allowMultipleDiscounts: RawTransactionArgument<boolean>;
}
export interface ApplyPercentageDiscountOptions<A extends BcsType<any>> {
	package?: string;
	arguments:
		| ApplyPercentageDiscountArguments<A>
		| [
				intent: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				_: RawTransactionArgument<A>,
				discountKey: RawTransactionArgument<string>,
				discount: RawTransactionArgument<number>,
				allowMultipleDiscounts: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string];
}
/**
 * Allow an authorized app to apply a percentage discount to the payment intent.
 * E.g. an NS payment can apply a 10% discount on top of a user's 20% discount if
 * allow_multiple_discounts is true
 */
export function applyPercentageDiscount<A extends BcsType<any>>(
	options: ApplyPercentageDiscountOptions<A>,
) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::payment::PaymentIntent`,
		`${packageAddress}::suins::SuiNS`,
		`${options.typeArguments[0]}`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'u8',
		'bool',
	] satisfies string[];
	const parameterNames = [
		'intent',
		'suins',
		'_',
		'discountKey',
		'discount',
		'allowMultipleDiscounts',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'apply_percentage_discount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizePaymentArguments<A extends BcsType<any>> {
	intent: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	app: RawTransactionArgument<A>;
	coin: RawTransactionArgument<string>;
}
export interface FinalizePaymentOptions<A extends BcsType<any>> {
	package?: string;
	arguments:
		| FinalizePaymentArguments<A>
		| [
				intent: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				app: RawTransactionArgument<A>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Allow an authorized app to finalize a payment. Returns a receipt that can be
 * used to register or renew a domain.
 *
 * SAFETY: Only authorized packages can call this. We do not check the amount of
 * funds in this helper. This is the responsibility of the `payments` app.
 */
export function finalizePayment<A extends BcsType<any>>(options: FinalizePaymentOptions<A>) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::payment::PaymentIntent`,
		`${packageAddress}::suins::SuiNS`,
		`${options.typeArguments[0]}`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['intent', 'suins', 'app', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'finalize_payment',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InitRegistrationArguments {
	suins: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface InitRegistrationOptions {
	package?: string;
	arguments:
		| InitRegistrationArguments
		| [suins: RawTransactionArgument<string>, domain: RawTransactionArgument<string>];
}
/**
 * Creates a `PaymentIntent` for registering a new domain. This is a hot-potato and
 * can only be consumed in a single transaction.
 */
export function initRegistration(options: InitRegistrationOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['suins', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'init_registration',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InitRenewalArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	years: RawTransactionArgument<number>;
}
export interface InitRenewalOptions {
	package?: string;
	arguments:
		| InitRenewalArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				years: RawTransactionArgument<number>,
		  ];
}
/**
 * Creates a `PaymentIntent` for renewing an existing domain. This is a hot-potato
 * and can only be consumed in a single transaction.
 */
export function initRenewal(options: InitRenewalOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'u8',
	] satisfies string[];
	const parameterNames = ['suins', 'nft', 'years'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'init_renewal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisterArguments {
	receipt: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
}
export interface RegisterOptions {
	package?: string;
	arguments:
		| RegisterArguments
		| [receipt: RawTransactionArgument<string>, suins: RawTransactionArgument<string>];
}
/**
 * Register a domain with the given receipt. This is a hot-potato and can only be
 * consumed in a single transaction.
 */
export function register(options: RegisterOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::payment::Receipt`,
		`${packageAddress}::suins::SuiNS`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['receipt', 'suins', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'register',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RenewArguments {
	receipt: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface RenewOptions {
	package?: string;
	arguments:
		| RenewArguments
		| [
				receipt: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
		  ];
}
/**
 * Renew a domain with the given receipt. This is a hot-potato and can only be
 * consumed in a single transaction.
 */
export function renew(options: RenewOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::payment::Receipt`,
		`${packageAddress}::suins::SuiNS`,
		`${packageAddress}::suins_registration::SuinsRegistration`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['receipt', 'suins', 'nft', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'renew',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestDataArguments {
	intent: RawTransactionArgument<string>;
}
export interface RequestDataOptions {
	package?: string;
	arguments: RequestDataArguments | [intent: RawTransactionArgument<string>];
}
/** Getters */
export function requestData(options: RequestDataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::PaymentIntent`] satisfies string[];
	const parameterNames = ['intent'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'request_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface YearsArguments {
	self: RawTransactionArgument<string>;
}
export interface YearsOptions {
	package?: string;
	arguments: YearsArguments | [self: RawTransactionArgument<string>];
}
export function years(options: YearsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::RequestData`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'years',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BaseAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface BaseAmountOptions {
	package?: string;
	arguments: BaseAmountArguments | [self: RawTransactionArgument<string>];
}
export function baseAmount(options: BaseAmountOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::RequestData`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'base_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DomainArguments {
	self: RawTransactionArgument<string>;
}
export interface DomainOptions {
	package?: string;
	arguments: DomainArguments | [self: RawTransactionArgument<string>];
}
export function domain(options: DomainOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::RequestData`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'domain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DiscountAppliedArguments {
	self: RawTransactionArgument<string>;
}
export interface DiscountAppliedOptions {
	package?: string;
	arguments: DiscountAppliedArguments | [self: RawTransactionArgument<string>];
}
/** Returns true if at least one discount has been applied to the payment intent. */
export function discountApplied(options: DiscountAppliedOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::RequestData`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'discount_applied',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DiscountsAppliedArguments {
	self: RawTransactionArgument<string>;
}
export interface DiscountsAppliedOptions {
	package?: string;
	arguments: DiscountsAppliedArguments | [self: RawTransactionArgument<string>];
}
/** A list of discounts that have been applied to the payment intent. */
export function discountsApplied(options: DiscountsAppliedOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::RequestData`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'discounts_applied',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CalculateTotalAfterDiscountArguments {
	data: RawTransactionArgument<string>;
	discount: RawTransactionArgument<number>;
}
export interface CalculateTotalAfterDiscountOptions {
	package?: string;
	arguments:
		| CalculateTotalAfterDiscountArguments
		| [data: RawTransactionArgument<string>, discount: RawTransactionArgument<number>];
}
/** Public helper to calculate price after a percentage discount has been applied. */
export function calculateTotalAfterDiscount(options: CalculateTotalAfterDiscountOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::payment::RequestData`, 'u8'] satisfies string[];
	const parameterNames = ['data', 'discount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'payment',
			function: 'calculate_total_after_discount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
