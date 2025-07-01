// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
export interface PercentageDiscountTypeOptions {
	package?: string;
	arguments: [];
}
/** A getter for the percentage discount type. */
export function percentageDiscountType(options: PercentageDiscountTypeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'percentage_discount_type',
		});
}
export interface DiscountRuleTypesOptions {
	package?: string;
	arguments: [];
}
/** A vector with all the discount rule types. */
export function discountRuleTypes(options: DiscountRuleTypesOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'discount_rule_types',
		});
}
export interface FixedPriceDiscountTypeOptions {
	package?: string;
	arguments: [];
}
export function fixedPriceDiscountType(options: FixedPriceDiscountTypeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'fixed_price_discount_type',
		});
}
