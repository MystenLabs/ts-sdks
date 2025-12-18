/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
import * as bag from './bag.js';
import * as table from './table.js';
const $moduleName = '0x2::deny_list';
export const DenyList = new MoveStruct({
	name: `${$moduleName}::DenyList`,
	fields: {
		id: object.UID,
		lists: bag.Bag,
	},
});
export const ConfigWriteCap = new MoveStruct({
	name: `${$moduleName}::ConfigWriteCap`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const ConfigKey = new MoveStruct({
	name: `${$moduleName}::ConfigKey`,
	fields: {
		per_type_index: bcs.u64(),
		per_type_key: bcs.vector(bcs.u8()),
	},
});
export const AddressKey = new MoveStruct({
	name: `${$moduleName}::AddressKey`,
	fields: {
		pos0: bcs.Address,
	},
});
export const GlobalPauseKey = new MoveStruct({
	name: `${$moduleName}::GlobalPauseKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const PerTypeConfigCreated = new MoveStruct({
	name: `${$moduleName}::PerTypeConfigCreated`,
	fields: {
		key: ConfigKey,
		config_id: bcs.Address,
	},
});
export const PerTypeList = new MoveStruct({
	name: `${$moduleName}::PerTypeList`,
	fields: {
		id: object.UID,
		denied_count: table.Table,
		denied_addresses: table.Table,
	},
});
