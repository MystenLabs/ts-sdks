// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

export function UQ32_32() {
	return bcs.struct('UQ32_32', {
		pos0: bcs.u64(),
	});
}
