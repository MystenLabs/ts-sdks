// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import * as kiosk from '../contracts/0x2/kiosk.js';

/**
 * Calls the `kiosk::new()` function and shares the kiosk.
 * Returns the `kioskOwnerCap` object.
 */
export function createKioskAndShare(tx: Transaction): TransactionObjectArgument {
	const [kioskObj, kioskOwnerCap] = tx.add(kiosk._new({}));
	tx.moveCall({
		target: '0x2::transfer::public_share_object',
		arguments: [kioskObj],
		typeArguments: ['0x2::kiosk::Kiosk'],
	});
	return kioskOwnerCap;
}
