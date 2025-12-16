/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as bag from './bag.js';
const $moduleName = '0x2::accumulator_metadata';
export const OwnerKey = new MoveStruct({
	name: `${$moduleName}::OwnerKey`,
	fields: {
		owner: bcs.Address,
	},
});
export const Owner = new MoveStruct({
	name: `${$moduleName}::Owner`,
	fields: {
		balances: bag.Bag,
		owner: bcs.Address,
	},
});
export const MetadataKey = new MoveStruct({
	name: `${$moduleName}::MetadataKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Metadata = new MoveStruct({
	name: `${$moduleName}::Metadata`,
	fields: {
		fields: bag.Bag,
	},
});
