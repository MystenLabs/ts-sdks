// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

/**
 * Shape of the subset of `client.core.simulateTransaction` results the query layer
 * reads. Kept minimal so the queries can be unit-tested with a stub client.
 */
export interface SimulateResult {
	commandResults?: Array<{ returnValues: Array<{ bcs: Uint8Array | number[] }> }> | null;
}

/** Raw bytes of the first return value of command `index`. */
export function returnBytes(res: SimulateResult, index: number): Uint8Array {
	const command = res.commandResults?.[index];
	if (!command) {
		throw new Error(`simulate result missing command ${index}`);
	}
	return new Uint8Array(command.returnValues[0].bcs);
}

export const parseU64 = (res: SimulateResult, index: number): bigint =>
	BigInt(bcs.u64().parse(returnBytes(res, index)));

export const parseU32 = (res: SimulateResult, index: number): number =>
	bcs.u32().parse(returnBytes(res, index));

export const parseBool = (res: SimulateResult, index: number): boolean =>
	bcs.bool().parse(returnBytes(res, index));

export const parseOptionAddress = (res: SimulateResult, index: number): string | null =>
	bcs.option(bcs.Address).parse(returnBytes(res, index));

export const parseAddressVector = (res: SimulateResult, index: number): string[] =>
	bcs.vector(bcs.Address).parse(returnBytes(res, index));
