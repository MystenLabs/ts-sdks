/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::bytes32';
export const Bytes32: MoveStruct<{
	data: ReturnType<typeof bcs.vector<ReturnType<typeof bcs.u8>>>;
}> = new MoveStruct({
	name: `${$moduleName}::Bytes32`,
	fields: {
		data: bcs.vector(bcs.u8()),
	},
});
