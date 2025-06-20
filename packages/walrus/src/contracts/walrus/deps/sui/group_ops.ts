// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Generic Move and native functions for group operations. */

import { bcs } from '@mysten/sui/bcs';
export function Element() {
	return bcs.struct('Element', {
		bytes: bcs.vector(bcs.u8()),
	});
}
