// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
export function Range() {
	return bcs.tuple([bcs.u64(), bcs.u64()], { name: 'Range' });
}
