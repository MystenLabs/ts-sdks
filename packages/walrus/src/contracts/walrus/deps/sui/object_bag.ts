/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Similar to `sui::bag`, an `ObjectBag` is a heterogeneous map-like collection.
 * But unlike `sui::bag`, the values bound to these dynamic fields _must_ be
 * objects themselves. This allows for the objects to still exist in storage, which
 * may be important for external tools. The difference is otherwise not observable
 * from within Move.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::object_bag';
const _ObjectBagFields = {
	/** the ID of this bag */
	id: bcs.Address,
	/** the number of key-value pairs in the bag */
	size: bcs.u64(),
};
export const ObjectBag: MoveStruct<typeof _ObjectBagFields> = new MoveStruct({
	name: `${$moduleName}::ObjectBag`,
	fields: _ObjectBagFields,
});
