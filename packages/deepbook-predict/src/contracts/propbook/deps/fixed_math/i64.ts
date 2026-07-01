/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Signed u64 magnitude with normalized zero. */

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
