// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
export function PendingValues() {
	return bcs.tuple([vec_map.VecMap(bcs.u32(), bcs.u64())], { name: 'PendingValues' });
}
