/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Signed integers represented by a `u64` magnitude and a canonical nonnegative
 * zero. Scaled multiplication and division use 1e9 fixed point and truncate the
 * result's magnitude toward zero.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = 'fixed_math::i64';
export const I64 = new MoveStruct({
	name: `${$moduleName}::I64`,
	fields: {
		magnitude: bcs.u64(),
		is_negative: bcs.bool(),
	},
});
