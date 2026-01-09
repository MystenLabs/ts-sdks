/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
const $moduleName = '0x2::table';
export const Table = new MoveStruct({
	name: `${$moduleName}::Table`,
	fields: {
		id: object.UID,
		size: bcs.u64(),
	},
});
