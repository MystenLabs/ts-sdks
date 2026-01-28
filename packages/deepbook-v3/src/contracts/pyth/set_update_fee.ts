/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::set_update_fee';
export const UpdateFee = new MoveStruct({
	name: `${$moduleName}::UpdateFee`,
	fields: {
		mantissa: bcs.u64(),
		exponent: bcs.u64(),
	},
});
