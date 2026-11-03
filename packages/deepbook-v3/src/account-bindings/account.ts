// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `account` bindings: the generated ones, each calling the latest account package
// (see `latest.ts`). Types and BCS layouts are re-exported unchanged.

import * as generated from '../contracts/account/account.js';
import type { BcsType } from '@mysten/sui/bcs';
import { latestAccountPackage, type WithLatestConfig } from './latest.js';

export * from '../contracts/account/account.js';

export const id = latestAccountPackage(generated.id);
export const loadAccount = latestAccountPackage(generated.loadAccount);
export const balance = latestAccountPackage(generated.balance);
export const owner = latestAccountPackage(generated.owner);
export const accountId = latestAccountPackage(generated.accountId);
export const referrerAccountId = latestAccountPackage(generated.referrerAccountId);
export const referrerReceiveAddress = latestAccountPackage(generated.referrerReceiveAddress);
export const receiveAddress = latestAccountPackage(generated.receiveAddress);
export const generateAuth = latestAccountPackage(generated.generateAuth);
export const generateAuthAsObject = latestAccountPackage(generated.generateAuthAsObject);
export const share = latestAccountPackage(generated.share);
export const loadAccountMut = latestAccountPackage(generated.loadAccountMut);
export const settle = latestAccountPackage(generated.settle);
export const receiveCoin = latestAccountPackage(generated.receiveCoin);
export const receiveCoinAtAccountId = latestAccountPackage(generated.receiveCoinAtAccountId);
export const deposit = latestAccountPackage(generated.deposit);
export const withdraw = latestAccountPackage(generated.withdraw);
export const depositFunds = latestAccountPackage(generated.depositFunds);
export const withdrawFunds = latestAccountPackage(generated.withdrawFunds);
// Generic, so written out to keep `Data`.
export function attach<Data extends BcsType<any>>(
	options: WithLatestConfig<generated.AttachOptions<Data>>,
) {
	return (
		latestAccountPackage(generated.attach) as (
			options: WithLatestConfig<generated.AttachOptions<Data>>,
		) => ReturnType<typeof generated.attach<Data>>
	)(options);
}
export const hasData = latestAccountPackage(generated.hasData);
export const borrowData = latestAccountPackage(generated.borrowData);
export const borrowDataMut = latestAccountPackage(generated.borrowDataMut);
export const detach = latestAccountPackage(generated.detach);

/** Every generated function wrapped above, for the completeness test. */
export const WRAPPED = Object.freeze([
	'id',
	'loadAccount',
	'balance',
	'owner',
	'accountId',
	'referrerAccountId',
	'referrerReceiveAddress',
	'receiveAddress',
	'generateAuth',
	'generateAuthAsObject',
	'share',
	'loadAccountMut',
	'settle',
	'receiveCoin',
	'receiveCoinAtAccountId',
	'deposit',
	'withdraw',
	'depositFunds',
	'withdrawFunds',
	'attach',
	'hasData',
	'borrowData',
	'borrowDataMut',
	'detach',
] as const);
