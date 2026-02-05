/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::table';
export const Table = new MoveStruct({
	name: `${$moduleName}::Table<phantom T0, phantom T1>`,
	fields: {
		id: bcs.Address,
		size: bcs.u64(),
	},
});
