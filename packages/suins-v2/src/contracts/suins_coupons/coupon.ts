// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as rules from './rules.js';
const $moduleName = '@suins/coupons::coupon';
export const Coupon = new MoveStruct(`${$moduleName}::Coupon`, {
	kind: bcs.u8(),
	amount: bcs.u64(),
	rules: rules.CouponRules,
});
