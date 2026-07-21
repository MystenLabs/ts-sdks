/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Margin state manages the total supply and borrow of the margin pool. Whenever
 * supply and borrow increases or decreases, the interest and protocol fees are
 * updated. Shares represent the constant amount and are used to calculate amounts
 * after interest and protocol fees are applied.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@deepbook/margin::margin_state';
export const State = new MoveStruct({
	name: `${$moduleName}::State`,
	fields: {
		total_supply: bcs.u64(),
		total_borrow: bcs.u64(),
		supply_shares: bcs.u64(),
		borrow_shares: bcs.u64(),
		last_update_timestamp: bcs.u64(),
		extra_fields: vec_map.VecMap(bcs.string(), bcs.u64()),
	},
});
