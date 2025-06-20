// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Defines the `Coin` type - platform wide representation of fungible tokens and
 * coins. `Coin` can be described as a secure wrapper around `Balance` type.
 */

import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
import * as balance from './balance.js';
export function Coin() {
	return bcs.struct('Coin', {
		id: object.UID(),
		balance: balance.Balance(),
	});
}
