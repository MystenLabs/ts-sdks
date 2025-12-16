/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as rules from './rules.js';
const $moduleName = '@suins/coupons::coupon';
export const Coupon = new MoveStruct({
	name: `${$moduleName}::Coupon`,
	fields: {
		kind: bcs.u8(),
		amount: bcs.u64(),
		rules: rules.CouponRules,
	},
});
