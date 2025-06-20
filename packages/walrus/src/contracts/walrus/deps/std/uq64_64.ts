// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Defines an unsigned, fixed-point numeric type with a 64-bit integer part and a
 * 64-bit fractional part. The notation `uq64_64` and `UQ64_64` is based on
 * [Q notation](<https://en.wikipedia.org/wiki/Q_(number_format)>). `q` indicates
 * it a fixed-point number. The `u` prefix indicates it is unsigned. The `64_64`
 * suffix indicates the number of bits, where the first number indicates the number
 * of bits in the integer part, and the second the number of bits in the fractional
 * part--in this case 64 bits for each.
 */

import { bcs } from '@mysten/sui/bcs';
export function UQ64_64() {
	return bcs.tuple([bcs.u128()], { name: 'UQ64_64' });
}
