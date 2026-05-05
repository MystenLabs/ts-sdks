/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Generic Move and native functions for group operations. */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::group_ops';
const _ElementFields = {
	bytes: bcs.vector(bcs.u8()),
};
export const Element: MoveStruct<typeof _ElementFields> = new MoveStruct({
	name: `${$moduleName}::Element<phantom T>`,
	fields: _ElementFields,
});
