// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as object from './object.js';

export function ObjectBag() {
	return bcs.struct('ObjectBag', {
		id: object.UID(),
		size: bcs.u64(),
	});
}
