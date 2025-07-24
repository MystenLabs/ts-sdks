// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Sui object identifiers */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
const $moduleName = 'sui::object';
export const UID = new MoveStruct(`${$moduleName}::UID`, {
	id: bcs.Address,
});
