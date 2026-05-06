// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiNSName } from '@mysten/sui/utils';

export function isSubName(name: string): boolean {
	return normalizeSuiNSName(name, 'dot').split('.').length > 2;
}

/**
 * Checks if a name is a nested subname.
 * A nested subdomain is a subdomain that is a subdomain of another subdomain.
 * @param name The name to check (e.g test.example.sub.sui)
 */
export function isNestedSubName(name: string): boolean {
	return normalizeSuiNSName(name, 'dot').split('.').length > 3;
}

/**
 * The years must be between 1 and 5.
 */
export function validateYears(years: number): void {
	if (!(years > 0 && years < 6)) throw new Error('Years must be between 1 and 5');
}

export function zeroCoin(
	tx: Transaction,
	type: string,
): ReturnType<Transaction['moveCall']> {
	return tx.moveCall({
		target: '0x2::coin::zero',
		typeArguments: [type],
	});
}

export function getConfigType(suinsPackageV1: string, innerType: string): string {
	return `${suinsPackageV1}::suins::ConfigKey<${innerType}>`;
}

export function getDomainType(suinsPackageV1: string): string {
	return `${suinsPackageV1}::domain::Domain`;
}

export function getPricelistConfigType(suinsPackageId: string): string {
	return `${suinsPackageId}::pricing_config::PricingConfig`;
}

export function getRenewalPricelistConfigType(suinsPackageId: string): string {
	return `${suinsPackageId}::pricing_config::RenewalConfig`;
}

export function getCoinDiscountConfigType(paymentPackageId: string): string {
	return `${paymentPackageId}::payments::PaymentsConfig`;
}
