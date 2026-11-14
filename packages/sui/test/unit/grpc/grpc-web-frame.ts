// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** A gRPC-web frame: a flag byte, a big-endian length and the payload. */
export function frame(flag: number, payload: Uint8Array): Uint8Array {
	const out = new Uint8Array(5 + payload.length);
	out[0] = flag;
	new DataView(out.buffer).setUint32(1, payload.length);
	out.set(payload, 5);
	return out;
}
