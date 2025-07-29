// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::pending_values';
export const PendingValues = new MoveTuple({
	name: `${$moduleName}::PendingValues`,
	fields: [vec_map.VecMap(bcs.u32(), bcs.u64())],
});
