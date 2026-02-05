/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * BigVector is an arbitrary sized vector-like data structure, implemented using an
 * on-chain B+ Tree to support almost constant time (log base max_fan_out) random
 * access, insertion and removal.
 *
 * Iteration is supported by exposing access to leaf nodes (slices). Finding the
 * initial slice can be done in almost constant time, and subsequently finding the
 * previous or next slice can also be done in constant time.
 *
 * Nodes in the B+ Tree are stored as individual dynamic fields hanging off the
 * `BigVector`.
 *
 * Note: The index type is `u128`, but the length is stored as `u64` because the
 * expectation is that indices are sparsely distributed.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
const $moduleName = '@deepbook/core::big_vector';
export const BigVector = new MoveStruct({
	name: `${$moduleName}::BigVector<phantom E>`,
	fields: {
		id: bcs.Address,
		/** How deep the tree structure is. */
		depth: bcs.u8(),
		/**
		 * Total number of elements that this vector contains, not including gaps in the
		 * vector.
		 */
		length: bcs.u64(),
		/** Max size of leaf nodes (counted in number of elements, `E`). */
		max_slice_size: bcs.u64(),
		/** Max size of interior nodes (counted in number of children). */
		max_fan_out: bcs.u64(),
		/** ID of the tree's root structure. Value of `NO_SLICE` means there's no root. */
		root_id: bcs.u64(),
		/** The last node ID that was allocated. */
		last_id: bcs.u64(),
	},
});
/**
 * A node in the B+ tree.
 *
 * If representing a leaf node, there are as many keys as values (such that
 * `keys[i]` is the key corresponding to `vals[i]`).
 *
 * A `Slice<u64>` can also represent an interior node, in which case `vals` contain
 * the IDs of its children and `keys` represent the partitions between children.
 * There will be one fewer key than value in this configuration.
 */
export function Slice<E extends BcsType<any>>(...typeParameters: [E]) {
	return new MoveStruct({
		name: `${$moduleName}::Slice<${typeParameters[0].name as E['name']}>`,
		fields: {
			/** Previous node in the intrusive doubly-linked list data structure. */
			prev: bcs.u64(),
			/** Next node in the intrusive doubly-linked list data structure. */
			next: bcs.u64(),
			keys: bcs.vector(bcs.u128()),
			vals: bcs.vector(typeParameters[0]),
		},
	});
}
export const SliceRef = new MoveStruct({
	name: `${$moduleName}::SliceRef`,
	fields: {
		ix: bcs.u64(),
	},
});
