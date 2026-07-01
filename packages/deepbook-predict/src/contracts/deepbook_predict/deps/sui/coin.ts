/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `Coin` type - platform wide representation of fungible tokens and
 * coins. `Coin` can be described as a secure wrapper around `Balance` type.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balance from './balance.js';
const $moduleName = '0x2::coin';
export const TreasuryCap = new MoveStruct({
	name: `${$moduleName}::TreasuryCap<phantom T>`,
	fields: {
		id: bcs.Address,
		total_supply: balance.Supply,
	},
});
