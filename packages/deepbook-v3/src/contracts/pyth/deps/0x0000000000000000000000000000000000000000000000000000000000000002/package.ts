/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
const $moduleName = '0x2::package';
export const UpgradeCap = new MoveStruct({
	name: `${$moduleName}::UpgradeCap`,
	fields: {
		id: object.UID,
		package: bcs.Address,
		version: bcs.u64(),
		policy: bcs.u8(),
	},
});
