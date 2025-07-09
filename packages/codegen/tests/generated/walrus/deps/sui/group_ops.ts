/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Generic Move and native functions for group operations. */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
const $moduleName = 'sui::group_ops';
export const Element = new MoveStruct(`${$moduleName}::Element`, {
	bytes: bcs.vector(bcs.u8()),
});
