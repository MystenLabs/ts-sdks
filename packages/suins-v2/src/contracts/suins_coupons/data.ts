// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import * as bag from './deps/sui/bag.js';
export function Data() {
	return bcs.struct('Data', {
		coupons: bag.Bag(),
	});
}
