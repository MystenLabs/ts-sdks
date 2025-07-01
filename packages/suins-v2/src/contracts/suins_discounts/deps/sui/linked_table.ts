// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Similar to `sui::table` but the values are linked together, allowing for ordered
 * insertion and removal
 */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import * as object from './object.js';
export function LinkedTable<K extends BcsType<any>>(...typeParameters: [K]) {
	return bcs.struct('LinkedTable', {
		/** the ID of this table */
		id: object.UID(),
		/** the number of key-value pairs in the table */
		size: bcs.u64(),
		/** the front of the table, i.e. the key of the first entry */
		head: bcs.option(typeParameters[0]),
		/** the back of the table, i.e. the key of the last entry */
		tail: bcs.option(typeParameters[0]),
	});
}
