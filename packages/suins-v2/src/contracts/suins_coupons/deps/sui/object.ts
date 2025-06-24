// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Sui object identifiers */

import { bcs } from '@mysten/sui/bcs';
export function UID() {
	return bcs.struct('UID', {
		id: bcs.Address,
	});
}
