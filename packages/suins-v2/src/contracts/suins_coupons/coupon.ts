// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import * as rules from './rules.js';
export function Coupon() {
	return bcs.struct('Coupon', {
		kind: bcs.u8(),
		amount: bcs.u64(),
		rules: rules.CouponRules(),
	});
}
