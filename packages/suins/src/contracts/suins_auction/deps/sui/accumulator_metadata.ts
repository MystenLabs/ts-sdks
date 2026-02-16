/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, MoveTuple } from '../../../utils/index.js';
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
		/** The individual balances owned by the owner. */
		balances: bag.Bag,
		owner: bcs.Address,
	},
});
export const MetadataKey = new MoveTuple({
	name: `${$moduleName}::MetadataKey<phantom T>`,
	fields: [bcs.bool()],
});
export const Metadata = new MoveStruct({
	name: `${$moduleName}::Metadata<phantom T>`,
	fields: {
		/** Any per-balance fields we wish to add in the future. */
		fields: bag.Bag,
	},
});
