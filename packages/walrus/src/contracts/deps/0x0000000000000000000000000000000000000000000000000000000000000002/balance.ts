// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

export function Supply() {
	return bcs.struct('Supply', {
		value: bcs.u64(),
	});
}
export function Balance() {
	return bcs.struct('Balance', {
		value: bcs.u64(),
	});
}
