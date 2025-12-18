/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Similar to `sui::table` but the values are linked together, allowing for ordered
 * insertion and removal
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
const $moduleName = '0x2::linked_table';
export function LinkedTable<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveStruct({
		name: `${$moduleName}::LinkedTable<${typeParameters[0].name as K['name']}>`,
		fields: {
			/** the ID of this table */
			id: bcs.Address,
			/** the number of key-value pairs in the table */
			size: bcs.u64(),
			/** the front of the table, i.e. the key of the first entry */
			head: bcs.option(typeParameters[0]),
			/** the back of the table, i.e. the key of the last entry */
			tail: bcs.option(typeParameters[0]),
		},
	});
}
