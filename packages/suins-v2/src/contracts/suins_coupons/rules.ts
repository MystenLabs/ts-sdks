// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as range from './range.js';
export function CouponRules() {
	return bcs.struct('CouponRules', {
		length: bcs.option(range.Range()),
		available_claims: bcs.option(bcs.u64()),
		user: bcs.option(bcs.Address),
		expiration: bcs.option(bcs.u64()),
		years: bcs.option(range.Range()),
	});
}
export interface NewCouponRulesArguments {
	length: RawTransactionArgument<string | null>;
	availableClaims: RawTransactionArgument<number | bigint | null>;
	user: RawTransactionArgument<string | null>;
	expiration: RawTransactionArgument<number | bigint | null>;
	years: RawTransactionArgument<string | null>;
}
export interface NewCouponRulesOptions {
	package?: string;
	arguments:
		| NewCouponRulesArguments
		| [
				length: RawTransactionArgument<string | null>,
				availableClaims: RawTransactionArgument<number | bigint | null>,
				user: RawTransactionArgument<string | null>,
				expiration: RawTransactionArgument<number | bigint | null>,
				years: RawTransactionArgument<string | null>,
		  ];
}
/**
 * This is used in a PTB when creating a coupon. Creates a CouponRules object to be
 * used to create a coupon. All rules are optional, and can be chained (`AND`)
 * format.
 *
 * 1.  Length: The name has to be in range [from, to]
 * 2.  Max available claims
 * 3.  Only for a specific address
 * 4.  Might have an expiration date.
 * 5.  Might be valid only for registrations in a range [from, to]
 */
export function newCouponRules(options: NewCouponRulesOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<${packageAddress}::range::Range>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<u64>',
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<address>',
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<u64>',
		`0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<${packageAddress}::range::Range>`,
	] satisfies string[];
	const parameterNames = ['length', 'availableClaims', 'user', 'expiration', 'years'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'new_coupon_rules',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewEmptyRulesOptions {
	package?: string;
	arguments: [];
}
export function newEmptyRules(options: NewEmptyRulesOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'new_empty_rules',
		});
}
export interface DecreaseAvailableClaimsArguments {
	rules: RawTransactionArgument<string>;
}
export interface DecreaseAvailableClaimsOptions {
	package?: string;
	arguments: DecreaseAvailableClaimsArguments | [rules: RawTransactionArgument<string>];
}
/**
 * If the rules count `available_claims`, we decrease it. Aborts if there are no
 * more available claims on that coupon. We shouldn't get here ever, as we're
 * checking this on the coupon creation, but keeping it as a sanity check (e.g.
 * created a coupon with 0 available claims).
 */
export function decreaseAvailableClaims(options: DecreaseAvailableClaimsOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`] satisfies string[];
	const parameterNames = ['rules'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'decrease_available_claims',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasAvailableClaimsArguments {
	rules: RawTransactionArgument<string>;
}
export interface HasAvailableClaimsOptions {
	package?: string;
	arguments: HasAvailableClaimsArguments | [rules: RawTransactionArgument<string>];
}
export function hasAvailableClaims(options: HasAvailableClaimsOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`] satisfies string[];
	const parameterNames = ['rules'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'has_available_claims',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertCouponValidForDomainYearsArguments {
	rules: RawTransactionArgument<string>;
	target: RawTransactionArgument<number>;
}
export interface AssertCouponValidForDomainYearsOptions {
	package?: string;
	arguments:
		| AssertCouponValidForDomainYearsArguments
		| [rules: RawTransactionArgument<string>, target: RawTransactionArgument<number>];
}
export function assertCouponValidForDomainYears(options: AssertCouponValidForDomainYearsOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`, 'u8'] satisfies string[];
	const parameterNames = ['rules', 'target'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'assert_coupon_valid_for_domain_years',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsCouponValidForDomainYearsArguments {
	rules: RawTransactionArgument<string>;
	target: RawTransactionArgument<number>;
}
export interface IsCouponValidForDomainYearsOptions {
	package?: string;
	arguments:
		| IsCouponValidForDomainYearsArguments
		| [rules: RawTransactionArgument<string>, target: RawTransactionArgument<number>];
}
export function isCouponValidForDomainYears(options: IsCouponValidForDomainYearsOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`, 'u8'] satisfies string[];
	const parameterNames = ['rules', 'target'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'is_coupon_valid_for_domain_years',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertIsValidDiscountTypeArguments {
	type: RawTransactionArgument<number>;
}
export interface AssertIsValidDiscountTypeOptions {
	package?: string;
	arguments: AssertIsValidDiscountTypeArguments | [type: RawTransactionArgument<number>];
}
export function assertIsValidDiscountType(options: AssertIsValidDiscountTypeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = ['u8'] satisfies string[];
	const parameterNames = ['type'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'assert_is_valid_discount_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertIsValidAmountArguments {
	_: RawTransactionArgument<number>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface AssertIsValidAmountOptions {
	package?: string;
	arguments:
		| AssertIsValidAmountArguments
		| [_: RawTransactionArgument<number>, amount: RawTransactionArgument<number | bigint>];
}
export function assertIsValidAmount(options: AssertIsValidAmountOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = ['u8', 'u64'] satisfies string[];
	const parameterNames = ['_', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'assert_is_valid_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertCouponValidForDomainSizeArguments {
	rules: RawTransactionArgument<string>;
	length: RawTransactionArgument<number>;
}
export interface AssertCouponValidForDomainSizeOptions {
	package?: string;
	arguments:
		| AssertCouponValidForDomainSizeArguments
		| [rules: RawTransactionArgument<string>, length: RawTransactionArgument<number>];
}
export function assertCouponValidForDomainSize(options: AssertCouponValidForDomainSizeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`, 'u8'] satisfies string[];
	const parameterNames = ['rules', 'length'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'assert_coupon_valid_for_domain_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsCouponValidForDomainSizeArguments {
	rules: RawTransactionArgument<string>;
	length: RawTransactionArgument<number>;
}
export interface IsCouponValidForDomainSizeOptions {
	package?: string;
	arguments:
		| IsCouponValidForDomainSizeArguments
		| [rules: RawTransactionArgument<string>, length: RawTransactionArgument<number>];
}
/** We check the length of the name based on the domain length rule */
export function isCouponValidForDomainSize(options: IsCouponValidForDomainSizeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`, 'u8'] satisfies string[];
	const parameterNames = ['rules', 'length'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'is_coupon_valid_for_domain_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertCouponValidForAddressArguments {
	rules: RawTransactionArgument<string>;
	user: RawTransactionArgument<string>;
}
export interface AssertCouponValidForAddressOptions {
	package?: string;
	arguments:
		| AssertCouponValidForAddressArguments
		| [rules: RawTransactionArgument<string>, user: RawTransactionArgument<string>];
}
/** Throws `EInvalidUser` error if it has expired. */
export function assertCouponValidForAddress(options: AssertCouponValidForAddressOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`, 'address'] satisfies string[];
	const parameterNames = ['rules', 'user'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'assert_coupon_valid_for_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsCouponValidForAddressArguments {
	rules: RawTransactionArgument<string>;
	user: RawTransactionArgument<string>;
}
export interface IsCouponValidForAddressOptions {
	package?: string;
	arguments:
		| IsCouponValidForAddressArguments
		| [rules: RawTransactionArgument<string>, user: RawTransactionArgument<string>];
}
/** Check that the domain is valid for the specified address */
export function isCouponValidForAddress(options: IsCouponValidForAddressOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::rules::CouponRules`, 'address'] satisfies string[];
	const parameterNames = ['rules', 'user'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'is_coupon_valid_for_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertCouponIsNotExpiredArguments {
	rules: RawTransactionArgument<string>;
}
export interface AssertCouponIsNotExpiredOptions {
	package?: string;
	arguments: AssertCouponIsNotExpiredArguments | [rules: RawTransactionArgument<string>];
}
/**
 * Simple assertion for the coupon expiration. Throws `ECouponExpired` error if it
 * has expired.
 */
export function assertCouponIsNotExpired(options: AssertCouponIsNotExpiredOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		`${packageAddress}::rules::CouponRules`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['rules', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'assert_coupon_is_not_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsCouponExpiredArguments {
	rules: RawTransactionArgument<string>;
}
export interface IsCouponExpiredOptions {
	package?: string;
	arguments: IsCouponExpiredArguments | [rules: RawTransactionArgument<string>];
}
/** Check whether a coupon has expired */
export function isCouponExpired(options: IsCouponExpiredOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [
		`${packageAddress}::rules::CouponRules`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['rules', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'is_coupon_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
