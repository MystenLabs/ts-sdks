// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module: `walrus_context`
 *
 * Implements the `WalrusContext` struct which is used to store the current state
 * of the system. Improves testing and readability of signatures by aggregating the
 * parameters into a single struct. Context is used almost everywhere in the
 * system, so it is important to have a single source of truth for the current
 * state.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::walrus_context';
export const WalrusContext = new MoveStruct(`${$moduleName}::WalrusContext`, {
	/** Current Walrus epoch */
	epoch: bcs.u32(),
	/** Whether the committee has been selected for the next epoch. */
	committee_selected: bcs.bool(),
	/** The current committee in the system. */
	committee: vec_map.VecMap(bcs.Address, bcs.vector(bcs.u16())),
});
