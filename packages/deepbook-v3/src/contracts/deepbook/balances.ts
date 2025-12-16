/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * `Balances` represents the three assets make up a pool: base, quote, and deep.
 * Whenever funds are moved, they are moved in the form of `Balances`.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@deepbook/core::balances';
export const Balances = new MoveStruct({
	name: `${$moduleName}::Balances`,
	fields: {
		base: bcs.u64(),
		quote: bcs.u64(),
		deep: bcs.u64(),
	},
});
