// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

import * as object from './object.js';

export function Clock() {
	return bcs.struct('Clock', {
		id: object.UID(),
		timestamp_ms: bcs.u64(),
	});
}
