/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::bag';
export const Bag: MoveStruct<{
	id: typeof bcs.Address;
	size: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::Bag`,
	fields: {
		id: bcs.Address,
		size: bcs.u64(),
	},
});
