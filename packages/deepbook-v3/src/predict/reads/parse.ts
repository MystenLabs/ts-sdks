// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// BCS decoders for the return values of on-chain reads, built on the
// `@mysten/sui/bcs` codec so the read layer decodes exactly the on-chain Move ABI
// (u64 LE, vector<ID>, Option) with no hand-rolled byte walking. Round-tripped
// against `@mysten/sui/bcs` in tests/reads.test.ts.

import { bcs } from '@mysten/sui/bcs';

// BCS u64 → bigint. `bcs.u64()` parses to a decimal string.
export function parseU64LE(bytes: Uint8Array): bigint {
	return BigInt(bcs.u64().parse(bytes));
}

// BCS vector<ID> / vector<address> → full-length 0x lowercase ids
// (`bcs.Address` already yields normalized ids).
export function parseVectorOfIds(bytes: Uint8Array): string[] {
	return bcs.vector(bcs.Address).parse(bytes);
}

// BCS Option<u64>: None → null, Some(x) → x.
export function parseOptionalU64(bytes: Uint8Array): bigint | null {
	const v = bcs.option(bcs.u64()).parse(bytes);
	return v == null ? null : BigInt(v);
}

// BCS Option<ID>: None → null, Some(id) → normalized 0x id.
export function parseOptionalId(bytes: Uint8Array): string | null {
	return bcs.option(bcs.Address).parse(bytes);
}
