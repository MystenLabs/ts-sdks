/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::object';
export const UID = new MoveStruct({
	name: `${$moduleName}::UID`,
	fields: {
		id: bcs.Address,
	},
});
