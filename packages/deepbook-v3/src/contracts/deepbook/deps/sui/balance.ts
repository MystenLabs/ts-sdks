/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * A storable handler for Balances in general. Is used in the `Coin` module to
 * allow balance operations and can be used to implement custom coins with `Supply`
 * and `Balance`s.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::balance';
export const Balance: MoveStruct<{
    "value": ReturnType<typeof bcs.u64>;
}> = new MoveStruct({ name: `${$moduleName}::Balance<phantom T>`, fields: {
        value: bcs.u64()
    } });