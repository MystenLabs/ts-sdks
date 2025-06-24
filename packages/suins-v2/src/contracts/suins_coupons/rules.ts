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
export function new_coupon_rules(options: {
	package?: string;
	arguments:
		| [
				length: RawTransactionArgument<string | null>,
				availableClaims: RawTransactionArgument<number | bigint | null>,
				user: RawTransactionArgument<string | null>,
				expiration: RawTransactionArgument<number | bigint | null>,
				years: RawTransactionArgument<string | null>,
		  ]
		| {
				length: RawTransactionArgument<string | null>;
				availableClaims: RawTransactionArgument<number | bigint | null>;
				user: RawTransactionArgument<string | null>;
				expiration: RawTransactionArgument<number | bigint | null>;
				years: RawTransactionArgument<string | null>;
		  };
}) {
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
export function new_empty_rules(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'rules',
			function: 'new_empty_rules',
		});
}
/**
 * If the rules count `available_claims`, we decrease it. Aborts if there are no
 * more available claims on that coupon. We shouldn't get here ever, as we're
 * checking this on the coupon creation, but keeping it as a sanity check (e.g.
 * created a coupon with 0 available claims).
 */
export function decrease_available_claims(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>]
		| {
				rules: RawTransactionArgument<string>;
		  };
}) {
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
export function has_available_claims(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>]
		| {
				rules: RawTransactionArgument<string>;
		  };
}) {
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
export function assert_coupon_valid_for_domain_years(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>, target: RawTransactionArgument<number>]
		| {
				rules: RawTransactionArgument<string>;
				target: RawTransactionArgument<number>;
		  };
}) {
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
export function is_coupon_valid_for_domain_years(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>, target: RawTransactionArgument<number>]
		| {
				rules: RawTransactionArgument<string>;
				target: RawTransactionArgument<number>;
		  };
}) {
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
export function assert_is_valid_discount_type(options: {
	package?: string;
	arguments:
		| [type: RawTransactionArgument<number>]
		| {
				type: RawTransactionArgument<number>;
		  };
}) {
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
export function assert_is_valid_amount(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<number>, amount: RawTransactionArgument<number | bigint>]
		| {
				_: RawTransactionArgument<number>;
				amount: RawTransactionArgument<number | bigint>;
		  };
}) {
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
export function assert_coupon_valid_for_domain_size(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>, length: RawTransactionArgument<number>]
		| {
				rules: RawTransactionArgument<string>;
				length: RawTransactionArgument<number>;
		  };
}) {
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
/** We check the length of the name based on the domain length rule */
export function is_coupon_valid_for_domain_size(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>, length: RawTransactionArgument<number>]
		| {
				rules: RawTransactionArgument<string>;
				length: RawTransactionArgument<number>;
		  };
}) {
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
/** Throws `EInvalidUser` error if it has expired. */
export function assert_coupon_valid_for_address(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>, user: RawTransactionArgument<string>]
		| {
				rules: RawTransactionArgument<string>;
				user: RawTransactionArgument<string>;
		  };
}) {
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
/** Check that the domain is valid for the specified address */
export function is_coupon_valid_for_address(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>, user: RawTransactionArgument<string>]
		| {
				rules: RawTransactionArgument<string>;
				user: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Simple assertion for the coupon expiration. Throws `ECouponExpired` error if it
 * has expired.
 */
export function assert_coupon_is_not_expired(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>]
		| {
				rules: RawTransactionArgument<string>;
		  };
}) {
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
/** Check whether a coupon has expired */
export function is_coupon_expired(options: {
	package?: string;
	arguments:
		| [rules: RawTransactionArgument<string>]
		| {
				rules: RawTransactionArgument<string>;
		  };
}) {
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
