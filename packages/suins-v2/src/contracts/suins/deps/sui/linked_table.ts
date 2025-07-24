// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Similar to `sui::table` but the values are linked together, allowing for ordered
 * insertion and removal
 */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
import * as object from './object.js';
const $moduleName = '0x2::linked_table';
export function LinkedTable<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveStruct(`${$moduleName}::LinkedTable<${typeParameters[0].name as K['name']}>`, {
		/** the ID of this table */
		id: object.UID,
		/** the number of key-value pairs in the table */
		size: bcs.u64(),
		/** the front of the table, i.e. the key of the first entry */
		head: bcs.option(typeParameters[0]),
		/** the back of the table, i.e. the key of the last entry */
		tail: bcs.option(typeParameters[0]),
	});
}
