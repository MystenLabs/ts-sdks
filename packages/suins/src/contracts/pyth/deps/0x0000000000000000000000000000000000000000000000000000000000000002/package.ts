/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::package';
export const UpgradeCap: MoveStruct<{
	id: typeof bcs.Address;
	package: typeof bcs.Address;
	version: ReturnType<typeof bcs.u64>;
	policy: ReturnType<typeof bcs.u8>;
}> = new MoveStruct({
	name: `${$moduleName}::UpgradeCap`,
	fields: {
		id: bcs.Address,
		package: bcs.Address,
		version: bcs.u64(),
		policy: bcs.u8(),
	},
});
