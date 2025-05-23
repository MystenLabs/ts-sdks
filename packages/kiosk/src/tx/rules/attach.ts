// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import type { ObjectArgument } from '../../types/index.js';

export interface KioskLockRuleParams {
	type: string;
	policy: ObjectArgument;
	policyCap: ObjectArgument;
	packageId: string;
}

export function kioskLockRule({ type, policy, policyCap, packageId }: KioskLockRuleParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `${packageId}::kiosk_lock_rule::add`,
			typeArguments: [type],
			arguments: [tx.object(policy), tx.object(policyCap)],
		});
	};
}

export interface RoyaltyRuleParams {
	type: string;
	policy: ObjectArgument;
	policyCap: ObjectArgument;
	percentageBps: number | string; // this is in basis points.
	minAmount: number | string;
	packageId: string;
}
export function royaltyRule({
	type,
	policy,
	policyCap,
	percentageBps,
	minAmount,
	packageId,
}: RoyaltyRuleParams) {
	return (tx: Transaction) => {
		if (Number(percentageBps) < 0 || Number(percentageBps) > 10_000)
			throw new Error('Invalid basis point percentage. Use a value between [0,10000].');

		tx.moveCall({
			target: `${packageId}::royalty_rule::add`,
			typeArguments: [type],
			arguments: [
				tx.object(policy),
				tx.object(policyCap),
				tx.pure.u16(Number(percentageBps)),
				tx.pure.u64(minAmount),
			],
		});
	};
}

export interface PersonalKioskRuleParams {
	type: string;
	policy: ObjectArgument;
	policyCap: ObjectArgument;
	packageId: string;
}
export function personalKioskRule({ type, policy, policyCap, packageId }: PersonalKioskRuleParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `${packageId}::personal_kiosk_rule::add`,
			typeArguments: [type],
			arguments: [tx.object(policy), tx.object(policyCap)],
		});
	};
}

export interface FloorPriceRuleParams {
	type: string;
	policy: ObjectArgument;
	policyCap: ObjectArgument;
	minPrice: string | bigint;
	packageId: string;
}

export function floorPriceRule({
	type,
	policy,
	policyCap,
	minPrice,
	packageId,
}: FloorPriceRuleParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `${packageId}::floor_price_rule::add`,
			typeArguments: [type],
			arguments: [tx.object(policy), tx.object(policyCap), tx.pure.u64(minPrice)],
		});
	};
}
