/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::accumulator';
export const AccumulatorRoot = new MoveStruct({
	name: `${$moduleName}::AccumulatorRoot`,
	fields: {
		id: bcs.Address,
	},
});
export const U128 = new MoveStruct({
	name: `${$moduleName}::U128`,
	fields: {
		value: bcs.u128(),
	},
});
export const Key = new MoveStruct({
	name: `${$moduleName}::Key`,
	fields: {
		address: bcs.Address,
	},
});
