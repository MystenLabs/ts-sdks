// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** A plain allowance whose funder is already known, avoiding a metadata lookup. */
export interface AllowanceReference {
	objectId: string;
	funder: string;
}

export type BalanceOptions = {
	/** The coin type T, not Balance<T>. Defaults to SUI. */
	type?: string;
} & (
	| { amount: bigint | number | string; balance?: never }
	| { amount?: never; balance: bigint | number }
) &
	(
		| { allowance?: never; useGasCoin?: boolean }
		| {
				/** A plain allowance ID or a reference with a known funder. Never falls back to sender funds. */
				allowance: string | AllowanceReference;
				useGasCoin?: never;
		  }
	);

export function getBalanceAmount(options: BalanceOptions): bigint {
	if ((options.amount === undefined) === (options.balance === undefined)) {
		throw new Error('Provide exactly one of amount or balance');
	}
	if (options.allowance !== undefined && options.useGasCoin !== undefined) {
		throw new Error('useGasCoin cannot be combined with allowance');
	}
	const amount = options.amount ?? options.balance!;
	if (typeof amount === 'number' && !Number.isSafeInteger(amount)) {
		throw new Error('Amount must be a safe integer; use bigint or a string for larger amounts');
	}
	return BigInt(amount);
}
