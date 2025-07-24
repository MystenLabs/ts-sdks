// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Contains an active set of storage nodes. The active set is a smart collection
 * that only stores up to 1000 nodes. The active set tracks the total amount of
 * staked WAL to make the calculation of the rewards and voting power distribution
 * easier.
 */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../utils/index.js';
const $moduleName = '@local-pkg/walrus::active_set';
export const ActiveSetEntry = new MoveStruct(`${$moduleName}::ActiveSetEntry`, {
	node_id: bcs.Address,
	staked_amount: bcs.u64(),
});
export const ActiveSet = new MoveStruct(`${$moduleName}::ActiveSet`, {
	/**
	 * The maximum number of storage nodes in the active set. Potentially remove this
	 * field.
	 */
	max_size: bcs.u16(),
	/**
	 * The minimum amount of staked WAL needed to enter the active set. This is used to
	 * determine if a storage node can be added to the active set.
	 */
	threshold_stake: bcs.u64(),
	/** The list of storage nodes in the active set and their stake. */
	nodes: bcs.vector(ActiveSetEntry),
	/** The total amount of staked WAL in the active set. */
	total_stake: bcs.u64(),
});
