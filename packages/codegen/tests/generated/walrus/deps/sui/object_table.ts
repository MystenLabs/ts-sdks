/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Similar to `sui::table`, an `ObjectTable<K, V>` is a map-like collection. But
 * unlike `sui::table`, the values bound to these dynamic fields _must_ be objects
 * themselves. This allows for the objects to still exist within in storage, which
 * may be important for external tools. The difference is otherwise not observable
 * from within Move.
 */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
import * as object from './object.js';
const $moduleName = 'sui::object_table';
export const ObjectTable = new MoveStruct(`${$moduleName}::ObjectTable`, {
	/** the ID of this table */
	id: object.UID,
	/** the number of key-value pairs in the table */
	size: bcs.u64(),
});
