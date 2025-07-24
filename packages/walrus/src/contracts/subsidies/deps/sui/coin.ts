// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Defines the `Coin` type - platform wide representation of fungible tokens and
 * coins. `Coin` can be described as a secure wrapper around `Balance` type.
 */

import { MoveStruct } from '../../../utils/index.js';
import * as object from './object.js';
import * as balance from './balance.js';
const $moduleName = '0x2::coin';
export const Coin = new MoveStruct(`${$moduleName}::Coin`, {
	id: object.UID,
	balance: balance.Balance,
});
