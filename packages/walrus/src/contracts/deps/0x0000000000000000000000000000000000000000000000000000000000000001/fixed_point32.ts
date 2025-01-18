// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

export function FixedPoint32() {
	return bcs.struct('FixedPoint32', {
		value: bcs.u64(),
	});
}
