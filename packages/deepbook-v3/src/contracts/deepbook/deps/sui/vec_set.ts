// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
const $moduleName = '0x2::vec_set';
/**
 * A set data structure backed by a vector. The set is guaranteed not to contain
 * duplicate keys. All operations are O(N) in the size of the set
 *
 * - the intention of this data structure is only to provide the convenience of
 *   programming against a set API. Sets that need sorted iteration rather than
 *   insertion order iteration should be handwritten.
 */
export function VecSet<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveStruct({
		name: `${$moduleName}::VecSet<${typeParameters[0].name as K['name']}>`,
		fields: {
			contents: bcs.vector(typeParameters[0]),
		},
	});
}
