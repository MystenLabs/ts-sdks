// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Functions for operating on Move packages from within Move:
 *
 * - Creating proof-of-publish objects from one-time witnesses
 * - Administering package upgrades through upgrade policies.
 */

import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
export function Publisher() {
	return bcs.struct('Publisher', {
		id: object.UID(),
		package: bcs.string(),
		module_name: bcs.string(),
	});
}
export function UpgradeCap() {
	return bcs.struct('UpgradeCap', {
		id: object.UID(),
		/** (Mutable) ID of the package that can be upgraded. */
		package: bcs.Address,
		/**
		 * (Mutable) The number of upgrades that have been applied successively to the
		 * original package. Initially 0.
		 */
		version: bcs.u64(),
		/** What kind of upgrades are allowed. */
		policy: bcs.u8(),
	});
}
