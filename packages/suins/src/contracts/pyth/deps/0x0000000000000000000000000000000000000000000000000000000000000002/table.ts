/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::table';
export const Table = new MoveStruct({
	name: `${$moduleName}::Table`,
	fields: {
		id: bcs.Address,
		size: bcs.u64(),
	},
});
