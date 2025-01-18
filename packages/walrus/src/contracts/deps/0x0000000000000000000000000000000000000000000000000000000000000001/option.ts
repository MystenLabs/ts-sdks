// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';

export function Option<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return bcs.struct('Option', {
		vec: bcs.vector(typeParameters[0]),
	});
}
