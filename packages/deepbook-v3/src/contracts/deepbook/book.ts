/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The book module contains the `Book` struct which represents the order book. All
 * order book operations are defined in this module.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as big_vector from './big_vector.js';
const $moduleName = '@deepbook/core::book';
export const Book = new MoveStruct({
	name: `${$moduleName}::Book`,
	fields: {
		tick_size: bcs.u64(),
		lot_size: bcs.u64(),
		min_size: bcs.u64(),
		bids: big_vector.BigVector,
		asks: big_vector.BigVector,
		next_bid_order_id: bcs.u64(),
		next_ask_order_id: bcs.u64(),
	},
});
