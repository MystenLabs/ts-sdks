// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// A second replacement module exporting names that collide with `units.ts` and with the codegen's
// own fixed imports, to cover import de-confliction.

import { bcs as suiBcs } from '@mysten/sui/bcs';

/** Same export name as `units.ts`'s `ScaledU64`, from a different module. */
export const ScaledU64 = suiBcs.u64().transform({
	input: (value: number) => BigInt(Math.round(value * 1e6)).toString(),
	output: (raw) => Number(raw) / 1e6,
});

/** Collides with the generated `bcs` import. */
export const bcs = suiBcs.u64();
