// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
/** A getter for the percentage discount type. */
export function percentage_discount_type(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'percentage_discount_type',
		});
}
/** A vector with all the discount rule types. */
export function discount_rule_types(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'discount_rule_types',
		});
}
export function fixed_price_discount_type(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@suins/coupons';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'constants',
			function: 'fixed_price_discount_type',
		});
}
