/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Generic Move and native functions for group operations. */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::group_ops';
export const Element: MoveStruct<{
	bytes: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
}> = new MoveStruct({
	name: `${$moduleName}::Element<phantom T>`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
