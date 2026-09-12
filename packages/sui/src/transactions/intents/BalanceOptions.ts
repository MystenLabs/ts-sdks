// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionObjectArgument } from '../Transaction.js';

/** An allowance with optional funder metadata and app authorization. */
export interface AllowanceReference {
	objectId: string;
	/** Skip the metadata lookup when the funder is already known. */
	funder?: string;
	/** Authorization for an app-bound allowance. */
	app?: {
		/** The app type A in SpendPermit<A>. */
		type: string;
		/** A SpendPermit<A> from the app, consumed by this spend. */
		permit: TransactionObjectArgument;
	};
}

export type BalanceOptions = {
	/** The coin type T, not Balance<T>. Defaults to SUI. */
	type?: string;
	balance: bigint | number | string;
} & (
	| { allowance?: never; useGasCoin?: boolean }
	| {
			/** An allowance ID or reference with optional app authorization. Never falls back to sender funds. */
			allowance: string | AllowanceReference;
			useGasCoin?: never;
	  }
);

export function normalizeBalance(options: BalanceOptions): bigint {
	if (options.allowance !== undefined && options.useGasCoin !== undefined) {
		throw new Error('useGasCoin cannot be combined with allowance');
	}
	const amount = options.balance;
	if (typeof amount === 'string' && !/^[0-9]+$/.test(amount)) {
		throw new Error('Amount must be a non-empty string of decimal digits');
	}
	if (typeof amount === 'number' && !Number.isSafeInteger(amount)) {
		throw new Error('Amount must be a safe integer; use bigint or a string for larger amounts');
	}
	return BigInt(amount);
}
