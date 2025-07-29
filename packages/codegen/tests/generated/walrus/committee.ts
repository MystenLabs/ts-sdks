/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * This module defines the `Committee` struct which stores the current committee
 * with shard assignments. Additionally, it manages transitions / transfers of
 * shards between committees with the least amount of changes.
 */

import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::committee';
export const Committee = new MoveTuple({
	name: `${$moduleName}::Committee`,
	fields: [vec_map.VecMap(bcs.Address, bcs.vector(bcs.u16()))],
});
