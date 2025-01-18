// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

export function Receiving() {
	return bcs.struct('Receiving', {
		id: bcs.Address,
		version: bcs.u64(),
	});
}
