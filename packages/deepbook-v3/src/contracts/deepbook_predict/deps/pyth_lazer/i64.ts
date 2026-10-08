/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Adapted from pyth::i64 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../../../bcs/integers.js';
const $moduleName = 'pyth_lazer::i64';
export const I64 = new MoveStruct({
	name: `${$moduleName}::I64`,
	fields: {
		negative: bcs.bool(),
		magnitude: U64,
	},
});
