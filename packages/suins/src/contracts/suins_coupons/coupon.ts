/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as rules from './rules.js';
const $moduleName = '@suins/coupons::coupon';
export const Coupon: MoveStruct<{
    "kind": ReturnType<typeof bcs.u8>;
    "amount": ReturnType<typeof bcs.u64>;
    "rules": typeof rules.CouponRules;
}> = new MoveStruct({ name: `${$moduleName}::Coupon`, fields: {
        kind: bcs.u8(),
        amount: bcs.u64(),
        rules: rules.CouponRules
    } });