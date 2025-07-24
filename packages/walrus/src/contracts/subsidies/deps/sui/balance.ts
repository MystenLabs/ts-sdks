// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A storable handler for Balances in general. Is used in the `Coin` module to
 * allow balance operations and can be used to implement custom coins with `Supply`
 * and `Balance`s.
 */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
const $moduleName = 'sui::balance';
export const Balance = new MoveStruct(`${$moduleName}::Balance`, {
	value: bcs.u64(),
});
