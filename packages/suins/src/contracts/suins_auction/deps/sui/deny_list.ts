/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `DenyList` type. The `DenyList` shared object is used to restrict
 * access to instances of certain core types from being used as inputs by specified
 * addresses in the deny list.
 */

import { MoveStruct, MoveTuple } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as bag from './bag.js';
import * as table from './table.js';
const $moduleName = '0x2::deny_list';
export const DenyList = new MoveStruct({
	name: `${$moduleName}::DenyList`,
	fields: {
		id: bcs.Address,
		/** The individual deny lists. */
		lists: bag.Bag,
	},
});
export const ConfigWriteCap = new MoveTuple({
	name: `${$moduleName}::ConfigWriteCap`,
	fields: [bcs.bool()],
});
export const ConfigKey = new MoveStruct({
	name: `${$moduleName}::ConfigKey`,
	fields: {
		per_type_index: bcs.u64(),
		per_type_key: bcs.vector(bcs.u8()),
	},
});
export const AddressKey = new MoveTuple({
	name: `${$moduleName}::AddressKey`,
	fields: [bcs.Address],
});
export const GlobalPauseKey = new MoveTuple({
	name: `${$moduleName}::GlobalPauseKey`,
	fields: [bcs.bool()],
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
		id: bcs.Address,
		/**
		 * Number of object types that have been banned for a given address. Used to
		 * quickly skip checks for most addresses.
		 */
		denied_count: table.Table,
		/**
		 * Set of addresses that are banned for a given type. For example with
		 * `sui::coin::Coin`: If addresses A and B are banned from using
		 * "0...0123::my_coin::MY_COIN", this will be "0...0123::my_coin::MY_COIN" -> {A,
		 * B}.
		 */
		denied_addresses: table.Table,
	},
});
