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
const _BalanceFields = {
	value: bcs.u64(),
};
export const Balance: MoveStruct<typeof _BalanceFields> = new MoveStruct({
	name: `${$moduleName}::Balance<phantom T>`,
	fields: _BalanceFields,
});
