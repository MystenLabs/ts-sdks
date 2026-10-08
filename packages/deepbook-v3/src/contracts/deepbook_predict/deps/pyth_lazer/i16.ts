/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Adapted from pyth::i64, modified for i16 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = 'pyth_lazer::i16';
export const I16 = new MoveStruct({
	name: `${$moduleName}::I16`,
	fields: {
		negative: bcs.bool(),
		magnitude: bcs.u16(),
	},
});
