// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Self-contained replacement BCS types used by bcs-overrides tests. Replacement modules must not
// import generated modules that reference the replaced type, so raw layouts are declared inline.

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';

/** A 1e9 fixed-point u64 exposed as a decimal number. */
export const ScaledU64 = bcs.u64().transform({
	input: (value: number) => BigInt(Math.round(value * 1e9)).toString(),
	output: (raw) => Number(raw) / 1e9,
});

/** A vector of 1e9 fixed-point u64s. */
export const ScaledU64Vector = bcs.vector(ScaledU64);

/** Replacement for `registry::Status` that parses to a plain string label. */
export const Status = bcs
	.enum('Status', {
		Active: null,
		Inactive: null,
		Pending: bcs.struct('Status.Pending', { reason: bcs.string() }),
	})
	.transform({
		input: (label: 'Active' | 'Inactive') =>
			label === 'Active' ? { Active: true as const } : { Inactive: true as const },
		output: (value) => value.$kind,
	});

/** Replacement for the generic `registry::Result` enum, mirroring the generated call convention. */
export function CustomResult<T extends BcsType<any>>(...typeParameters: [T]) {
	return bcs.enum('Result', {
		Ok: bcs.struct('Result.Ok', { value: typeParameters[0] }),
		Err: bcs.struct('Result.Err', { code: bcs.u64(), message: bcs.string() }),
	});
}
