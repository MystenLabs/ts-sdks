/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines an unsigned, fixed-point numeric type with a 64-bit integer part and a
 * 64-bit fractional part. The notation `uq64_64` and `UQ64_64` is based on
 * [Q notation](<https://en.wikipedia.org/wiki/Q_(number_format)>). `q` indicates
 * it a fixed-point number. The `u` prefix indicates it is unsigned. The `64_64`
 * suffix indicates the number of bits, where the first number indicates the number
 * of bits in the integer part, and the second the number of bits in the fractional
 * part--in this case 64 bits for each.
 */

import { MoveTuple } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = 'std::uq64_64';
export const UQ64_64 = new MoveTuple(`${$moduleName}::UQ64_64`, [bcs.u128()]);
