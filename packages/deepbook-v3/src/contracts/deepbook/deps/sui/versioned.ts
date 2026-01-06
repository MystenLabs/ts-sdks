/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::versioned';
export const Versioned = new MoveStruct({
	name: `${$moduleName}::Versioned`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
