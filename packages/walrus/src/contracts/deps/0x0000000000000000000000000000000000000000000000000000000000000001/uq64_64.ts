// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

export function UQ64_64() {
	return bcs.struct('UQ64_64', {
		pos0: bcs.u128(),
	});
}
